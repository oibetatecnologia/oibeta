import type { DeploymentConfigurationService } from "./DeploymentConfigurationService";
import type {
  DeploymentConnectivityCheck,
  DeploymentConnectivitySummary,
} from "./DeploymentConnectivityTypes";

const PROBE_TIMEOUT_MS = 5_000;

export class DeploymentConnectivityService {
  constructor(
    private readonly configuration: DeploymentConfigurationService,
  ) {}

  async buildSummary(
    environment: NodeJS.ProcessEnv = process.env,
  ): Promise<DeploymentConnectivitySummary> {
    const configuration = this.configuration.buildSummary(environment);
    const checks: DeploymentConnectivityCheck[] = [];

    checks.push({
      id: "deployment-configuration",
      label: "Configuração estrutural",
      target: "backend",
      status: configuration.productionBlocked
        ? "critical"
        : configuration.score < 85
          ? "attention"
          : "healthy",
      durationMs: 0,
      description: configuration.productionBlocked
        ? "Existem configurações obrigatórias ausentes ou inválidas."
        : `Configuração estrutural com score de ${configuration.score}%.`,
    });

    if (configuration.databaseMode !== "supabase") {
      checks.push(this.skipped(
        "supabase-rest",
        "Supabase Data API",
        "supabase",
        "A conectividade Supabase não se aplica enquanto DATABASE_MODE não estiver em supabase.",
      ));
      checks.push(this.skipped(
        "supabase-auth",
        "Supabase Auth",
        "supabase",
        "A conectividade do Auth não se aplica ao modo JSON local.",
      ));
    } else {
      const url = String(environment.SUPABASE_URL || "").replace(/\/$/, "");
      const key = String(
        environment.SUPABASE_SERVICE_ROLE_KEY ||
          environment.SUPABASE_ANON_KEY ||
          "",
      );

      checks.push(await this.probe({
        id: "supabase-rest",
        label: "Supabase Data API",
        target: "supabase",
        url: `${url}/rest/v1/`,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }));
      checks.push(await this.probe({
        id: "supabase-auth",
        label: "Supabase Auth",
        target: "supabase",
        url: `${url}/auth/v1/health`,
        headers: { apikey: key },
      }));
    }

    const vercelConfigured = Boolean(environment.VERCEL);
    const vercelUrl = String(environment.VERCEL_URL || "").trim();
    checks.push({
      id: "vercel-runtime",
      label: "Runtime Vercel",
      target: "vercel",
      status: vercelConfigured
        ? vercelUrl
          ? "healthy"
          : "attention"
        : configuration.environment === "production"
          ? "attention"
          : "skipped",
      durationMs: 0,
      description: vercelConfigured
        ? vercelUrl
          ? `Runtime Vercel identificado em ${this.maskHost(vercelUrl)}.`
          : "Runtime Vercel identificado, mas VERCEL_URL não foi disponibilizada."
        : "A aplicação não está executando no runtime Vercel neste ambiente.",
    });

    const activeChecks = checks.filter((check) => check.status !== "skipped");
    const weighted = activeChecks.reduce((total, check) => {
      if (check.status === "healthy") return total + 100;
      if (check.status === "attention") return total + 55;
      return total;
    }, 0);
    const score = Math.round(
      weighted / Math.max(activeChecks.length, 1),
    );
    const critical = checks.filter((check) => check.status === "critical").length;
    const attention = checks.filter((check) => check.status === "attention").length;

    return {
      status: critical > 0
        ? "critical"
        : attention > 0
          ? "attention"
          : "healthy",
      score,
      productionBlocked:
        configuration.productionBlocked || critical > 0,
      healthy: checks.filter((check) => check.status === "healthy").length,
      attention,
      critical,
      skipped: checks.filter((check) => check.status === "skipped").length,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  private async probe(input: {
    id: string;
    label: string;
    target: string;
    url: string;
    headers: Record<string, string>;
  }): Promise<DeploymentConnectivityCheck> {
    if (!input.url.startsWith("https://") || !input.headers.apikey) {
      return {
        id: input.id,
        label: input.label,
        target: input.target,
        status: "critical",
        durationMs: 0,
        description: "A URL HTTPS ou a chave de acesso não está configurada.",
      };
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const response = await fetch(input.url, {
        method: "GET",
        headers: input.headers,
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;

      return {
        id: input.id,
        label: input.label,
        target: input.target,
        status: response.ok
          ? durationMs > 2_000
            ? "attention"
            : "healthy"
          : "critical",
        durationMs,
        httpStatus: response.status,
        description: response.ok
          ? `Conectividade confirmada em ${durationMs} ms.`
          : `O serviço respondeu com HTTP ${response.status}.`,
      };
    } catch (error) {
      return {
        id: input.id,
        label: input.label,
        target: input.target,
        status: "critical",
        durationMs: Date.now() - startedAt,
        description:
          error instanceof Error
            ? error.name === "AbortError"
              ? `Tempo limite de ${PROBE_TIMEOUT_MS} ms excedido.`
              : error.message
            : String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private skipped(
    id: string,
    label: string,
    target: string,
    description: string,
  ): DeploymentConnectivityCheck {
    return {
      id,
      label,
      target,
      status: "skipped",
      durationMs: 0,
      description,
    };
  }

  private maskHost(value: string): string {
    const host = value.replace(/^https?:\/\//, "").split("/")[0];
    if (host.length <= 18) return host;
    return `${host.slice(0, 10)}…${host.slice(-6)}`;
  }
}
