import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CreateOperationalIncidentInput,
  OperationalIncident,
  UpdateOperationalIncidentInput,
} from "./OperationalIncidentTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "operational-incidents.json",
);

export class OperationalIncidentService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async list(
    organizationId: string,
    limit = 100,
  ): Promise<OperationalIncident[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (incident) =>
            incident.organizationId === organizationId,
        )
        .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .order("opened_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    return (data || []).map((row: any) => this.fromRow(row));
  }

  async create(
    input: CreateOperationalIncidentInput,
  ): Promise<OperationalIncident> {
    const now = new Date().toISOString();
    const incident: OperationalIncident = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      description: input.description.trim(),
      source: input.source.trim(),
      severity: input.severity,
      status: "open",
      owner: input.owner?.trim() || undefined,
      fingerprint: input.fingerprint?.trim() || undefined,
      automated: input.automated === true,
      occurrenceCount: 1,
      lastDetectedAt: input.automated ? now : undefined,
      openedAt: now,
      updatedAt: now,
    };

    if (!incident.title || !incident.description || !incident.source) {
      throw new Error(
        "Título, descrição e origem são obrigatórios.",
      );
    }

    if (this.mode === "json") {
      const incidents = this.readJson();
      incidents.unshift(incident);
      this.writeJson(incidents.slice(0, 5_000));
      return incident;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .insert(this.toRow(incident))
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async upsertDetected(
    input: CreateOperationalIncidentInput,
  ): Promise<{ incident: OperationalIncident; created: boolean }> {
    if (!input.fingerprint) {
      return { incident: await this.create(input), created: true };
    }

    const existing = await this.findActiveByFingerprint(
      input.organizationId,
      input.fingerprint,
    );

    if (!existing) {
      return { incident: await this.create(input), created: true };
    }

    const now = new Date().toISOString();
    const next: OperationalIncident = {
      ...existing,
      description: input.description.trim(),
      severity: input.severity,
      owner: input.owner?.trim() || existing.owner,
      automated: true,
      occurrenceCount: existing.occurrenceCount + 1,
      lastDetectedAt: now,
      updatedAt: now,
    };

    if (this.mode === "json") {
      const incidents = this.readJson();
      const index = incidents.findIndex(
        (incident) => incident.id === existing.id,
      );
      incidents[index] = next;
      this.writeJson(incidents);
      return { incident: next, created: false };
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .update(this.toRow(next))
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return { incident: this.fromRow(data), created: false };
  }

  async update(
    organizationId: string,
    incidentId: string,
    input: UpdateOperationalIncidentInput,
  ): Promise<OperationalIncident> {
    if (this.mode === "json") {
      const incidents = this.readJson();
      const index = incidents.findIndex(
        (incident) =>
          incident.id === incidentId &&
          incident.organizationId === organizationId,
      );

      if (index < 0) {
        throw new Error("Incidente não encontrado.");
      }

      incidents[index] = this.applyUpdate(
        incidents[index],
        input,
      );
      this.writeJson(incidents);
      return incidents[index];
    }

    const current = await this.getById(
      organizationId,
      incidentId,
    );
    const updated = this.applyUpdate(current, input);

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .update(this.toRow(updated))
      .eq("id", incidentId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  private async findActiveByFingerprint(
    organizationId: string,
    fingerprint: string,
  ): Promise<OperationalIncident | undefined> {
    if (this.mode === "json") {
      return this.readJson().find(
        (incident) =>
          incident.organizationId === organizationId &&
          incident.fingerprint === fingerprint &&
          incident.status !== "resolved",
      );
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("fingerprint", fingerprint)
      .neq("status", "resolved")
      .maybeSingle();

    if (error) throw error;
    return data ? this.fromRow(data) : undefined;
  }

  private async getById(
    organizationId: string,
    incidentId: string,
  ): Promise<OperationalIncident> {
    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("operational_incidents")
      .select("*")
      .eq("id", incidentId)
      .eq("organization_id", organizationId)
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  private applyUpdate(
    current: OperationalIncident,
    input: UpdateOperationalIncidentInput,
  ): OperationalIncident {
    const now = new Date().toISOString();
    const nextStatus = input.status || current.status;

    return {
      ...current,
      ...input,
      title:
        input.title !== undefined
          ? input.title.trim()
          : current.title,
      description:
        input.description !== undefined
          ? input.description.trim()
          : current.description,
      owner:
        input.owner !== undefined
          ? input.owner.trim() || undefined
          : current.owner,
      resolutionNotes:
        input.resolutionNotes !== undefined
          ? input.resolutionNotes.trim() || undefined
          : current.resolutionNotes,
      acknowledgedAt:
        current.acknowledgedAt ||
        (nextStatus === "investigating" ? now : undefined),
      mitigatedAt:
        current.mitigatedAt ||
        (nextStatus === "mitigated" ? now : undefined),
      resolvedAt:
        nextStatus === "resolved"
          ? current.resolvedAt || now
          : undefined,
      updatedAt: now,
    };
  }

  private readJson(): OperationalIncident[] {
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

  private writeJson(incidents: OperationalIncident[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(incidents, null, 2),
      "utf-8",
    );
  }

  private toRow(
    incident: OperationalIncident,
  ): Record<string, unknown> {
    return {
      id: incident.id,
      organization_id: incident.organizationId,
      workspace_id: incident.workspaceId || null,
      title: incident.title,
      description: incident.description,
      source: incident.source,
      severity: incident.severity,
      status: incident.status,
      owner: incident.owner || null,
      resolution_notes: incident.resolutionNotes || null,
      fingerprint: incident.fingerprint || null,
      automated: incident.automated,
      occurrence_count: incident.occurrenceCount,
      last_detected_at: incident.lastDetectedAt || null,
      opened_at: incident.openedAt,
      acknowledged_at: incident.acknowledgedAt || null,
      mitigated_at: incident.mitigatedAt || null,
      resolved_at: incident.resolvedAt || null,
      updated_at: incident.updatedAt,
    };
  }

  private fromRow(row: any): OperationalIncident {
    return {
      id: row.id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id || undefined,
      title: row.title,
      description: row.description,
      source: row.source,
      severity: row.severity,
      status: row.status,
      owner: row.owner || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      fingerprint: row.fingerprint || undefined,
      automated: row.automated === true,
      occurrenceCount: Number(row.occurrence_count || 1),
      lastDetectedAt: row.last_detected_at || undefined,
      openedAt: row.opened_at,
      acknowledgedAt: row.acknowledged_at || undefined,
      mitigatedAt: row.mitigated_at || undefined,
      resolvedAt: row.resolved_at || undefined,
      updatedAt: row.updated_at,
    };
  }
}
