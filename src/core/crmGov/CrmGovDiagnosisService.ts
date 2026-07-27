import { BETA_MARKET_SERVICES, type BetaMarketServiceDefinition } from '../commercial/CommercialRadarRegistry';
import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';

export interface CrmGovDiagnosisResult {
  digitalizationIndex: number;
  commercialReadiness: number;
  relationshipHealth: number;
  recommendedProducts: BetaMarketServiceDefinition[];
  missingCapabilities: string[];
  riskAlerts: string[];
  nextSteps: string[];
}

/**
 * CrmGovDiagnosisService
 * Diagnóstico comercial inicial do órgão público.
 *
 * Não usa IA externa nesta fase. O objetivo é deixar o fluxo rápido,
 * determinístico e pronto para ser refinado pela Beta IA depois.
 */
export class CrmGovDiagnosisService {
  static analyzeClient(
    client: ClientsWorkspaceClient,
    suggestedProducts: BetaMarketServiceDefinition[] = [],
  ): CrmGovDiagnosisResult {
    const contractedProducts = client.products.filter((product) => product.status === 'contracted').length;
    const interestedProducts = client.products.filter((product) => product.status === 'interested' || product.status === 'proposal').length;
    const opportunities = client.opportunities.length;
    const contacts = client.contacts.length;
    const proposals = client.proposals.length;
    const timeline = client.timeline.length;
    const hasNextAction = Boolean(client.nextAction?.title);

    const digitalizationIndex = clamp(
      18 + contractedProducts * 14 + interestedProducts * 7 + opportunities * 5 + proposals * 6,
    );

    const commercialReadiness = clamp(
      12 + contacts * 10 + opportunities * 10 + proposals * 12 + (hasNextAction ? 16 : 0),
    );

    const relationshipHealth = clamp(
      20 + contacts * 12 + timeline * 4 + (hasNextAction ? 14 : 0) + proposals * 8,
    );

    return {
      digitalizationIndex,
      commercialReadiness,
      relationshipHealth,
      recommendedProducts: suggestedProducts.slice(0, 4),
      missingCapabilities: this.resolveMissingCapabilities(client),
      riskAlerts: this.resolveRiskAlerts(client),
      nextSteps: this.resolveNextSteps(client, suggestedProducts),
    };
  }

  static getDefaultSuggestedProducts(client: ClientsWorkspaceClient): BetaMarketServiceDefinition[] {
    const linkedServiceIds = new Set(client.products.map((product) => product.serviceId));

    return BETA_MARKET_SERVICES.filter((service) => !linkedServiceIds.has(service.id)).slice(0, 4);
  }

  private static resolveMissingCapabilities(client: ClientsWorkspaceClient): string[] {
    const linkedNames = client.products.map((product) => product.shortName.toLowerCase());
    const missing: string[] = [];

    if (!linkedNames.some((name) => name.includes('transparência'))) {
      missing.push('Portal da Transparência / LAI');
    }

    if (!linkedNames.some((name) => name.includes('zero papel'))) {
      missing.push('Protocolo Digital / Zero Papel');
    }

    if (!linkedNames.some((name) => name.includes('contratos'))) {
      missing.push('Gestão de Contratos e ARP');
    }

    if (!linkedNames.some((name) => name.includes('bi'))) {
      missing.push('BI Executivo e Indicadores');
    }

    return missing.slice(0, 5);
  }

  private static resolveRiskAlerts(client: ClientsWorkspaceClient): string[] {
    const alerts: string[] = [];

    if (client.contacts.length === 0) {
      alerts.push('Nenhum contato estratégico cadastrado.');
    }

    if (!client.nextAction?.title) {
      alerts.push('Nenhuma próxima ação definida.');
    }

    if (client.opportunities.length > 0 && client.proposals.length === 0) {
      alerts.push('Há oportunidades vinculadas sem proposta registrada.');
    }

    if (client.timeline.length === 0) {
      alerts.push('Histórico comercial ainda não possui interações registradas.');
    }

    return alerts;
  }

  private static resolveNextSteps(
    client: ClientsWorkspaceClient,
    suggestedProducts: BetaMarketServiceDefinition[],
  ): string[] {
    const steps: string[] = [];

    if (client.contacts.length === 0) {
      steps.push('Cadastrar comprador, TI, gabinete ou secretário responsável.');
    }

    if (!client.nextAction?.title) {
      steps.push('Definir uma próxima ação com prazo.');
    }

    if (suggestedProducts.length > 0) {
      steps.push(`Avaliar oferta inicial de ${suggestedProducts[0].shortName}.`);
    }

    if (client.opportunities.length > 0 && client.proposals.length === 0) {
      steps.push('Converter oportunidade vinculada em proposta comercial.');
    }

    if (steps.length === 0) {
      steps.push('Manter acompanhamento e atualizar a timeline após cada interação.');
    }

    return steps;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
