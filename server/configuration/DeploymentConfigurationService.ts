import type {
  DeploymentConfigurationCheck,
  DeploymentConfigurationSummary,
} from "./DeploymentConfigurationTypes";

export class DeploymentConfigurationService {
  buildSummary(
    environment: NodeJS.ProcessEnv = process.env,
  ): DeploymentConfigurationSummary {
    const provider = environment.VERCEL
      ? "vercel"
      : environment.NODE_ENV
        ? "local"
        : "unknown";
    const runtimeEnvironment = this.resolveEnvironment(environment);
    const databaseMode = String(
      environment.DATABASE_MODE || "json",
    ).toLowerCase();

    const checks: DeploymentConfigurationCheck[] = [
      this.valueCheck({
        key: "DATABASE_MODE",
        label: "Modo de persistência",
        category: "database",
        requiredForProduction: true,
        value: environment.DATABASE_MODE,
        validate: (value) =>
          value === "supabase" || value === "json",
        invalidDescription:
          "Use DATABASE_MODE=supabase ou DATABASE_MODE=json.",
      }),
      this.valueCheck({
        key: "SUPABASE_URL",
        label: "URL do Supabase",
        category: "database",
        requiredForProduction: true,
        value: environment.SUPABASE_URL,
        validate: (value) => this.isHttpsUrl(value),
        invalidDescription:
          "A URL do Supabase deve ser uma URL HTTPS válida.",
      }),
      this.valueCheck({
        key: "SUPABASE_ANON_KEY",
        label: "Chave pública do Supabase",
        category: "database",
        requiredForProduction: true,
        value: environment.SUPABASE_ANON_KEY,
        validate: (value) => value.length >= 20,
        invalidDescription:
          "A chave pública informada parece incompleta.",
      }),
      this.valueCheck({
        key: "SUPABASE_SERVICE_ROLE_KEY",
        label: "Service Role do Supabase",
        category: "security",
        requiredForProduction: true,
        value: environment.SUPABASE_SERVICE_ROLE_KEY,
        validate: (value) => value.length >= 20,
        invalidDescription:
          "A Service Role informada parece incompleta.",
      }),
      this.valueCheck({
        key: "AI_ENCRYPTION_KEY",
        label: "Chave de criptografia da IA",
        category: "security",
        requiredForProduction: true,
        value: environment.AI_ENCRYPTION_KEY,
        validate: (value) => value.length >= 32,
        invalidDescription:
          "A chave deve possuir pelo menos 32 caracteres.",
      }),
      this.valueCheck({
        key: "VITE_APP_URL",
        label: "URL pública da aplicação",
        category: "application",
        requiredForProduction: true,
        value: environment.VITE_APP_URL,
        validate: (value) => this.isHttpsUrl(value),
        invalidDescription:
          "A URL pública deve ser HTTPS em produção.",
      }),
      this.valueCheck({
        key: "ALLOWED_ORIGINS",
        label: "Origens autorizadas",
        category: "security",
        requiredForProduction: true,
        value: environment.ALLOWED_ORIGINS,
        validate: (value) => {
          const origins = value.split(",").map((item) => item.trim());
          return origins.includes("https://www.oibeta.com.br") &&
            origins.includes("https://app.oibeta.com.br") &&
            !origins.includes("*");
        },
        invalidDescription:
          "Produção deve autorizar apenas www.oibeta.com.br e app.oibeta.com.br, sem wildcard.",
      }),
      this.valueCheck({
        key: "VITE_INSTITUTIONAL_URL",
        label: "URL institucional",
        category: "application",
        requiredForProduction: true,
        value: environment.VITE_INSTITUTIONAL_URL,
        validate: (value) => value === "https://www.oibeta.com.br",
        invalidDescription:
          "A URL institucional oficial deve ser https://www.oibeta.com.br.",
      }),
      this.valueCheck({
        key: "VERCEL_ENV",
        label: "Ambiente Vercel",
        category: "deployment",
        requiredForProduction: false,
        value: environment.VERCEL_ENV,
        validate: (value) =>
          ["development", "preview", "production"].includes(
            value,
          ),
        invalidDescription:
          "O ambiente deve ser development, preview ou production.",
      }),
      this.secretExposureCheck(environment),
      this.databaseProductionCheck(
        databaseMode,
        runtimeEnvironment,
      ),
    ];

    const configured = checks.filter(
      (check) => check.status === "configured",
    ).length;
    const missing = checks.filter(
      (check) => check.status === "missing",
    ).length;
    const invalid = checks.filter(
      (check) => check.status === "invalid",
    ).length;
    const warnings = checks.filter(
      (check) => check.status === "warning",
    ).length;
    const required = checks.filter(
      (check) => check.requiredForProduction,
    );
    const weighted = checks.reduce((total, check) => {
      if (check.status === "configured") return total + 100;
      if (check.status === "warning") return total + 55;
      return total;
    }, 0);
    const score = Math.round(weighted / Math.max(checks.length, 1));

    return {
      provider,
      environment: runtimeEnvironment,
      databaseMode,
      score,
      productionBlocked: required.some(
        (check) =>
          check.status === "missing" ||
          check.status === "invalid",
      ),
      configured,
      missing,
      invalid,
      warnings,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  private valueCheck(input: {
    key: string;
    label: string;
    category: DeploymentConfigurationCheck["category"];
    requiredForProduction: boolean;
    value?: string;
    validate: (value: string) => boolean;
    invalidDescription: string;
  }): DeploymentConfigurationCheck {
    const value = String(input.value || "").trim();

    if (!value) {
      return {
        key: input.key,
        label: input.label,
        category: input.category,
        requiredForProduction: input.requiredForProduction,
        status: input.requiredForProduction
          ? "missing"
          : "warning",
        description: input.requiredForProduction
          ? "Variável obrigatória ainda não configurada."
          : "Variável opcional não configurada neste ambiente.",
      };
    }

    if (!input.validate(value)) {
      return {
        key: input.key,
        label: input.label,
        category: input.category,
        requiredForProduction: input.requiredForProduction,
        status: "invalid",
        description: input.invalidDescription,
        maskedValue: this.mask(value),
      };
    }

    return {
      key: input.key,
      label: input.label,
      category: input.category,
      requiredForProduction: input.requiredForProduction,
      status: "configured",
      description: "Configuração presente e estruturalmente válida.",
      maskedValue: this.mask(value),
    };
  }

  private secretExposureCheck(
    environment: NodeJS.ProcessEnv,
  ): DeploymentConfigurationCheck {
    const dangerous = [
      "VITE_SUPABASE_SERVICE_ROLE_KEY",
      "VITE_AI_ENCRYPTION_KEY",
      "VITE_R2_SECRET_ACCESS_KEY",
    ].filter((key) => Boolean(environment[key]));

    return {
      key: "PUBLIC_SECRET_EXPOSURE",
      label: "Exposição de segredos no bundle",
      category: "security",
      requiredForProduction: true,
      status: dangerous.length > 0 ? "invalid" : "configured",
      description:
        dangerous.length > 0
          ? `Segredos encontrados com prefixo VITE_: ${dangerous.join(
              ", ",
            )}.`
          : "Nenhum segredo conhecido foi encontrado com prefixo público VITE_.",
    };
  }

  private databaseProductionCheck(
    databaseMode: string,
    runtimeEnvironment: DeploymentConfigurationSummary["environment"],
  ): DeploymentConfigurationCheck {
    const production = runtimeEnvironment === "production";
    const valid = !production || databaseMode === "supabase";

    return {
      key: "PRODUCTION_DATABASE_MODE",
      label: "Persistência de produção",
      category: "database",
      requiredForProduction: true,
      status: valid ? "configured" : "invalid",
      description: valid
        ? production
          ? "Produção configurada para persistência Supabase."
          : "A regra de persistência será exigida quando o ambiente for produção."
        : "Produção não pode operar com persistência JSON local.",
    };
  }

  private resolveEnvironment(
    environment: NodeJS.ProcessEnv,
  ): DeploymentConfigurationSummary["environment"] {
    const value = String(
      environment.VERCEL_ENV || environment.NODE_ENV || "",
    ).toLowerCase();

    if (value === "production") return "production";
    if (value === "preview") return "preview";
    if (value === "development") return "development";
    return "unknown";
  }

  private isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }

  private mask(value: string): string {
    if (value.length <= 12) return "configurado";
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }
}
