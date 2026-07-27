import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  AdminAuditEntry,
  CreateAdminAuditEntryInput,
} from "./AdminAuditTypes";

const JSON_AUDIT_PATH = path.join(
  process.cwd(),
  ".data",
  "admin-audit-log.json",
);

const MAX_JSON_ENTRIES = 2_000;

export class AdminAuditService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async list(
    organizationId?: string,
    limit = 100,
  ): Promise<AdminAuditEntry[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (entry) =>
            !organizationId ||
            entry.organizationId === organizationId ||
            entry.organizationId === "global",
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    let query = this.supabaseAdapter
      .getClient()
      .from("super_admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (organizationId) {
      query = query.in("organization_id", [organizationId, "global"]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      actorName: row.metadata_json?.actorName || undefined,
      organizationId: row.organization_id,
      actionType: row.action_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      description: row.description,
      metadata: row.metadata_json || {},
      createdAt: row.created_at,
    }));
  }

  async record(
    input: CreateAdminAuditEntryInput,
  ): Promise<AdminAuditEntry> {
    const entry: AdminAuditEntry = {
      id: crypto.randomUUID(),
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      organizationId: input.organizationId || "global",
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
    };

    if (this.mode === "json") {
      const current = this.readJson();
      current.unshift(entry);
      this.writeJson(current.slice(0, MAX_JSON_ENTRIES));
      return entry;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("super_admin_audit_logs")
      .insert({
        id: entry.id,
        actor_user_id: entry.actorUserId,
        organization_id: entry.organizationId,
        action_type: entry.actionType,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        description: entry.description,
        metadata_json: {
          ...entry.metadata,
          actorName: entry.actorName,
        },
        created_at: entry.createdAt,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...entry,
      id: data.id,
      createdAt: data.created_at,
    };
  }

  private readJson(): AdminAuditEntry[] {
    if (!fs.existsSync(JSON_AUDIT_PATH)) return [];

    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_AUDIT_PATH, "utf-8"),
      );

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(entries: AdminAuditEntry[]): void {
    fs.mkdirSync(path.dirname(JSON_AUDIT_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_AUDIT_PATH,
      JSON.stringify(entries, null, 2),
      "utf-8",
    );
  }
}
