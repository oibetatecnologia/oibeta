import type { ProductCommercializationItem } from '../commercial/ProductCommercializationService';

export type ProductPortfolioRisk = 'saudável' | 'atenção' | 'crítico';
export type ProductPortfolioPriority = 'baixa' | 'média' | 'alta' | 'crítica';

export interface ProductPortfolioItem extends ProductCommercializationItem {
  demandScore: number;
  tractionScore: number;
  deliveryGap: number;
  portfolioScore: number;
  risk: ProductPortfolioRisk;
  strategicRank: number;
  recommendation: string;
}

export interface ProductPortfolioAction {
  id: string;
  productId: string;
  productName: string;
  title: string;
  description: string;
  priority: ProductPortfolioPriority;
  taskTitle: string;
  area: 'produto' | 'comercial' | 'implantação' | 'governança';
}

export interface ProductPortfolioSummary {
  healthScore: number;
  health: ProductPortfolioRisk;
  averageReadiness: number;
  marketCoverage: number;
  activeProducts: number;
  productsAtRisk: number;
  productsWithDemand: number;
  productsWithoutTraction: number;
  totalDemandSignals: number;
  totalContracts: number;
  concentrationRisk: number;
  items: ProductPortfolioItem[];
  actions: ProductPortfolioAction[];
}
