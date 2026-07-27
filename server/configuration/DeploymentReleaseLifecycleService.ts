import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { DeploymentEnvironmentService } from "../deployment/DeploymentEnvironmentService";
import type { DeploymentReleaseExecutionService } from "./DeploymentReleaseExecutionService";
import type {
  DeploymentCutoverItem,
  DeploymentEvidenceType,
  DeploymentReleaseLifecycle,
  DeploymentReleaseLifecycleSummary,
} from "./DeploymentReleaseLifecycleTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "deployment-release-lifecycles.json",
);

const nowIso = () => new Date().toISOString();

const DEFAULT_CHECKLIST = [
  "Backup e ponto de restauração confirmados",
  "Migrations revisadas e ordem de aplicação validada",
  "Comunicação da janela de publicação concluída",
  "Plano de monitoramento pós-deploy definido",
  "Plano de rollback confirmado",
];

export class DeploymentReleaseLifecycleService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly executions: DeploymentReleaseExecutionService,
    private readonly environments: DeploymentEnvironmentService,
  ) {}

  async list(limit = 100): Promise<DeploymentReleaseLifecycle[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    if (this.mode === "json") {
      return this.readJson()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_lifecycles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async initialize(
    executionId: string,
    responsible: string,
  ): Promise<DeploymentReleaseLifecycle> {
    const execution = (await this.executions.list(500)).find(
      (item) => item.id === executionId,
    );
    if (!execution) throw new Error("Execução de release não encontrada.");
    if (!responsible.trim()) throw new Error("Responsável é obrigatório.");

    const existing = (await this.list(500)).find(
      (item) => item.executionId === executionId,
    );
    if (existing) return existing;

    const timestamp = nowIso();
    const checklist: DeploymentCutoverItem[] = DEFAULT_CHECKLIST.map(
      (label) => ({
        id: crypto.randomUUID(),
        label,
        required: true,
        completed: false,
      }),
    );

    const lifecycle: DeploymentReleaseLifecycle = {
      id: crypto.randomUUID(),
      executionId: execution.id,
      approvalId: execution.approvalId,
      validationRunId: execution.validationRunId,
      environmentId: execution.environmentId,
      organizationId: execution.organizationId,
      target: execution.target,
      version: execution.version,
      status: execution.status === "success" ? "deployed" : "preparing",
      responsible: responsible.trim(),
      checklist,
      evidences: [],
      postDeployChecks: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.save(lifecycle);
    return lifecycle;
  }

  async updateChecklist(
    lifecycleId: string,
    itemId: string,
    completed: boolean,
    responsible: string,
    notes?: string,
  ): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = await this.get(lifecycleId);
    const item = lifecycle.checklist.find((entry) => entry.id === itemId);
    if (!item) throw new Error("Item do cutover não encontrado.");
    if (!responsible.trim()) throw new Error("Responsável é obrigatório.");

    item.completed = completed;
    item.completedBy = completed ? responsible.trim() : undefined;
    item.completedAt = completed ? nowIso() : undefined;
    item.notes = notes?.trim() || undefined;
    lifecycle.updatedAt = nowIso();
    await this.save(lifecycle);
    return lifecycle;
  }

  async addEvidence(
    lifecycleId: string,
    input: {
      type: DeploymentEvidenceType;
      label: string;
      reference: string;
      recordedBy: string;
    },
  ): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = await this.get(lifecycleId);
    if (!input.label.trim() || !input.reference.trim() || !input.recordedBy.trim()) {
      throw new Error("Rótulo, referência e responsável são obrigatórios.");
    }
    lifecycle.evidences.unshift({
      id: crypto.randomUUID(),
      type: input.type,
      label: input.label.trim(),
      reference: input.reference.trim(),
      recordedBy: input.recordedBy.trim(),
      recordedAt: nowIso(),
    });
    lifecycle.updatedAt = nowIso();
    await this.save(lifecycle);
    return lifecycle;
  }

  async verifyPostDeploy(
    lifecycleId: string,
  ): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = await this.get(lifecycleId);
    const environment = await this.environments.getEnvironment(
      lifecycle.environmentId,
    );
    const checkedAt = nowIso();
    lifecycle.postDeployChecks = [
      {
        id: crypto.randomUUID(),
        label: "Versão ativa",
        status:
          environment.version === lifecycle.version ? "healthy" : "critical",
        detail: `Esperada ${lifecycle.version}; ativa ${environment.version}.`,
        checkedAt,
      },
      {
        id: crypto.randomUUID(),
        label: "Saúde da API",
        status: environment.apiStatus === "ready" ? "healthy" : "critical",
        detail: `API em estado ${environment.apiStatus}.`,
        checkedAt,
      },
      {
        id: crypto.randomUUID(),
        label: "Saúde do banco",
        status:
          environment.databaseStatus === "ready" ? "healthy" : "critical",
        detail: `Banco em estado ${environment.databaseStatus}.`,
        checkedAt,
      },
      {
        id: crypto.randomUUID(),
        label: "Saúde do armazenamento",
        status:
          environment.storageStatus === "ready" ? "healthy" : "attention",
        detail: `Storage em estado ${environment.storageStatus}.`,
        checkedAt,
      },
      {
        id: crypto.randomUUID(),
        label: "URL pública",
        status: environment.url.trim() ? "healthy" : "critical",
        detail: environment.url.trim() || "URL não configurada.",
        checkedAt,
      },
    ];

    const critical = lifecycle.postDeployChecks.some(
      (check) => check.status === "critical",
    );
    lifecycle.status = critical ? "rollback_required" : "verified";
    lifecycle.updatedAt = checkedAt;
    await this.save(lifecycle);
    return lifecycle;
  }

  async rollback(
    lifecycleId: string,
    reason: string,
    responsible: string,
  ): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = await this.get(lifecycleId);
    if (!reason.trim() || !responsible.trim()) {
      throw new Error("Motivo e responsável são obrigatórios.");
    }
    const deployments = await this.environments.listDeployments(
      lifecycle.environmentId,
      100,
    );
    const previous = deployments.find(
      (deployment) =>
        deployment.status === "success" &&
        deployment.version !== lifecycle.version,
    );
    if (!previous) {
      throw new Error("Não existe versão anterior elegível para rollback.");
    }

    const result = await this.environments.recordDeployment(
      lifecycle.environmentId,
      {
        version: previous.version,
        status: "rolled_back",
        responsible: responsible.trim(),
        notes: reason.trim(),
      },
    );

    lifecycle.rollback = {
      id: crypto.randomUUID(),
      reason: reason.trim(),
      responsible: responsible.trim(),
      sourceVersion: lifecycle.version,
      targetVersion: previous.version,
      deploymentRecordId: result.deployment.id,
      executedAt: result.deployment.deployedAt,
    };
    lifecycle.status = "rolled_back";
    lifecycle.updatedAt = nowIso();
    await this.save(lifecycle);
    return lifecycle;
  }

  async complete(
    lifecycleId: string,
  ): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = await this.get(lifecycleId);
    const requiredChecklistComplete = lifecycle.checklist
      .filter((item) => item.required)
      .every((item) => item.completed);
    const requiredEvidence = ["lint", "build", "gate", "approval", "deploy"];
    const evidenceComplete = requiredEvidence.every((type) =>
      lifecycle.evidences.some((evidence) => evidence.type === type),
    );
    const checksHealthy =
      lifecycle.postDeployChecks.length > 0 &&
      lifecycle.postDeployChecks.every((check) => check.status !== "critical");

    if (!requiredChecklistComplete || !evidenceComplete || !checksHealthy) {
      throw new Error(
        "Checklist, evidências obrigatórias e verificação pós-deploy devem estar concluídos.",
      );
    }
    if (lifecycle.rollback) {
      throw new Error("Uma release com rollback não pode ser encerrada como concluída.");
    }

    lifecycle.status = "completed";
    lifecycle.completedAt = nowIso();
    lifecycle.updatedAt = lifecycle.completedAt;
    await this.save(lifecycle);
    return lifecycle;
  }

  buildSummary(
    lifecycles: DeploymentReleaseLifecycle[],
  ): DeploymentReleaseLifecycleSummary {
    const allChecklist = lifecycles.flatMap((item) => item.checklist);
    const checklistCompletion = allChecklist.length === 0
      ? 0
      : Math.round(
          (allChecklist.filter((item) => item.completed).length /
            allChecklist.length) *
            100,
        );
    const evidenceCompletion = lifecycles.length === 0
      ? 0
      : Math.round(
          (lifecycles.reduce(
            (total, item) => total + Math.min(item.evidences.length, 5),
            0,
          ) /
            (lifecycles.length * 5)) *
            100,
        );
    const completed = lifecycles.filter((item) => item.status === "completed").length;
    const rollbackRequired = lifecycles.filter(
      (item) => item.status === "rollback_required",
    ).length;
    const rolledBack = lifecycles.filter(
      (item) => item.status === "rolled_back",
    ).length;
    const productionCompleted = lifecycles.some(
      (item) => item.target === "production" && item.status === "completed",
    );

    return {
      total: lifecycles.length,
      preparing: lifecycles.filter((item) =>
        ["preparing", "deployed"].includes(item.status),
      ).length,
      verified: lifecycles.filter((item) => item.status === "verified").length,
      completed,
      rollbackRequired,
      rolledBack,
      checklistCompletion,
      evidenceCompletion,
      latest: lifecycles[0],
      productionCompleted,
      readinessScore: lifecycles.length === 0
        ? 20
        : Math.max(
            0,
            Math.min(
              100,
              (productionCompleted ? 100 : completed > 0 ? 80 : 55) -
                rollbackRequired * 15 -
                rolledBack * 5,
            ),
          ),
    };
  }

  private async get(id: string): Promise<DeploymentReleaseLifecycle> {
    const lifecycle = (await this.list(500)).find((item) => item.id === id);
    if (!lifecycle) throw new Error("Ciclo de release não encontrado.");
    return lifecycle;
  }

  private async save(lifecycle: DeploymentReleaseLifecycle): Promise<void> {
    if (this.mode === "json") {
      const items = this.readJson();
      const index = items.findIndex((item) => item.id === lifecycle.id);
      if (index >= 0) items[index] = lifecycle;
      else items.unshift(lifecycle);
      this.writeJson(items.slice(0, 2000));
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_lifecycles")
      .upsert(this.toRow(lifecycle), { onConflict: "id" });
    if (error) throw error;
  }

  private readJson(): DeploymentReleaseLifecycle[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(items: DeploymentReleaseLifecycle[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), "utf-8");
  }

  private toRow(item: DeploymentReleaseLifecycle) {
    return {
      id: item.id,
      execution_id: item.executionId,
      approval_id: item.approvalId,
      validation_run_id: item.validationRunId,
      environment_id: item.environmentId,
      organization_id: item.organizationId,
      target: item.target,
      version: item.version,
      status: item.status,
      responsible: item.responsible,
      checklist_json: item.checklist,
      evidences_json: item.evidences,
      post_deploy_checks_json: item.postDeployChecks,
      rollback_json: item.rollback || null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      completed_at: item.completedAt || null,
    };
  }

  private fromRow(row: any): DeploymentReleaseLifecycle {
    return {
      id: row.id,
      executionId: row.execution_id,
      approvalId: row.approval_id,
      validationRunId: row.validation_run_id,
      environmentId: row.environment_id,
      organizationId: row.organization_id,
      target: row.target,
      version: row.version,
      status: row.status,
      responsible: row.responsible,
      checklist: row.checklist_json || [],
      evidences: row.evidences_json || [],
      postDeployChecks: row.post_deploy_checks_json || [],
      rollback: row.rollback_json || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
