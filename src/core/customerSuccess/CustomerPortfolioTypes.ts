export type CustomerPortfolioRiskLevel = 'saudável' | 'atenção' | 'crítico';
export type CustomerPortfolioActionArea = 'implantação' | 'financeiro' | 'suporte' | 'relacionamento' | 'expansão';

export interface CustomerPortfolioClientSnapshot {
  clientId: string;
  clientName: string;
  city: string;
  state: string;
  healthScore: number;
  riskLevel: CustomerPortfolioRiskLevel;
  riskScore: number;
  activeProducts: number;
  implementationProgress: number;
  overdueAmount: number;
  openTickets: number;
  criticalTickets: number;
  daysWithoutInteraction: number;
  expansionPotential: number;
  recurringRevenue: number;
  reasons: string[];
}

export interface CustomerPortfolioAction {
  id: string;
  clientId: string;
  clientName: string;
  area: CustomerPortfolioActionArea;
  title: string;
  description: string;
  priority: 'alta' | 'média' | 'baixa';
  taskTitle: string;
}

export interface CustomerPortfolioSummary {
  portfolioHealth: number;
  riskLevel: CustomerPortfolioRiskLevel;
  trackedClients: number;
  healthyClients: number;
  attentionClients: number;
  criticalClients: number;
  expansionReadyClients: number;
  monthlyRecurringRevenue: number;
  revenueAtRisk: number;
  averageImplementationProgress: number;
  snapshots: CustomerPortfolioClientSnapshot[];
  priorityActions: CustomerPortfolioAction[];
}
