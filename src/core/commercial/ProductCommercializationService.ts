import {
  BETA_MARKET_SERVICES,
  type BetaMarketServiceDefinition,
  type BetaMarketServiceStatus,
} from './CommercialRadarRegistry';

export type ProductCommercialPriority = 'alta' | 'média' | 'baixa';

export interface ProductCommercialClient {
  id: string;
  products: Array<{
    productId?: string;
    serviceId?: string;
    status: string;
  }>;
}

export interface ProductCommercialOpportunity {
  id: string;
  title?: string;
  object?: string;
  notes?: string;
  buyerName?: string;
  city?: string;
  state?: string;
}

export interface ProductCommercializationItem {
  service: BetaMarketServiceDefinition;
  interestedClients: number;
  contractedClients: number;
  relatedOpportunities: number;
  readinessScore: number;
  commercialStatus: 'não_pronto' | 'em_preparacao' | 'quase_vendavel' | 'vendavel';
  missingCriteria: string[];
  nextAction: string;
  taskTitle: string;
}

export interface ProductCommercializationSummary {
  totalProducts: number;
  sellableProducts: number;
  almostSellableProducts: number;
  productsInPreparation: number;
  productsNotReady: number;
  averageReadiness: number;
  interestedClients: number;
  contractedClients: number;
  relatedOpportunities: number;
  firstProductToSell?: ProductCommercializationItem;
  items: ProductCommercializationItem[];
}

const STATUS_WEIGHT: Record<BetaMarketServiceStatus, number> = {
  ready_to_audit: 34,
  mapped: 52,
  in_development: 68,
  sellable: 88,
};

export class ProductCommercializationService {
  static buildSummary(
    clients: ProductCommercialClient[],
    opportunities: ProductCommercialOpportunity[],
  ): ProductCommercializationSummary {
    const items = BETA_MARKET_SERVICES
      .map((service) => this.buildItem(service, clients, opportunities))
      .sort((a, b) => b.readinessScore - a.readinessScore);

    const averageReadiness = items.length > 0
      ? Math.round(items.reduce((total, item) => total + item.readinessScore, 0) / items.length)
      : 0;

    return {
      totalProducts: items.length,
      sellableProducts: items.filter((item) => item.commercialStatus === 'vendavel').length,
      almostSellableProducts: items.filter((item) => item.commercialStatus === 'quase_vendavel').length,
      productsInPreparation: items.filter((item) => item.commercialStatus === 'em_preparacao').length,
      productsNotReady: items.filter((item) => item.commercialStatus === 'não_pronto').length,
      averageReadiness,
      interestedClients: items.reduce((total, item) => total + item.interestedClients, 0),
      contractedClients: items.reduce((total, item) => total + item.contractedClients, 0),
      relatedOpportunities: items.reduce((total, item) => total + item.relatedOpportunities, 0),
      firstProductToSell: items.find((item) => item.commercialStatus !== 'vendavel') || items[0],
      items,
    };
  }

  private static buildItem(
    service: BetaMarketServiceDefinition,
    clients: ProductCommercialClient[],
    opportunities: ProductCommercialOpportunity[],
  ): ProductCommercializationItem {
    const interestedClients = clients.filter((client) =>
      client.products.some((product) =>
        product.productId === service.productId || product.serviceId === service.id
      )
    ).length;

    const contractedClients = clients.filter((client) =>
      client.products.some((product) =>
        (product.productId === service.productId || product.serviceId === service.id) &&
        ['contracted', 'implantation', 'active'].includes(product.status)
      )
    ).length;

    const relatedOpportunities = opportunities.filter((opportunity) =>
      this.matchesOpportunity(service, opportunity)
    ).length;

    const statusScore = STATUS_WEIGHT[service.status];
    const demandScore = Math.min(12, relatedOpportunities * 4);
    const interestScore = Math.min(8, interestedClients * 3);
    const contractScore = Math.min(12, contractedClients * 6);
    const buyerScore = service.targetBuyers.length >= 2 ? 4 : 2;
    const keywordScore = service.procurementKeywords.length >= 4 ? 4 : 2;
    const opportunityTypeScore = service.opportunityTypes.length >= 2 ? 4 : 2;

    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          statusScore +
          demandScore +
          interestScore +
          contractScore +
          buyerScore +
          keywordScore +
          opportunityTypeScore,
        ),
      ),
    );

    const commercialStatus = readinessScore >= 88
      ? 'vendavel'
      : readinessScore >= 72
        ? 'quase_vendavel'
        : readinessScore >= 52
          ? 'em_preparacao'
          : 'não_pronto';

    const missingCriteria = this.buildMissingCriteria({
      service,
      interestedClients,
      contractedClients,
      relatedOpportunities,
      readinessScore,
    });

    const nextAction = this.resolveNextAction(service, missingCriteria, commercialStatus);

    return {
      service,
      interestedClients,
      contractedClients,
      relatedOpportunities,
      readinessScore,
      commercialStatus,
      missingCriteria,
      nextAction,
      taskTitle: `[Produtos] ${service.shortName}: ${nextAction}`,
    };
  }

  private static matchesOpportunity(
    service: BetaMarketServiceDefinition,
    opportunity: ProductCommercialOpportunity,
  ): boolean {
    const text = [
      opportunity.title,
      opportunity.object,
      opportunity.notes,
      opportunity.buyerName,
      opportunity.city,
      opportunity.state,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return service.procurementKeywords.some((keyword) =>
      text.includes(keyword.toLowerCase())
    );
  }

  private static buildMissingCriteria(input: {
    service: BetaMarketServiceDefinition;
    interestedClients: number;
    contractedClients: number;
    relatedOpportunities: number;
    readinessScore: number;
  }): string[] {
    const missing: string[] = [];

    if (input.service.status === 'ready_to_audit') {
      missing.push('auditoria funcional e comercial');
    }

    if (input.service.status === 'mapped') {
      missing.push('consolidação funcional');
    }

    if (input.service.status === 'in_development') {
      missing.push('conclusão da implementação');
    }

    if (input.relatedOpportunities === 0) {
      missing.push('validação de demanda no Radar');
    }

    if (input.interestedClients === 0) {
      missing.push('cliente interessado ou piloto');
    }

    if (input.contractedClients === 0 && input.readinessScore >= 65) {
      missing.push('proposta ou contratação de referência');
    }

    if (input.service.targetBuyers.length < 2) {
      missing.push('segmentação de compradores');
    }

    if (input.service.procurementKeywords.length < 4) {
      missing.push('palavras-chave de contratação');
    }

    if (missing.length === 0 && input.readinessScore < 88) {
      missing.push('pacote comercial final');
    }

    return missing;
  }

  private static resolveNextAction(
    service: BetaMarketServiceDefinition,
    missingCriteria: string[],
    status: ProductCommercializationItem['commercialStatus'],
  ): string {
    if (status === 'vendavel') {
      return 'ativar oferta comercial e acompanhar oportunidades';
    }

    if (missingCriteria.length > 0) {
      return `resolver ${missingCriteria[0]}`;
    }

    return `consolidar comercialização de ${service.shortName}`;
  }
}
