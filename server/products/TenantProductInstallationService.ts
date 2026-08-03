import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import { normalizeOfficialProductIds } from "../../src/products/officialProductIds";

export type TenantProductInstallationStatus = "active" | "suspended";

export interface TenantProductInstallation {
  id: string;
  tenantId: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  status: TenantProductInstallationStatus;
  capabilities: string[];
  settings: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

const JSON_PATH = path.join(process.cwd(), ".data", "tenant-product-installations.json");
const nowIso = () => new Date().toISOString();

const PRODUCT_RUNTIME_MANIFESTS: Record<string, { capabilities: string[]; settings: Record<string, unknown> }> = {
  "radar-comercial": {
    capabilities: [
      "opportunities.manage",
      "connectors.execute",
      "sync_history.read",
      "commercial_tasks.manage",
      "crm.prospect.create",
      "beta.radar.analyze",
      "beta.radar.qualify",
      "beta.radar.send_to_crm",
    ],
    settings: {
      defaultSort: "compatibility_desc",
      qualificationRequiredForCrm: true,
      crmIntegrationEnabled: true,
      betaAnalysisEnabled: true,
      connectorExecutionEnabled: true,
      tenantDataIsolation: true,
    },
  },
};

export class TenantProductInstallationService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabase: SupabaseDatabaseAdapter,
  ) {}

  async list(organizationId: string): Promise<TenantProductInstallation[]> {
    if (this.mode === "json") {
      return this.readJson().filter((item) => item.organizationId === organizationId);
    }
    const { data, error } = await this.supabase.getClient()
      .from("tenant_product_installations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("product_id");
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async sync(input: { tenantId: string; organizationId: string; workspaceId: string; productIds: string[] }): Promise<TenantProductInstallation[]> {
    const licensed = new Set(normalizeOfficialProductIds(input.productIds));
    const existing = await this.list(input.organizationId);
    const timestamp = nowIso();
    const next = [...existing];

    for (const [productId, manifest] of Object.entries(PRODUCT_RUNTIME_MANIFESTS)) {
      const index = next.findIndex((item) => item.productId === productId);
      const current = index >= 0 ? next[index] : undefined;
      const installation: TenantProductInstallation = {
        id: current?.id || crypto.randomUUID(),
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        productId,
        status: licensed.has(productId) ? "active" : "suspended",
        capabilities: [...manifest.capabilities],
        settings: { ...manifest.settings, ...(current?.settings || {}) },
        installedAt: current?.installedAt || timestamp,
        updatedAt: timestamp,
      };
      if (index >= 0) next[index] = installation;
      else next.push(installation);
    }

    if (this.mode === "json") {
      const all = this.readJson().filter((item) => item.organizationId !== input.organizationId);
      this.writeJson([...all, ...next]);
      return next;
    }

    const { data, error } = await this.supabase.getClient()
      .from("tenant_product_installations")
      .upsert(next.map((item) => this.toRow(item)), { onConflict: "organization_id,product_id" })
      .select("*");
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async hasActiveInstallation(organizationId: string, productId: string): Promise<boolean> {
    const normalizedProductId = normalizeOfficialProductIds([productId])[0];
    if (!normalizedProductId || !PRODUCT_RUNTIME_MANIFESTS[normalizedProductId]) return false;
    const installations = await this.list(organizationId);
    return installations.some(
      (item) => item.productId === normalizedProductId && item.status === "active",
    );
  }

  async isReady(organizationId: string, productIds: string[]): Promise<boolean> {
    const required = normalizeOfficialProductIds(productIds).filter((id) => PRODUCT_RUNTIME_MANIFESTS[id]);
    if (required.length === 0) return true;
    const installations = await this.list(organizationId);
    return required.every((productId) => installations.some((item) => item.productId === productId && item.status === "active"));
  }

  private readJson(): TenantProductInstallation[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try { const parsed = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }

  private writeJson(items: TenantProductInstallation[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), "utf-8");
  }

  private toRow(item: TenantProductInstallation) {
    return { id: item.id, tenant_id: item.tenantId, organization_id: item.organizationId, workspace_id: item.workspaceId, product_id: item.productId, status: item.status, capabilities_json: item.capabilities, settings_json: item.settings, installed_at: item.installedAt, updated_at: item.updatedAt };
  }

  private fromRow(row: any): TenantProductInstallation {
    return { id: row.id, tenantId: row.tenant_id, organizationId: row.organization_id, workspaceId: row.workspace_id, productId: row.product_id, status: row.status === "active" ? "active" : "suspended", capabilities: Array.isArray(row.capabilities_json) ? row.capabilities_json : [], settings: row.settings_json && typeof row.settings_json === "object" ? row.settings_json : {}, installedAt: row.installed_at, updatedAt: row.updated_at };
  }
}
