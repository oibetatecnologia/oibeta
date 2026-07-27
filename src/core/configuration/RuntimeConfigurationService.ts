import { RUNTIME_CONFIGURATION_REGISTRY } from './RuntimeConfigurationRegistry';
import type {
  RuntimeConfigurationDefinition,
  RuntimeConfigurationIssue,
  RuntimeConfigurationItem,
  RuntimeConfigurationSummary,
} from './RuntimeConfigurationTypes';

type PublicRuntimeEnvironment = Record<string, string | boolean | undefined>;

export class RuntimeConfigurationService {
  static buildSummary(
    environment: PublicRuntimeEnvironment = import.meta.env as PublicRuntimeEnvironment,
  ): RuntimeConfigurationSummary {
    const items = RUNTIME_CONFIGURATION_REGISTRY.map((definition) =>
      this.buildItem(definition, environment),
    );

    const requiredItems = items.filter((item) => item.requiredForProduction);
    const requiredConfiguredVariables = requiredItems.filter(
      (item) => item.status === 'configured',
    ).length;
    const publicItems = items.filter((item) => item.scope === 'public_client');
    const publicConfigured = publicItems.filter(
      (item) => item.status === 'configured',
    ).length;

    const publicScore = publicItems.length > 0
      ? (publicConfigured / publicItems.length) * 100
      : 100;
    const contractScore = requiredItems.length > 0
      ? requiredItems.reduce((total, item) => {
          if (item.status === 'configured') return total + 100;
          if (item.status === 'backend_required') return total + 45;
          return total;
        }, 0) / requiredItems.length
      : 100;

    const score = Math.round(publicScore * 0.55 + contractScore * 0.45);
    const issues = this.buildIssues(items);

    return {
      score,
      totalVariables: items.length,
      configuredVariables: items.filter((item) => item.status === 'configured').length,
      missingVariables: items.filter((item) => item.status === 'missing').length,
      backendRequiredVariables: items.filter((item) => item.status === 'backend_required').length,
      requiredVariables: requiredItems.length,
      requiredConfiguredVariables,
      productionBlocked: requiredItems.some((item) => item.status === 'missing'),
      items,
      issues,
    };
  }

  private static buildItem(
    definition: RuntimeConfigurationDefinition,
    environment: PublicRuntimeEnvironment,
  ): RuntimeConfigurationItem {
    if (definition.scope === 'server_only') {
      return {
        ...definition,
        status: 'backend_required',
      };
    }

    const value = environment[definition.key];
    const normalizedValue = typeof value === 'string' ? value.trim() : '';

    return {
      ...definition,
      status: normalizedValue ? 'configured' : 'missing',
      maskedValue: normalizedValue ? this.maskValue(normalizedValue) : undefined,
    };
  }

  private static buildIssues(
    items: RuntimeConfigurationItem[],
  ): RuntimeConfigurationIssue[] {
    return items
      .filter((item) => item.status !== 'configured')
      .map((item): RuntimeConfigurationIssue => ({
        id: `runtime-config-${item.key.toLowerCase()}`,
        title: item.status === 'backend_required'
          ? `Validar ${item.label} no backend`
          : `Configurar ${item.label}`,
        description: item.status === 'backend_required'
          ? `${item.description} A variável é server-only e deve ser validada pelo backend/ambiente de deploy.`
          : `${item.description} Variável esperada: ${item.key}.`,
        priority: item.requiredForProduction ? 'alta' : 'média',
        targetTab: item.targetTab,
        taskTitle: item.status === 'backend_required'
          ? `[Configuração] Validar ${item.key} no backend`
          : `[Configuração] Definir ${item.key}`,
      }))
      .sort((a, b) => {
        const weight = { alta: 2, média: 1, baixa: 0 };
        return weight[b.priority] - weight[a.priority];
      });
  }

  private static maskValue(value: string): string {
    if (value.length <= 12) return 'configurado';

    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }
}
