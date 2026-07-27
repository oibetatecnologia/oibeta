import type { ProductCommercializationSummary } from '../commercial/ProductCommercializationService';
import type { ProductPortfolioAction, ProductPortfolioItem, ProductPortfolioRisk, ProductPortfolioSummary } from './ProductPortfolioTypes';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export class ProductPortfolioIntelligenceService {
  static build(summary: ProductCommercializationSummary): ProductPortfolioSummary {
    const rawItems = summary.items.map((item) => this.buildItem(item));
    const ordered = [...rawItems].sort((a, b) => b.portfolioScore - a.portfolioScore);
    const items = ordered.map((item, index) => ({ ...item, strategicRank: index + 1 }));
    const productsWithDemand = items.filter((item) => item.relatedOpportunities > 0).length;
    const productsWithoutTraction = items.filter((item) => item.relatedOpportunities === 0 && item.contractedClients === 0).length;
    const productsAtRisk = items.filter((item) => item.risk !== 'saudável').length;
    const totalDemandSignals = items.reduce((total, item) => total + item.relatedOpportunities, 0);
    const totalContracts = items.reduce((total, item) => total + item.contractedClients, 0);
    const dominantDemand = items[0]?.relatedOpportunities || 0;
    const concentrationRisk = totalDemandSignals > 0 ? clamp((dominantDemand / totalDemandSignals) * 100) : 0;
    const marketCoverage = items.length > 0 ? clamp((productsWithDemand / items.length) * 100) : 0;
    const healthScore = items.length > 0
      ? clamp(items.reduce((total, item) => total + item.portfolioScore, 0) / items.length - productsWithoutTraction * 2)
      : 0;

    return {
      healthScore,
      health: this.resolveRisk(healthScore),
      averageReadiness: summary.averageReadiness,
      marketCoverage,
      activeProducts: summary.sellableProducts + summary.almostSellableProducts,
      productsAtRisk,
      productsWithDemand,
      productsWithoutTraction,
      totalDemandSignals,
      totalContracts,
      concentrationRisk,
      items,
      actions: this.buildActions(items),
    };
  }

  private static buildItem(item: ProductCommercializationSummary['items'][number]): ProductPortfolioItem {
    const demandScore = clamp(item.relatedOpportunities * 12);
    const tractionScore = clamp(item.contractedClients * 28 + item.interestedClients * 10);
    const deliveryGap = clamp(100 - item.readinessScore);
    const portfolioScore = clamp(item.readinessScore * 0.5 + demandScore * 0.3 + tractionScore * 0.2);
    const risk = this.resolveRisk(portfolioScore);

    let recommendation = item.nextAction;
    if (item.relatedOpportunities > 0 && item.readinessScore < 72) recommendation = 'acelerar conclusão para capturar demanda já identificada';
    if (item.readinessScore >= 72 && item.contractedClients === 0) recommendation = 'criar oferta de entrada e buscar cliente de referência';
    if (item.relatedOpportunities === 0) recommendation = 'revalidar posicionamento, compradores e palavras-chave no Radar';
    if (item.commercialStatus === 'vendavel' && item.contractedClients > 0) recommendation = 'escalar vendas, implantação e prova de valor';

    return { ...item, demandScore, tractionScore, deliveryGap, portfolioScore, risk, strategicRank: 0, recommendation };
  }

  private static buildActions(items: ProductPortfolioItem[]): ProductPortfolioAction[] {
    const actions: ProductPortfolioAction[] = [];
    for (const item of items) {
      if (item.relatedOpportunities > 0 && item.readinessScore < 72) {
        actions.push({ id: `accelerate-${item.service.id}`, productId: item.service.id, productName: item.service.shortName, title: `Acelerar ${item.service.shortName}`, description: `${item.relatedOpportunities} oportunidade(s) já indicam demanda, mas o produto ainda está com ${item.readinessScore}% de prontidão.`, priority: 'crítica', taskTitle: `[Portfólio] Acelerar ${item.service.shortName} para capturar demanda`, area: 'produto' });
      } else if (item.readinessScore >= 72 && item.contractedClients === 0) {
        actions.push({ id: `reference-${item.service.id}`, productId: item.service.id, productName: item.service.shortName, title: `Conquistar cliente de referência`, description: 'O produto está próximo da venda, mas ainda não possui contratação ativa.', priority: 'alta', taskTitle: `[Portfólio] Conquistar cliente de referência para ${item.service.shortName}`, area: 'comercial' });
      } else if (item.relatedOpportunities === 0) {
        actions.push({ id: `validate-${item.service.id}`, productId: item.service.id, productName: item.service.shortName, title: `Revalidar demanda`, description: 'Nenhuma oportunidade foi associada ao produto no Radar Comercial.', priority: 'média', taskTitle: `[Portfólio] Revalidar demanda e posicionamento de ${item.service.shortName}`, area: 'governança' });
      }
    }
    const weight = { crítica: 4, alta: 3, média: 2, baixa: 1 } as const;
    return actions.sort((a, b) => weight[b.priority] - weight[a.priority]).slice(0, 8);
  }

  private static resolveRisk(score: number): ProductPortfolioRisk {
    if (score >= 72) return 'saudável';
    if (score >= 50) return 'atenção';
    return 'crítico';
  }
}
