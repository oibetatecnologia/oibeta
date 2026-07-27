import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CreatePlatformNotificationInput,
  PlatformNotification,
} from "./NotificationCenterTypes";

const JSON_PATH = path.join(process.cwd(), ".data", "platform-notifications.json");
const nowIso = () => new Date().toISOString();

export class NotificationCenterService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async list(organizationId: string, userId: string, limit = 100): Promise<PlatformNotification[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    if (this.mode === "json") {
      return this.readJson()
        .filter((item) => item.organizationId === organizationId && item.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }
    const { data, error } = await this.supabaseAdapter.getClient()
      .from("notifications").select("*")
      .eq("organization_id", organizationId).eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(safeLimit);
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async listByEntity(organizationId: string, entityType: string, entityId?: string, limit = 500): Promise<PlatformNotification[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    if (this.mode === "json") {
      return this.readJson()
        .filter((item) => item.organizationId === organizationId && item.relatedEntityType === entityType && (!entityId || item.relatedEntityId === entityId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, safeLimit);
    }
    let query = this.supabaseAdapter.getClient().from("notifications").select("*")
      .eq("organization_id", organizationId).eq("related_entity_type", entityType)
      .order("created_at", { ascending: false }).limit(safeLimit);
    if (entityId) query = query.eq("related_entity_id", entityId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(input: CreatePlatformNotificationInput): Promise<PlatformNotification> {
    const timestamp = nowIso();
    const item: PlatformNotification = {
      id: crypto.randomUUID(), organizationId: input.organizationId, userId: input.userId,
      title: input.title.trim(), message: input.message?.trim() || undefined,
      notificationType: input.notificationType, relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId, status: input.status || "UNREAD",
      metadataJson: input.metadataJson || {}, createdAt: timestamp, updatedAt: timestamp,
    };
    if (!item.title || !item.userId) throw new Error("Título e usuário são obrigatórios.");
    if (this.mode === "json") {
      const items = this.readJson(); items.unshift(item); this.writeJson(items.slice(0, 10000)); return item;
    }
    const { data, error } = await this.supabaseAdapter.getClient().from("notifications")
      .insert(this.toRow(item)).select().single();
    if (error) throw error;
    return this.fromRow(data);
  }

  async markRead(organizationId: string, userId: string, notificationId: string): Promise<PlatformNotification> {
    const timestamp = nowIso();
    if (this.mode === "json") {
      const items = this.readJson();
      const index = items.findIndex((item) => item.id === notificationId && item.organizationId === organizationId && item.userId === userId);
      if (index < 0) throw new Error("Notificação não encontrada.");
      items[index] = { ...items[index], status: "READ", readAt: timestamp, updatedAt: timestamp };
      this.writeJson(items); return items[index];
    }
    const { data, error } = await this.supabaseAdapter.getClient().from("notifications")
      .update({ status: "READ", read_at: timestamp, updated_at: timestamp })
      .eq("id", notificationId).eq("organization_id", organizationId).eq("user_id", userId)
      .select().single();
    if (error) throw error;
    return this.fromRow(data);
  }

  async markAllRead(organizationId: string, userId: string): Promise<{ updated: number }> {
    const timestamp = nowIso();
    if (this.mode === "json") {
      const items = this.readJson(); let updated = 0;
      const next = items.map((item) => {
        if (item.organizationId === organizationId && item.userId === userId && String(item.status).toUpperCase() !== "READ") {
          updated += 1; return { ...item, status: "READ", readAt: timestamp, updatedAt: timestamp };
        }
        return item;
      });
      this.writeJson(next); return { updated };
    }
    const { data, error } = await this.supabaseAdapter.getClient().from("notifications")
      .update({ status: "READ", read_at: timestamp, updated_at: timestamp })
      .eq("organization_id", organizationId).eq("user_id", userId).neq("status", "READ").select("id");
    if (error) throw error;
    return { updated: (data || []).length };
  }

  private readJson(): PlatformNotification[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try { const value = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")); return Array.isArray(value) ? value : []; } catch { return []; }
  }
  private writeJson(items: PlatformNotification[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), "utf-8");
  }
  private toRow(item: PlatformNotification): Record<string, unknown> {
    return { id: item.id, organization_id: item.organizationId, user_id: item.userId, title: item.title,
      message: item.message || null, notification_type: item.notificationType || null,
      related_entity_type: item.relatedEntityType || null, related_entity_id: item.relatedEntityId || null,
      read_at: item.readAt || null, status: item.status, metadata_json: item.metadataJson,
      created_at: item.createdAt, updated_at: item.updatedAt };
  }
  private fromRow(row: any): PlatformNotification {
    return { id: row.id, organizationId: row.organization_id, userId: row.user_id, title: row.title,
      message: row.message || undefined, notificationType: row.notification_type || undefined,
      relatedEntityType: row.related_entity_type || undefined, relatedEntityId: row.related_entity_id || undefined,
      readAt: row.read_at || undefined, status: row.status, metadataJson: row.metadata_json || {},
      createdAt: row.created_at, updatedAt: row.updated_at };
  }
}
