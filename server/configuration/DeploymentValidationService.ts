import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { DeploymentConfigurationService } from "./DeploymentConfigurationService";
import type { DeploymentConnectivityService } from "./DeploymentConnectivityService";
import type {
  DeploymentValidationRun,
  DeploymentValidationStatus,
  DeploymentValidationSummary,
} from "./DeploymentValidationTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "deployment-validation-runs.json",
);

export class DeploymentValidationService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly configuration: DeploymentConfigurationService,
    private readonly connectivity: DeploymentConnectivityService,
  ) {}

  async execute(): Promise<DeploymentValidationRun> {
    const configuration = this.configuration.buildSummary();
    const connectivity = await this.connectivity.buildSummary();
    const productionBlocked =
      configuration.productionBlocked ||
      connectivity.productionBlocked;
    const score = Math.round(
      configuration.score * 0.45 +
      connectivity.score * 0.55,
    );
    const status: DeploymentValidationStatus =
      productionBlocked
        ? "blocked"
        : score >= 90
          ? "approved"
          : "attention";

    const run: DeploymentValidationRun = {
      id: crypto.randomUUID(),
      status,
      score,
      productionBlocked,
      configurationScore: configuration.score,
      connectivityScore: connectivity.score,
      configured: configuration.configured,
      missing: configuration.missing,
      invalid: configuration.invalid,
      warnings: configuration.warnings,
      healthyProbes: connectivity.healthy,
      attentionProbes: connectivity.attention,
      criticalProbes: connectivity.critical,
      skippedProbes: connectivity.skipped,
      environment: configuration.environment,
      provider: configuration.provider,
      databaseMode: configuration.databaseMode,
      configuration,
      connectivity,
      createdAt: new Date().toISOString(),
    };

    if (this.mode === "json") {
      const runs = this.readJson();
      runs.unshift(run);
      this.writeJson(runs.slice(0, 1_000));
      return run;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_validation_runs")
      .insert(this.toRow(run))
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async list(limit = 100): Promise<DeploymentValidationRun[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("deployment_validation_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  buildSummary(
    runs: DeploymentValidationRun[],
  ): DeploymentValidationSummary {
    const approvedRuns = runs.filter(
      (run) => run.status === "approved",
    ).length;
    const attentionRuns = runs.filter(
      (run) => run.status === "attention",
    ).length;
    const blockedRuns = runs.filter(
      (run) => run.status === "blocked",
    ).length;
    const latestApproved = runs.find(
      (run) => run.status === "approved",
    );

    return {
      totalRuns: runs.length,
      approvedRuns,
      attentionRuns,
      blockedRuns,
      latest: runs[0],
      latestApprovedAt: latestApproved?.createdAt,
      readinessScore:
        runs.length === 0
          ? 35
          : Math.max(
              0,
              Math.min(
                100,
                (runs[0]?.score || 0) -
                  blockedRuns * 4 -
                  attentionRuns,
              ),
            ),
    };
  }

  private readJson(): DeploymentValidationRun[] {
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

  private writeJson(runs: DeploymentValidationRun[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(runs, null, 2),
      "utf-8",
    );
  }

  private toRow(run: DeploymentValidationRun) {
    return {
      id: run.id,
      status: run.status,
      score: run.score,
      production_blocked: run.productionBlocked,
      configuration_score: run.configurationScore,
      connectivity_score: run.connectivityScore,
      configured: run.configured,
      missing: run.missing,
      invalid: run.invalid,
      warnings: run.warnings,
      healthy_probes: run.healthyProbes,
      attention_probes: run.attentionProbes,
      critical_probes: run.criticalProbes,
      skipped_probes: run.skippedProbes,
      environment: run.environment,
      provider: run.provider,
      database_mode: run.databaseMode,
      configuration_json: run.configuration,
      connectivity_json: run.connectivity,
      created_at: run.createdAt,
    };
  }

  private fromRow(row: any): DeploymentValidationRun {
    return {
      id: row.id,
      status: row.status,
      score: Number(row.score || 0),
      productionBlocked: Boolean(row.production_blocked),
      configurationScore:
        Number(row.configuration_score || 0),
      connectivityScore:
        Number(row.connectivity_score || 0),
      configured: Number(row.configured || 0),
      missing: Number(row.missing || 0),
      invalid: Number(row.invalid || 0),
      warnings: Number(row.warnings || 0),
      healthyProbes: Number(row.healthy_probes || 0),
      attentionProbes: Number(row.attention_probes || 0),
      criticalProbes: Number(row.critical_probes || 0),
      skippedProbes: Number(row.skipped_probes || 0),
      environment: row.environment,
      provider: row.provider,
      databaseMode: row.database_mode,
      configuration: row.configuration_json,
      connectivity: row.connectivity_json,
      createdAt: row.created_at,
    };
  }
}
