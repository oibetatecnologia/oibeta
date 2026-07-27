import type { BetaMarketServiceDefinition } from '../commercial/CommercialRadarRegistry';

export interface CrmGovProposalItem {
  serviceId: string;
  productId: string;
  name: string;
  setupValue: number;
  monthlyValue: number;
  description: string;
}

export interface CrmGovGeneratedProposal {
  title: string;
  estimatedValue: number;
  monthlyValue: number;
  setupValue: number;
  implementationDays: number;
  items: CrmGovProposalItem[];
  notes: string;
}

/**
 * CrmGovProposalService
 *
 * Gera uma proposta comercial inicial a partir dos produtos vinculados ao órgão.
 * Nesta fase não gera PDF/contrato e não consulta API externa.
 */
export class CrmGovProposalService {
  static generateFromProducts(clientName: string, products: BetaMarketServiceDefinition[]): CrmGovGeneratedProposal {
    const selectedProducts = products.slice(0, 6);
    const items = selectedProducts.map((product) => this.buildItem(product));

    const setupValue = items.reduce((sum, item) => sum + item.setupValue, 0);
    const monthlyValue = items.reduce((sum, item) => sum + item.monthlyValue, 0);
    const implementationDays = Math.max(30, Math.min(120, 20 + items.length * 15));

    return {
      title: `Proposta Comercial — ${clientName}`,
      setupValue,
      monthlyValue,
      estimatedValue: setupValue + monthlyValue * 12,
      implementationDays,
      items,
      notes: this.buildNotes(items.length, implementationDays),
    };
  }

  private static buildItem(product: BetaMarketServiceDefinition): CrmGovProposalItem {
    const baseMonthlyValue = product.status === 'sellable' ? 2500 : product.status === 'mapped' ? 1800 : 1200;
    const complexityFactor = product.procurementKeywords.length >= 6 ? 1.25 : 1;

    const monthlyValue = Math.round(baseMonthlyValue * complexityFactor);
    const setupValue = Math.round(monthlyValue * 2.5);

    return {
      serviceId: product.id,
      productId: product.productId,
      name: product.shortName,
      setupValue,
      monthlyValue,
      description: product.commercialName,
    };
  }

  private static buildNotes(itemsCount: number, implementationDays: number): string {
    if (itemsCount === 0) {
      return 'Proposta inicial sem produtos selecionados. Vincule produtos sugeridos ou contratados antes de gerar proposta.';
    }

    return `Proposta inicial gerada pela Beta com ${itemsCount} serviço(s), implantação estimada em ${implementationDays} dias e valores referenciais para validação comercial.`;
  }
}
