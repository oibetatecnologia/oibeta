import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CreateDeploymentRecordInput,
  DeploymentEnvironment,
  DeploymentEnvironmentKind,
  DeploymentRecord,
  UpdateDeploymentEnvironmentInput,
} from "./DeploymentEnvironmentTypes";

interface JsonDeploymentState {
  environments: DeploymentEnvironment[];
  deployments: DeploymentRecord[];
}

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "deployment-environments.json",
);

const nowIso = () => new Date().toISOString();

const DEFAULTS: Array<{
  kind: DeploymentEnvironmentKind;
  name: string;
  status: DeploymentEnvironment["status"];
  version: string;
  url: string;
  databaseStatus: DeploymentEnvironment["status"];
  storageStatus: DeploymentEnvironment["status"];
  apiStatus: DeploymentEnvironment["status"];
  notes: string;
}> = [
  {
    kind: "development",
    name: "Ambiente de desenvolvimento",
    status: "ready",
    version: "RC-1-dev",
    url: "local.oibeta.dev",
    databaseStatus: "ready",
    storageStatus: "pending",
    apiStatus: "ready",
    notes:
      "Ambiente local oficial para evolução incremental, lint, build e testes.",
  },
  {
    kind: "staging",
    name: "Ambiente de homologação",
    status: "pending",
    version: "A preparar",
    url: "staging.betaplatform.com.br",
    databaseStatus: "pending",
    storageStatus: "pending",
    apiStatus: "pending",
    notes:
      "Ambiente de validação de autenticação, multi-tenant, permissões e integrações.",
  },
  {
    kind: "production",
    name: "Ambiente de produção",
    status: "pending",
    version: "A preparar",
    url: "app.betaplatform.com.br",
    databaseStatus: "pending",
    storageStatus: "pending",
    apiStatus: "pending",
    notes:
      "Ambiente comercial oficial após aprovação dos gates de produção.",
  },
];

export class DeploymentEnvironmentService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async listEnvironments(
    tenantId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<DeploymentEnvironment[]> {
    if (this.mode === "json") {
      const state = this.readJson();
      let environments = state.environments.filter(
        (environment) =>
          environment.tenantId === tenantId ||
          environment.organizationId === organizationId,
      );

      if (environments.length === 0) {
        environments = this.buildDefaults(
          tenantId,
          organizationId,
          workspaceId,
        );
        state.environments.push(...environments);
        this.writeJson(state);
      }

      return environments.sort((a, b) =>
        this.kindWeight(a.kind) - this.kindWeight(b.kind),
      );
    }

    const client = this.supabaseAdapter.getClient();
    const { data, error } = await client
      .from("deployment_environments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("kind");

    if (error) throw error;

    if (!data || data.length === 0) {
      const defaults = this.buildDefaults(
        tenantId,
        organizationId,
        workspaceId,
      );

      const { data: inserted, error: insertError } = await client
        .from("deployment_environments")
        .insert(
          defaults.map((environment) =>
            this.toEnvironmentRow(environment),
          ),
        )
        .select();

      if (insertError) throw insertError;
      return (inserted || []).map((row: any) =>
        this.fromEnvironmentRow(row),
      );
    }

    return data.map((row: any) => this.fromEnvironmentRow(row));
  }

  async getEnvironment(
    environmentId: string,
  ): Promise<DeploymentEnvironment> {
    if (this.mode === "json") {
      const environment = this.readJson().environments.find(
        (item) => item.id === environmentId,
      );

      if (!environment) {
        throw new Error("Ambiente não encontrado.");
      }

      return environment;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_environments")
      .select("*")
      .eq("id", environmentId)
      .single();

    if (error) throw error;
    return this.fromEnvironmentRow(data);
  }

  async updateEnvironment(
    environmentId: string,
    input: UpdateDeploymentEnvironmentInput,
  ): Promise<DeploymentEnvironment> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const state = this.readJson();
      const index = state.environments.findIndex(
        (environment) => environment.id === environmentId,
      );

      if (index < 0) throw new Error("Ambiente não encontrado.");

      state.environments[index] = {
        ...state.environments[index],
        ...input,
        updatedAt: timestamp,
      };
      this.writeJson(state);
      return state.environments[index];
    }

    const payload: Record<string, unknown> = {
      updated_at: timestamp,
    };

    if (input.name !== undefined) payload.name = input.name;
    if (input.status !== undefined) payload.status = input.status;
    if (input.version !== undefined) payload.version = input.version;
    if (input.url !== undefined) payload.url = input.url;
    if (input.databaseStatus !== undefined) {
      payload.database_status = input.databaseStatus;
    }
    if (input.storageStatus !== undefined) {
      payload.storage_status = input.storageStatus;
    }
    if (input.apiStatus !== undefined) {
      payload.api_status = input.apiStatus;
    }
    if (input.notes !== undefined) payload.notes = input.notes;

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_environments")
      .update(payload)
      .eq("id", environmentId)
      .select()
      .single();

    if (error) throw error;
    return this.fromEnvironmentRow(data);
  }

  async listDeployments(
    environmentId: string,
    limit = 50,
  ): Promise<DeploymentRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));

    if (this.mode === "json") {
      return this.readJson()
        .deployments.filter(
          (deployment) => deployment.environmentId === environmentId,
        )
        .sort((a, b) => b.deployedAt.localeCompare(a.deployedAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_history")
      .select("*")
      .eq("environment_id", environmentId)
      .order("deployed_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      environmentId: row.environment_id,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      version: row.version,
      status: row.status,
      responsible: row.responsible,
      notes: row.notes || undefined,
      deployedAt: row.deployed_at,
    }));
  }

  async recordDeployment(
    environmentId: string,
    input: CreateDeploymentRecordInput,
  ): Promise<{
    environment: DeploymentEnvironment;
    deployment: DeploymentRecord;
  }> {
    const environments =
      this.mode === "json"
        ? this.readJson().environments
        : [];

    let baseEnvironment =
      environments.find(
        (environment) => environment.id === environmentId,
      );

    if (this.mode === "supabase") {
      const { data, error } = await this.supabaseAdapter
        .getClient()
        .from("deployment_environments")
        .select("*")
        .eq("id", environmentId)
        .single();

      if (error) throw error;
      baseEnvironment = this.fromEnvironmentRow(data);
    }

    if (!baseEnvironment) throw new Error("Ambiente não encontrado.");

    const deployedAt = nowIso();
    const deployment: DeploymentRecord = {
      id: crypto.randomUUID(),
      environmentId,
      tenantId: baseEnvironment.tenantId,
      organizationId: baseEnvironment.organizationId,
      version: input.version.trim(),
      status: input.status,
      responsible: input.responsible.trim(),
      notes: input.notes?.trim() || undefined,
      deployedAt,
    };

    const nextEnvironmentStatus =
      input.status === "success"
        ? "ready"
        : input.status === "rolled_back"
          ? "attention"
          : "offline";

    if (this.mode === "json") {
      const state = this.readJson();
      state.deployments.unshift(deployment);
      const index = state.environments.findIndex(
        (environment) => environment.id === environmentId,
      );
      state.environments[index] = {
        ...state.environments[index],
        status: nextEnvironmentStatus,
        version: deployment.version,
        lastDeployAt: deployedAt,
        lastDeployVersion: deployment.version,
        updatedAt: deployedAt,
      };
      this.writeJson(state);

      return {
        environment: state.environments[index],
        deployment,
      };
    }

    const client = this.supabaseAdapter.getClient();
    const { error: deployError } = await client
      .from("deployment_history")
      .insert({
        id: deployment.id,
        environment_id: environmentId,
        tenant_id: deployment.tenantId,
        organization_id: deployment.organizationId,
        version: deployment.version,
        status: deployment.status,
        responsible: deployment.responsible,
        notes: deployment.notes || null,
        deployed_at: deployment.deployedAt,
      });

    if (deployError) throw deployError;

    const environment = await this.updateEnvironment(environmentId, {
      status: nextEnvironmentStatus,
      version: deployment.version,
    });

    const { data, error } = await client
      .from("deployment_environments")
      .update({
        last_deploy_at: deployedAt,
        last_deploy_version: deployment.version,
        updated_at: deployedAt,
      })
      .eq("id", environmentId)
      .select()
      .single();

    if (error) throw error;

    return {
      environment: this.fromEnvironmentRow(data) || environment,
      deployment,
    };
  }

  private buildDefaults(
    tenantId: string,
    organizationId: string,
    workspaceId?: string,
  ): DeploymentEnvironment[] {
    const timestamp = nowIso();

    return DEFAULTS.map((definition) => ({
      id: crypto.randomUUID(),
      tenantId,
      organizationId,
      workspaceId,
      ...definition,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
  }

  private readJson(): JsonDeploymentState {
    if (!fs.existsSync(JSON_PATH)) {
      return {
        environments: [],
        deployments: [],
      };
    }

    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_PATH, "utf-8"),
      ) as Partial<JsonDeploymentState>;

      return {
        environments: Array.isArray(parsed.environments)
          ? parsed.environments
          : [],
        deployments: Array.isArray(parsed.deployments)
          ? parsed.deployments
          : [],
      };
    } catch {
      return {
        environments: [],
        deployments: [],
      };
    }
  }

  private writeJson(state: JsonDeploymentState): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(state, null, 2),
      "utf-8",
    );
  }

  private kindWeight(kind: DeploymentEnvironmentKind): number {
    if (kind === "development") return 1;
    if (kind === "staging") return 2;
    return 3;
  }

  private toEnvironmentRow(
    environment: DeploymentEnvironment,
  ): Record<string, unknown> {
    return {
      id: environment.id,
      tenant_id: environment.tenantId,
      organization_id: environment.organizationId,
      workspace_id: environment.workspaceId || null,
      kind: environment.kind,
      name: environment.name,
      status: environment.status,
      version: environment.version,
      url: environment.url,
      database_status: environment.databaseStatus,
      storage_status: environment.storageStatus,
      api_status: environment.apiStatus,
      notes: environment.notes,
      last_deploy_at: environment.lastDeployAt || null,
      last_deploy_version: environment.lastDeployVersion || null,
      created_at: environment.createdAt,
      updated_at: environment.updatedAt,
    };
  }

  private fromEnvironmentRow(row: any): DeploymentEnvironment {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id || undefined,
      kind: row.kind,
      name: row.name,
      status: row.status,
      version: row.version,
      url: row.url,
      databaseStatus: row.database_status,
      storageStatus: row.storage_status,
      apiStatus: row.api_status,
      notes: row.notes || "",
      lastDeployAt: row.last_deploy_at || undefined,
      lastDeployVersion: row.last_deploy_version || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
