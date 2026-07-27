import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { DeploymentEnvironmentService } from "../deployment/DeploymentEnvironmentService";
import type { DeploymentReleaseApprovalService } from "./DeploymentReleaseApprovalService";
import type {
  CreateDeploymentReleaseExecutionInput,
  DeploymentReleaseExecution,
  DeploymentReleaseExecutionSummary,
} from "./DeploymentReleaseExecutionTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "deployment-release-executions.json",
);

export class DeploymentReleaseExecutionService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly approvals: DeploymentReleaseApprovalService,
    private readonly environments: DeploymentEnvironmentService,
  ) {}

  async list(limit = 100): Promise<DeploymentReleaseExecution[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_executions")
      .select("*")
      .order("executed_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(
    input: CreateDeploymentReleaseExecutionInput,
  ): Promise<{
    execution: DeploymentReleaseExecution;
    environment: Awaited<
      ReturnType<DeploymentEnvironmentService["updateEnvironment"]>
    >;
    deployment: Awaited<
      ReturnType<DeploymentEnvironmentService["listDeployments"]>
    >[number];
  }> {
    const approval = (await this.approvals.list(500)).find(
      (item) => item.id === input.approvalId,
    );

    if (!approval) {
      throw new Error("Aprovação de release não encontrada.");
    }

    if (approval.status !== "approved") {
      throw new Error(
        "Somente releases aprovadas podem ser registradas como deploy.",
      );
    }

    const environment =
      await this.environments.getEnvironment(input.environmentId);

    if (environment.kind !== approval.target) {
      throw new Error(
        "O ambiente selecionado não corresponde ao destino aprovado.",
      );
    }

    const existing = (await this.list(500)).find(
      (item) =>
        item.approvalId === approval.id &&
        item.status === "success",
    );

    if (existing) {
      throw new Error(
        "Esta aprovação já possui uma execução concluída com sucesso.",
      );
    }

    const responsible = input.responsible.trim();
    if (!responsible) {
      throw new Error("Responsável pela execução é obrigatório.");
    }

    const result = await this.environments.recordDeployment(
      environment.id,
      {
        version: approval.version,
        status: input.status,
        responsible: input.responsible,
        notes: input.notes,
      },
    );

    const execution: DeploymentReleaseExecution = {
      id: crypto.randomUUID(),
      approvalId: approval.id,
      validationRunId: approval.validationRunId,
      environmentId: result.environment.id,
      organizationId: result.environment.organizationId,
      target: approval.target,
      version: approval.version,
      status: input.status,
      responsible,
      notes: input.notes?.trim() || undefined,
      deploymentRecordId: result.deployment.id,
      executedAt: result.deployment.deployedAt,
    };

    if (this.mode === "json") {
      const executions = this.readJson();
      executions.unshift(execution);
      this.writeJson(executions.slice(0, 2_000));
    } else {
      const { error } = await this.supabaseAdapter
        .getClient()
        .from("deployment_release_executions")
        .insert(this.toRow(execution));

      if (error) throw error;
    }

    return {
      execution,
      environment: result.environment,
      deployment: result.deployment,
    };
  }

  buildSummary(
    executions: DeploymentReleaseExecution[],
  ): DeploymentReleaseExecutionSummary {
    const successful = executions.filter(
      (item) => item.status === "success",
    ).length;
    const failed = executions.filter(
      (item) => item.status === "failed",
    ).length;
    const rolledBack = executions.filter(
      (item) => item.status === "rolled_back",
    ).length;
    const productionExecuted = executions.some(
      (item) =>
        item.target === "production" &&
        item.status === "success",
    );
    const stagingExecuted = executions.some(
      (item) =>
        item.target === "staging" &&
        item.status === "success",
    );

    return {
      total: executions.length,
      successful,
      failed,
      rolledBack,
      productionExecuted,
      stagingExecuted,
      latest: executions[0],
      readinessScore:
        executions.length === 0
          ? 25
          : Math.max(
              0,
              Math.min(
                100,
                (productionExecuted
                  ? 100
                  : stagingExecuted
                    ? 75
                    : 45) -
                  failed * 8 -
                  rolledBack * 4,
              ),
            ),
    };
  }

  private readJson(): DeploymentReleaseExecution[] {
    if (!fs.existsSync(JSON_PATH)) return [];

    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_PATH, "utf-8"),
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(
    executions: DeploymentReleaseExecution[],
  ): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(executions, null, 2),
      "utf-8",
    );
  }

  private toRow(execution: DeploymentReleaseExecution) {
    return {
      id: execution.id,
      approval_id: execution.approvalId,
      validation_run_id: execution.validationRunId,
      environment_id: execution.environmentId,
      organization_id: execution.organizationId,
      target: execution.target,
      version: execution.version,
      status: execution.status,
      responsible: execution.responsible,
      notes: execution.notes || null,
      deployment_record_id: execution.deploymentRecordId,
      executed_at: execution.executedAt,
    };
  }

  private fromRow(row: any): DeploymentReleaseExecution {
    return {
      id: row.id,
      approvalId: row.approval_id,
      validationRunId: row.validation_run_id,
      environmentId: row.environment_id,
      organizationId: row.organization_id,
      target: row.target,
      version: row.version,
      status: row.status,
      responsible: row.responsible,
      notes: row.notes || undefined,
      deploymentRecordId: row.deployment_record_id,
      executedAt: row.executed_at,
    };
  }
}
