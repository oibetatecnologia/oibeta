import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { DeploymentValidationService } from "./DeploymentValidationService";
import type {
  CreateDeploymentReleaseApprovalInput,
  DecideDeploymentReleaseApprovalInput,
  DeploymentReleaseApproval,
  DeploymentReleaseApprovalSummary,
} from "./DeploymentReleaseApprovalTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "deployment-release-approvals.json",
);

export class DeploymentReleaseApprovalService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly validations: DeploymentValidationService,
  ) {}

  async list(limit = 100): Promise<DeploymentReleaseApproval[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_approvals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(
    input: CreateDeploymentReleaseApprovalInput,
  ): Promise<DeploymentReleaseApproval> {
    const validation = (await this.validations.list(500)).find(
      (run) => run.id === input.validationRunId,
    );

    if (!validation) {
      throw new Error("Validação de publicação não encontrada.");
    }

    if (
      input.target === "production" &&
      (validation.productionBlocked ||
        validation.status !== "approved")
    ) {
      throw new Error(
        "Produção exige uma validação aprovada e sem bloqueios.",
      );
    }

    if (!input.version.trim() || !input.requestedBy.trim()) {
      throw new Error("Versão e solicitante são obrigatórios.");
    }

    const current = await this.list(500);
    const duplicate = current.find(
      (approval) =>
        approval.validationRunId === input.validationRunId &&
        approval.target === input.target &&
        approval.version === input.version.trim() &&
        approval.status === "pending",
    );

    if (duplicate) return duplicate;

    const timestamp = new Date().toISOString();
    const approval: DeploymentReleaseApproval = {
      id: crypto.randomUUID(),
      validationRunId: validation.id,
      target: input.target,
      version: input.version.trim(),
      status: "pending",
      requestedBy: input.requestedBy.trim(),
      requestedAt: timestamp,
      notes: input.notes?.trim() || undefined,
      validationScore: validation.score,
      validationStatus: validation.status,
      productionBlocked: validation.productionBlocked,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (this.mode === "json") {
      const approvals = this.readJson();
      approvals.unshift(approval);
      this.writeJson(approvals.slice(0, 2_000));
      return approval;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_approvals")
      .insert(this.toRow(approval))
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async decide(
    approvalId: string,
    input: DecideDeploymentReleaseApprovalInput,
  ): Promise<DeploymentReleaseApproval> {
    if (!input.decidedBy.trim()) {
      throw new Error("Responsável pela decisão é obrigatório.");
    }

    const timestamp = new Date().toISOString();

    if (this.mode === "json") {
      const approvals = this.readJson();
      const index = approvals.findIndex(
        (approval) => approval.id === approvalId,
      );

      if (index < 0) {
        throw new Error("Solicitação de release não encontrada.");
      }

      if (approvals[index].status !== "pending") {
        throw new Error("A solicitação já foi decidida.");
      }

      approvals[index] = {
        ...approvals[index],
        status: input.status,
        decidedBy: input.decidedBy.trim(),
        decidedAt: timestamp,
        notes:
          input.notes?.trim() ||
          approvals[index].notes,
        updatedAt: timestamp,
      };

      this.writeJson(approvals);
      return approvals[index];
    }

    const { data: current, error: currentError } =
      await this.supabaseAdapter
        .getClient()
        .from("deployment_release_approvals")
        .select("*")
        .eq("id", approvalId)
        .single();

    if (currentError) throw currentError;
    if (current.status !== "pending") {
      throw new Error("A solicitação já foi decidida.");
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_release_approvals")
      .update({
        status: input.status,
        decided_by: input.decidedBy.trim(),
        decided_at: timestamp,
        notes: input.notes?.trim() || current.notes,
        updated_at: timestamp,
      })
      .eq("id", approvalId)
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  buildSummary(
    approvals: DeploymentReleaseApproval[],
  ): DeploymentReleaseApprovalSummary {
    const pending = approvals.filter(
      (approval) => approval.status === "pending",
    ).length;
    const approved = approvals.filter(
      (approval) => approval.status === "approved",
    ).length;
    const rejected = approvals.filter(
      (approval) => approval.status === "rejected",
    ).length;
    const cancelled = approvals.filter(
      (approval) => approval.status === "cancelled",
    ).length;

    const productionApproved = approvals.some(
      (approval) =>
        approval.target === "production" &&
        approval.status === "approved",
    );
    const stagingApproved = approvals.some(
      (approval) =>
        approval.target === "staging" &&
        approval.status === "approved",
    );

    return {
      total: approvals.length,
      pending,
      approved,
      rejected,
      cancelled,
      productionApproved,
      stagingApproved,
      latest: approvals[0],
      readinessScore:
        approvals.length === 0
          ? 30
          : Math.max(
              0,
              Math.min(
                100,
                (productionApproved ? 100 : stagingApproved ? 75 : 45) -
                  pending * 3 -
                  rejected * 5,
              ),
            ),
    };
  }

  private readJson(): DeploymentReleaseApproval[] {
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
    approvals: DeploymentReleaseApproval[],
  ): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(approvals, null, 2),
      "utf-8",
    );
  }

  private toRow(approval: DeploymentReleaseApproval) {
    return {
      id: approval.id,
      validation_run_id: approval.validationRunId,
      target: approval.target,
      version: approval.version,
      status: approval.status,
      requested_by: approval.requestedBy,
      requested_at: approval.requestedAt,
      decided_by: approval.decidedBy || null,
      decided_at: approval.decidedAt || null,
      notes: approval.notes || null,
      validation_score: approval.validationScore,
      validation_status: approval.validationStatus,
      production_blocked: approval.productionBlocked,
      created_at: approval.createdAt,
      updated_at: approval.updatedAt,
    };
  }

  private fromRow(row: any): DeploymentReleaseApproval {
    return {
      id: row.id,
      validationRunId: row.validation_run_id,
      target: row.target,
      version: row.version,
      status: row.status,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      decidedBy: row.decided_by || undefined,
      decidedAt: row.decided_at || undefined,
      notes: row.notes || undefined,
      validationScore: Number(row.validation_score || 0),
      validationStatus: row.validation_status,
      productionBlocked: Boolean(row.production_blocked),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
