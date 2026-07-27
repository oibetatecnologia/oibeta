import { HttpRepositoryClient } from './HttpRepositoryClient';
import { PersistenceFallbackPolicyService } from './PersistenceFallbackPolicyService';
import {
  RepositoryHealthService,
  type RepositoryHealthSignal,
} from './RepositoryHealthService';
import type { TenantPersistenceContext } from './TenantPersistence';
import type {
  PersistenceBackendHealth,
  PersistenceHealthIssue,
  PersistenceHealthStatus,
  PersistenceHealthSummary,
  PersistenceSchemaHealth,
} from './PersistenceHealthTypes';

const HEALTH_ENDPOINT = '/api/persistence/health';
const SCHEMA_HEALTH_ENDPOINT = '/api/persistence/schema-health';

const UNKNOWN_BACKEND: PersistenceBackendHealth = {
  mode: 'unknown',
  adapter: 'Desconhecido',
  configured: false,
  supabaseUrlConfigured: false,
  supabaseKeyConfigured: false,
  serviceRoleConfigured: false,
  checkedAt: '',
};

const UNKNOWN_SCHEMA: PersistenceSchemaHealth = {
  mode: 'unknown',
  checkedAt: '',
  tables: [],
};

export class PersistenceHealthService {
  static async loadSummary(
    context?: Partial<TenantPersistenceContext>,
  ): Promise<PersistenceHealthSummary> {
    const [backend, schema] = await Promise.all([
      this.loadBackendHealth(context),
      this.loadSchemaHealth(context),
    ]);

    return this.buildSummary(
      backend,
      schema,
      RepositoryHealthService.listSignals(),
    );
  }

  static buildSummary(
    backend: PersistenceBackendHealth,
    schema: PersistenceSchemaHealth,
    repositories: RepositoryHealthSignal[],
  ): PersistenceHealthSummary {
    const fallbackPolicy = PersistenceFallbackPolicyService.getPolicy();
    const apiRepositories = repositories.filter(
      (repository) => repository.status === 'api',
    ).length;
    const fallbackRepositories = repositories.filter(
      (repository) => repository.status === 'fallback',
    ).length;
    const errorRepositories = repositories.filter(
      (repository) => repository.status === 'error',
    ).length;
    const unknownRepositories = repositories.filter(
      (repository) => repository.status === 'unknown',
    ).length;

    const requiredTables = schema.tables.filter(
      (table) => table.requiredForProduction,
    ).length;
    const readyTables = schema.tables.filter(
      (table) => table.status === 'ready',
    ).length;
    const missingTables = schema.tables.filter(
      (table) => table.status === 'missing_or_inaccessible',
    ).length;
    const schemaReadinessScore =
      schema.mode === 'json'
        ? 55
        : requiredTables > 0
          ? Math.round(
              (
                schema.tables.filter(
                  (table) =>
                    table.requiredForProduction &&
                    table.status === 'ready',
                ).length /
                requiredTables
              ) *
                100,
            )
          : schema.mode === 'supabase'
            ? 0
            : 20;

    const repositoryScore = RepositoryHealthService.getReadinessScore();
    const backendScore =
      backend.mode === 'supabase'
        ? backend.configured
          ? backend.serviceRoleConfigured
            ? 100
            : 82
          : 30
        : backend.mode === 'json'
          ? 58
          : 20;

    const score = Math.round(
      repositoryScore * 0.4 +
        backendScore * 0.3 +
        schemaReadinessScore * 0.3,
    );

    const issues = this.buildIssues({
      backend,
      schema,
      repositories,
      fallbackRepositories,
      errorRepositories,
      unknownRepositories,
      missingTables,
      fallbackPolicy,
    });

    return {
      score,
      status: this.resolveStatus(score, issues),
      backend,
      schema,
      fallbackPolicy,
      repositories,
      apiRepositories,
      fallbackRepositories,
      errorRepositories,
      unknownRepositories,
      readyTables,
      missingTables,
      requiredTables,
      schemaReadinessScore,
      issues,
    };
  }

  private static async loadBackendHealth(
    context?: Partial<TenantPersistenceContext>,
  ): Promise<PersistenceBackendHealth> {
    try {
      return await HttpRepositoryClient.get<PersistenceBackendHealth>(
        HEALTH_ENDPOINT,
        context,
      );
    } catch {
      return {
        ...UNKNOWN_BACKEND,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private static async loadSchemaHealth(
    context?: Partial<TenantPersistenceContext>,
  ): Promise<PersistenceSchemaHealth> {
    try {
      return await HttpRepositoryClient.get<PersistenceSchemaHealth>(
        SCHEMA_HEALTH_ENDPOINT,
        context,
      );
    } catch {
      return {
        ...UNKNOWN_SCHEMA,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private static buildIssues(input: {
    backend: PersistenceBackendHealth;
    schema: PersistenceSchemaHealth;
    repositories: RepositoryHealthSignal[];
    fallbackRepositories: number;
    errorRepositories: number;
    unknownRepositories: number;
    missingTables: number;
    fallbackPolicy: ReturnType<typeof PersistenceFallbackPolicyService.getPolicy>;
  }): PersistenceHealthIssue[] {
    const issues: PersistenceHealthIssue[] = [];

    if (input.backend.mode === 'unknown') {
      issues.push({
        id: 'persistence-backend-unreachable',
        title: 'Healthcheck de persistência indisponível',
        description:
          'O frontend não conseguiu consultar o estado do backend de persistência.',
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle: '[Persistência] Restaurar healthcheck do backend',
      });
    }

    if (input.backend.mode === 'json') {
      issues.push({
        id: 'persistence-json-mode',
        title: 'Backend ainda opera em modo JSON',
        description:
          'O modo JSON é adequado para desenvolvimento, mas não é a persistência definitiva de produção.',
        priority: 'média',
        targetTab: 'client_environments',
        taskTitle: '[Persistência] Migrar DATABASE_MODE para Supabase',
      });
    }

    if (
      input.backend.mode === 'supabase' &&
      !input.backend.configured
    ) {
      issues.push({
        id: 'persistence-supabase-config',
        title: 'Supabase sem configuração completa',
        description:
          'O backend está em modo Supabase, mas URL ou chave de acesso não estão configuradas.',
        priority: 'alta',
        targetTab: 'client_environments',
        taskTitle:
          '[Persistência] Configurar credenciais server-only do Supabase',
      });
    }

    if (
      input.schema.mode === 'supabase' &&
      input.missingTables > 0
    ) {
      issues.push({
        id: 'persistence-schema-incomplete',
        title: 'Schema Supabase incompleto ou inacessível',
        description: `${input.missingTables} tabela(s) obrigatória(s) não puderam ser validadas.`,
        priority: 'alta',
        targetTab: 'client_environments',
        taskTitle:
          '[Persistência] Aplicar migrations e validar permissões das tabelas',
      });
    }

    input.schema.tables
      .filter((table) => table.status === 'missing_or_inaccessible')
      .forEach((table) => {
        issues.push({
          id: `persistence-table-${table.table}`,
          title: `Validar tabela ${table.label}`,
          description: table.error
            ? `${table.table}: ${table.error}`
            : `A tabela ${table.table} não está acessível.`,
          priority: table.requiredForProduction ? 'alta' : 'média',
          targetTab: 'client_environments',
          taskTitle: `[Persistência] Aplicar ${table.migrationFile}`,
        });
      });

    if (!input.fallbackPolicy.productionSafe) {
      issues.push({
        id: 'persistence-fallback-production-unsafe',
        title: 'Fallback local habilitado em produção',
        description: input.fallbackPolicy.description,
        priority: 'alta',
        targetTab: 'client_environments',
        taskTitle: '[Persistência] Desabilitar fallback local no cutover de produção',
      });
    }

    if (input.errorRepositories > 0) {
      issues.push({
        id: 'persistence-repositories-error',
        title: 'Repositórios bloqueados sem fallback',
        description: `${input.errorRepositories} repositório(s) falharam e não utilizaram persistência local.`,
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle: '[Persistência] Restaurar APIs antes do cutover sem fallback',
      });
    }

    if (input.fallbackRepositories > 0) {
      issues.push({
        id: 'persistence-fallback-active',
        title: 'Repositórios usando fallback local',
        description: `${input.fallbackRepositories} repositório(s) estão usando persistência local temporária.`,
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle:
          '[Persistência] Restaurar APIs dos repositórios em fallback',
      });
    }

    if (input.unknownRepositories > 0) {
      issues.push({
        id: 'persistence-repositories-unverified',
        title: 'Repositórios ainda não verificados',
        description: `${input.unknownRepositories} repositório(s) ainda não executaram leitura nesta sessão.`,
        priority: 'média',
        targetTab: 'platform_monitoring',
        taskTitle: '[Persistência] Validar repositórios tenant-aware',
      });
    }

    input.repositories
      .filter(
        (repository) =>
          ['fallback', 'error'].includes(repository.status) &&
          repository.lastError,
      )
      .slice(0, 3)
      .forEach((repository) => {
        issues.push({
          id: `persistence-error-${repository.id}`,
          title: `Falha em ${repository.label}`,
          description:
            repository.lastError || repository.description,
          priority: 'média',
          targetTab: 'platform_monitoring',
          taskTitle: `[Persistência] Corrigir ${repository.label}`,
        });
      });

    return issues;
  }

  private static resolveStatus(
    score: number,
    issues: PersistenceHealthIssue[],
  ): PersistenceHealthStatus {
    if (
      issues.some((issue) => issue.priority === 'alta') ||
      score < 45
    ) {
      return 'critical';
    }

    if (issues.length > 0 || score < 80) {
      return 'attention';
    }

    return 'healthy';
  }
}
