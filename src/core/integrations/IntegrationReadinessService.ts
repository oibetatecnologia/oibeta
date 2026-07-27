import { RuntimeConfigurationService } from '../configuration/RuntimeConfigurationService';
import { INTEGRATION_PROVIDERS } from './IntegrationRegistry';
import type {
  IntegrationHealthSignal,
  IntegrationProviderDefinition,
  IntegrationReadinessSummary,
  IntegrationStatus,
} from './IntegrationTypes';

const STATUS_WEIGHT: Record<IntegrationStatus, number> = {
  ready: 100,
  attention: 65,
  pending: 35,
  offline: 0,
};

export class IntegrationReadinessService {
  static listProviders(): IntegrationProviderDefinition[] {
    const runtimeConfiguration = RuntimeConfigurationService.buildSummary();

    return INTEGRATION_PROVIDERS.map((provider) => {
      const baseUrl = runtimeConfiguration.items.find(
        (item) => item.key === provider.baseUrlEnv,
      );
      const credential = provider.apiKeyEnv
        ? runtimeConfiguration.items.find((item) => item.key === provider.apiKeyEnv)
        : undefined;

      const status: IntegrationStatus =
        baseUrl?.status === 'configured'
          ? credential?.status === 'missing'
            ? 'attention'
            : 'ready'
          : provider.status === 'offline'
            ? 'offline'
            : 'pending';

      return {
        ...provider,
        status,
      };
    });
  }

  static buildSummary(): IntegrationReadinessSummary {
    const providers = this.listProviders();
    const healthSignals = providers.flatMap((provider) => this.buildProviderSignals(provider));
    const readinessScore = Math.round(
      providers.reduce((total, provider) => total + STATUS_WEIGHT[provider.status], 0) /
        Math.max(providers.length, 1),
    );

    return {
      totalProviders: providers.length,
      readyProviders: providers.filter((provider) => provider.status === 'ready').length,
      attentionProviders: providers.filter((provider) => provider.status === 'attention').length,
      pendingProviders: providers.filter((provider) => provider.status === 'pending').length,
      offlineProviders: providers.filter((provider) => provider.status === 'offline').length,
      readinessScore,
      healthSignals,
    };
  }

  private static buildProviderSignals(provider: IntegrationProviderDefinition): IntegrationHealthSignal[] {
    const missingRequiredEndpoints = provider.endpoints.filter((endpoint) => endpoint.required).length;
    const priority = provider.status === 'offline'
      ? 'alta'
      : provider.status === 'pending' || provider.status === 'attention'
        ? 'média'
        : 'baixa';

    if (provider.status === 'ready') {
      return [
        {
          id: `${provider.id}-ready`,
          providerId: provider.id,
          title: `${provider.name} operacional`,
          description: `${provider.name} possui configuração inicial registrada para ${provider.targetModule}.`,
          status: 'ready',
          priority: 'baixa',
          targetTab: this.resolveTargetTab(provider.targetModule),
          taskTitle: `[Integrações] Validar operação contínua de ${provider.name}`,
        },
      ];
    }

    return [
      {
        id: `${provider.id}-setup`,
        providerId: provider.id,
        title: `Configurar ${provider.name}`,
        description: `${provider.description} Variável principal esperada: ${provider.baseUrlEnv}. Endpoints obrigatórios: ${missingRequiredEndpoints}.`,
        status: provider.status,
        priority,
        targetTab: this.resolveTargetTab(provider.targetModule),
        taskTitle: `[Integrações] Configurar ${provider.name} para ${provider.targetModule}`,
      },
    ];
  }

  private static resolveTargetTab(moduleName: string): string {
    if (moduleName.includes('Radar')) return 'commercial_radar';
    if (moduleName.includes('Beta')) return 'beta_brain';
    if (moduleName.includes('Ambientes')) return 'client_environments';

    return 'platform_monitoring';
  }
}
