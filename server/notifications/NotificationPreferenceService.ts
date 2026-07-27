import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  NotificationEscalationLevel,
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from "./NotificationPreferenceTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "notification-preferences.json",
);

const DEFAULT_LEVEL: NotificationEscalationLevel = "standard";

const nowIso = () => new Date().toISOString();

export class NotificationPreferenceService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async get(
    organizationId: string,
    userId: string,
  ): Promise<NotificationPreference> {
    if (this.mode === "json") {
      const preferences = this.readJson();
      const existing = preferences.find(
        (preference) =>
          preference.organizationId === organizationId &&
          preference.userId === userId,
      );

      if (existing) return existing;

      const created = this.createDefault(organizationId, userId);
      preferences.push(created);
      this.writeJson(preferences);
      return created;
    }

    const client = this.supabaseAdapter.getClient();
    const { data, error } = await client
      .from("notification_preferences")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (data) return this.fromRow(data);

    const created = this.createDefault(organizationId, userId);
    const { data: inserted, error: insertError } = await client
      .from("notification_preferences")
      .insert(this.toRow(created))
      .select()
      .single();

    if (insertError) throw insertError;
    return this.fromRow(inserted);
  }

  async update(
    organizationId: string,
    userId: string,
    input: UpdateNotificationPreferenceInput,
  ): Promise<NotificationPreference> {
    const current = await this.get(organizationId, userId);
    const updated: NotificationPreference = {
      ...current,
      ...input,
      minimumEscalationLevel:
        input.minimumEscalationLevel ||
        current.minimumEscalationLevel,
      updatedAt: nowIso(),
    };

    if (this.mode === "json") {
      const preferences = this.readJson();
      const index = preferences.findIndex(
        (preference) =>
          preference.organizationId === organizationId &&
          preference.userId === userId,
      );

      if (index >= 0) {
        preferences[index] = updated;
      } else {
        preferences.push(updated);
      }

      this.writeJson(preferences);
      return updated;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_preferences")
      .upsert(this.toRow(updated), {
        onConflict: "organization_id,user_id",
      })
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<NotificationPreference[]> {
    if (this.mode === "json") {
      return this.readJson().filter(
        (preference) =>
          preference.organizationId === organizationId,
      );
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_preferences")
      .select("*")
      .eq("organization_id", organizationId);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  shouldDeliverIncidentAlert(
    preference: NotificationPreference,
    level: NotificationEscalationLevel,
  ): boolean {
    if (!preference.inAppEnabled) return false;
    if (!preference.incidentAlertsEnabled) return false;

    const weights: Record<NotificationEscalationLevel, number> = {
      standard: 1,
      high: 2,
      critical: 3,
    };

    return weights[level] >= weights[preference.minimumEscalationLevel];
  }

  private createDefault(
    organizationId: string,
    userId: string,
  ): NotificationPreference {
    const timestamp = nowIso();

    return {
      id: crypto.randomUUID(),
      organizationId,
      userId,
      inAppEnabled: true,
      incidentAlertsEnabled: true,
      minimumEscalationLevel: DEFAULT_LEVEL,
      markReadOnOpen: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private readJson(): NotificationPreference[] {
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
    preferences: NotificationPreference[],
  ): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(preferences, null, 2),
      "utf-8",
    );
  }

  private toRow(
    preference: NotificationPreference,
  ): Record<string, unknown> {
    return {
      id: preference.id,
      organization_id: preference.organizationId,
      user_id: preference.userId,
      in_app_enabled: preference.inAppEnabled,
      incident_alerts_enabled: preference.incidentAlertsEnabled,
      minimum_escalation_level:
        preference.minimumEscalationLevel,
      mark_read_on_open: preference.markReadOnOpen,
      created_at: preference.createdAt,
      updated_at: preference.updatedAt,
    };
  }

  private fromRow(row: any): NotificationPreference {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      inAppEnabled: row.in_app_enabled !== false,
      incidentAlertsEnabled:
        row.incident_alerts_enabled !== false,
      minimumEscalationLevel:
        row.minimum_escalation_level || DEFAULT_LEVEL,
      markReadOnOpen: row.mark_read_on_open !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
