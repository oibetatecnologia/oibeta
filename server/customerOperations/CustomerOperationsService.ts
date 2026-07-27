import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { DatabaseAdapter } from "../database/DatabaseAdapter";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CustomerOperationsPlan,
  CustomerOperationsSummary,
  UpsertCustomerOperationsPlanInput,
} from "./CustomerOperationsTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "customer-operations-plans.json",
);

const DEFAULT_CHECKLIST = [
  "Kickoff realizado",
  "Responsáveis definidos",
  "Produtos e acessos configurados",
  "Integrações validadas",
  "Treinamento concluído",
  "Homologação aprovada",
  "Entrada em produção confirmada",
];

export class CustomerOperationsService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly databaseAdapter: DatabaseAdapter,
  ) {}

  async list(
    organizationId: string,
    workspaceId: string,
  ): Promise<CustomerOperationsPlan[]> {
    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (item) =>
            item.organizationId === organizationId &&
            item.workspaceId === workspaceId,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("customer_operations_plans")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async upsert(
    organizationId: string,
    workspaceId: string,
    input: UpsertCustomerOperationsPlanInput,
  ): Promise<CustomerOperationsPlan> {
    const clients = await this.databaseAdapter.getCrmGovClients(
      organizationId,
      workspaceId,
    );
    const client = clients.find((item: any) => item.id === input.clientId);

    if (!client) {
      throw new Error("Cliente não encontrado no CRM da organização atual.");
    }

    const owner = input.owner.trim();
    if (!owner) throw new Error("Responsável pelo cliente é obrigatório.");

    const timestamp = new Date().toISOString();
    const current = (await this.list(organizationId, workspaceId)).find(
      (item) => item.clientId === input.clientId,
    );

    const plan: CustomerOperationsPlan = {
      id: current?.id || crypto.randomUUID(),
      organizationId,
      workspaceId,
      clientId: input.clientId,
      clientName: String(client.name || client.entity || "Cliente"),
      lifecycleStage: input.lifecycleStage,
      owner,
      healthStatus: input.healthStatus,
      healthScore: Math.max(0, Math.min(100, Number(input.healthScore || 0))),
      onboardingChecklist:
        input.onboardingChecklist?.length > 0
          ? input.onboardingChecklist
          : DEFAULT_CHECKLIST.map((label) => ({
              id: crypto.randomUUID(),
              label,
              completed: false,
            })),
      objectives: Array.isArray(input.objectives) ? input.objectives : [],
      risks: Array.isArray(input.risks) ? input.risks : [],
      supportSlaHours: Math.max(1, Math.min(720, Number(input.supportSlaHours || 24))),
      nextReviewAt: input.nextReviewAt || undefined,
      renewalAt: input.renewalAt || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: current?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    if (this.mode === "json") {
      const values = this.readJson();
      const index = values.findIndex((item) => item.id === plan.id);
      if (index >= 0) values[index] = plan;
      else values.unshift(plan);
      this.writeJson(values.slice(0, 5_000));
      return plan;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("customer_operations_plans")
      .upsert(this.toRow(plan), {
        onConflict: "organization_id,workspace_id,client_id",
      })
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async buildSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<CustomerOperationsSummary> {
    const [clients, plans] = await Promise.all([
      this.databaseAdapter.getCrmGovClients(organizationId, workspaceId),
      this.list(organizationId, workspaceId),
    ]);
    const now = Date.now();
    const checklist = plans.flatMap((item) => item.onboardingChecklist);
    const completed = checklist.filter((item) => item.completed).length;
    const openRisks = plans.reduce(
      (total, item) =>
        total + item.risks.filter((risk) => risk.status === "open").length,
      0,
    );
    const overdueReviews = plans.filter(
      (item) =>
        item.nextReviewAt && new Date(item.nextReviewAt).getTime() < now,
    ).length;
    const healthy = plans.filter((item) => item.healthStatus === "healthy").length;
    const attention = plans.filter((item) => item.healthStatus === "attention").length;
    const critical = plans.filter((item) => item.healthStatus === "critical").length;
    const coverage = clients.length === 0 ? 100 : Math.round((plans.length / clients.length) * 100);
    const onboardingProgress = checklist.length === 0 ? 0 : Math.round((completed / checklist.length) * 100);

    return {
      totalClients: clients.length,
      managedClients: plans.length,
      onboardingClients: plans.filter((item) => item.lifecycleStage === "onboarding").length,
      healthyClients: healthy,
      attentionClients: attention,
      criticalClients: critical,
      overdueReviews,
      openRisks,
      onboardingProgress,
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          Math.round(coverage * 0.55 + onboardingProgress * 0.25 + (100 - critical * 20 - overdueReviews * 8 - openRisks * 3) * 0.2),
        ),
      ),
    };
  }

  private readJson(): CustomerOperationsPlan[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(values: CustomerOperationsPlan[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(values, null, 2), "utf-8");
  }

  private toRow(plan: CustomerOperationsPlan) {
    return {
      id: plan.id,
      organization_id: plan.organizationId,
      workspace_id: plan.workspaceId,
      client_id: plan.clientId,
      client_name: plan.clientName,
      lifecycle_stage: plan.lifecycleStage,
      owner: plan.owner,
      health_status: plan.healthStatus,
      health_score: plan.healthScore,
      onboarding_checklist_json: plan.onboardingChecklist,
      objectives_json: plan.objectives,
      risks_json: plan.risks,
      support_sla_hours: plan.supportSlaHours,
      next_review_at: plan.nextReviewAt || null,
      renewal_at: plan.renewalAt || null,
      notes: plan.notes || null,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    };
  }

  private fromRow(row: any): CustomerOperationsPlan {
    return {
      id: row.id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
      clientId: row.client_id,
      clientName: row.client_name,
      lifecycleStage: row.lifecycle_stage,
      owner: row.owner,
      healthStatus: row.health_status,
      healthScore: Number(row.health_score || 0),
      onboardingChecklist: row.onboarding_checklist_json || [],
      objectives: row.objectives_json || [],
      risks: row.risks_json || [],
      supportSlaHours: Number(row.support_sla_hours || 24),
      nextReviewAt: row.next_review_at || undefined,
      renewalAt: row.renewal_at || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
