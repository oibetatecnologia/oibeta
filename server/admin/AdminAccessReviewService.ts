import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { AdminDirectoryService } from "./AdminDirectoryService";
import type {
  AdminAccessReview,
  AdminAccessReviewItem,
  AdminGovernanceOverview,
  DecideAdminAccessReviewItemInput,
} from "./AdminAccessReviewTypes";

const JSON_PATH = path.join(process.cwd(), ".data", "admin-access-reviews.json");
const nowIso = () => new Date().toISOString();

export class AdminAccessReviewService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly directory: AdminDirectoryService,
  ) {}

  async overview(organizationId: string): Promise<AdminGovernanceOverview> {
    const [users, reviews] = await Promise.all([
      this.directory.listUsers(organizationId),
      this.list(organizationId, 100),
    ]);
    const open = reviews.filter((review) => review.status === "open");
    const pendingDecisions = open.reduce(
      (total, review) => total + review.items.filter((item) => item.decision === "pending").length,
      0,
    );
    const privilegedUsers = users.filter((user) =>
      ["master_admin", "tenant_admin", "executive"].includes(user.profile),
    ).length;
    const usersWithoutProducts = users.filter((user) => user.productIds.length === 0).length;
    const usersWithoutSuperior = users.filter(
      (user) =>
        !["master_admin", "tenant_admin"].includes(user.profile) &&
        !user.superiorUserId,
    ).length;
    const risk = usersWithoutProducts * 4 + usersWithoutSuperior * 3 + pendingDecisions * 2;

    return {
      organizationId,
      users: users.length,
      activeUsers: users.filter((user) => user.status === "active").length,
      invitedUsers: users.filter((user) => user.status === "invited").length,
      pausedUsers: users.filter((user) => user.status === "paused").length,
      privilegedUsers,
      usersWithoutProducts,
      usersWithoutSuperior,
      openReviews: open.length,
      pendingDecisions,
      governanceScore: Math.max(0, Math.min(100, 100 - risk)),
    };
  }

  async list(organizationId: string, limit = 50): Promise<AdminAccessReview[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    if (this.mode === "json") {
      return this.readJson()
        .filter((review) => review.organizationId === organizationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter.getClient()
      .from("admin_access_reviews")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(organizationId: string, createdBy: string): Promise<AdminAccessReview> {
    const existing = (await this.list(organizationId, 100)).find(
      (review) => review.status === "open",
    );
    if (existing) return existing;

    const users = await this.directory.listUsers(organizationId);
    const timestamp = nowIso();
    const review: AdminAccessReview = {
      id: crypto.randomUUID(),
      organizationId,
      status: "open",
      items: users.map((user): AdminAccessReviewItem => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        status: user.status,
        superiorUserId: user.superiorUserId,
        productIds: user.productIds,
        riskFlags: this.riskFlags(user),
        decision: "pending",
      })),
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.save(review);
    return review;
  }

  async decide(
    organizationId: string,
    reviewId: string,
    userId: string,
    input: DecideAdminAccessReviewItemInput,
  ): Promise<AdminAccessReview> {
    if (!input.decidedBy.trim()) throw new Error("Responsável pela decisão é obrigatório.");
    const reviews = await this.list(organizationId, 200);
    const review = reviews.find((item) => item.id === reviewId);
    if (!review || review.status !== "open") throw new Error("Revisão aberta não encontrada.");
    const item = review.items.find((entry) => entry.userId === userId);
    if (!item) throw new Error("Usuário não pertence à revisão.");

    const update: Record<string, unknown> = {};
    if (input.decision === "suspended") update.status = "paused";
    if (input.status !== undefined) update.status = input.status;
    if (input.profile !== undefined) update.profile = input.profile;
    if (input.superiorUserId !== undefined) update.superiorUserId = input.superiorUserId;
    if (input.productIds !== undefined) update.productIds = input.productIds;

    if (Object.keys(update).length > 0) {
      const user = await this.directory.updateUser(organizationId, userId, update);
      item.profile = user.profile;
      item.status = user.status;
      item.superiorUserId = user.superiorUserId;
      item.productIds = user.productIds;
      item.riskFlags = this.riskFlags(user);
    }

    item.decision = input.decision;
    item.decidedBy = input.decidedBy.trim();
    item.decidedAt = nowIso();
    item.notes = input.notes?.trim() || undefined;
    review.updatedAt = nowIso();

    if (review.items.every((entry) => entry.decision !== "pending")) {
      review.status = "completed";
      review.completedAt = nowIso();
    }

    await this.save(review);
    return review;
  }

  private riskFlags(user: {
    profile: string;
    status: string;
    superiorUserId?: string;
    productIds: string[];
  }): string[] {
    const flags: string[] = [];
    if (user.status === "invited") flags.push("convite_pendente");
    if (user.status === "paused" || user.status === "inactive") flags.push("acesso_inativo");
    if (user.productIds.length === 0) flags.push("sem_produtos");
    if (!["master_admin", "tenant_admin"].includes(user.profile) && !user.superiorUserId) {
      flags.push("sem_superior");
    }
    if (["master_admin", "tenant_admin", "executive"].includes(user.profile)) {
      flags.push("acesso_privilegiado");
    }
    return flags;
  }

  private async save(review: AdminAccessReview): Promise<void> {
    if (this.mode === "json") {
      const reviews = this.readJson();
      const index = reviews.findIndex((item) => item.id === review.id);
      if (index >= 0) reviews[index] = review;
      else reviews.unshift(review);
      this.writeJson(reviews.slice(0, 2_000));
      return;
    }

    const { error } = await this.supabaseAdapter.getClient()
      .from("admin_access_reviews")
      .upsert({
        id: review.id,
        organization_id: review.organizationId,
        status: review.status,
        items_json: review.items,
        created_by: review.createdBy,
        created_at: review.createdAt,
        completed_at: review.completedAt || null,
        updated_at: review.updatedAt,
      });
    if (error) throw error;
  }

  private readJson(): AdminAccessReview[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(reviews: AdminAccessReview[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(reviews, null, 2), "utf-8");
  }

  private fromRow(row: any): AdminAccessReview {
    return {
      id: row.id,
      organizationId: row.organization_id,
      status: row.status,
      items: Array.isArray(row.items_json) ? row.items_json : [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
    };
  }
}
