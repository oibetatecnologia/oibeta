export type FinanceRiskLevel = 'healthy' | 'attention' | 'critical';

export interface FinanceClientItem {
  clientId: string;
  clientName: string;
  monthlyRevenue: number;
  totalOpen: number;
  overdueAmount: number;
  overdueCount: number;
  pendingCount: number;
  collectionScore: number;
  riskLevel: FinanceRiskLevel;
  reasons: string[];
}

export interface FinanceActionItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  taskTitle: string;
  severity: 'alta' | 'média' | 'baixa';
}

export interface FinanceIntelligenceSummary {
  recurringRevenue: number;
  expectedRevenue: number;
  receivedRevenue: number;
  openRevenue: number;
  overdueRevenue: number;
  collectionRate: number;
  delinquencyRate: number;
  forecast30Days: number;
  healthyClients: number;
  attentionClients: number;
  criticalClients: number;
  clients: FinanceClientItem[];
  actions: FinanceActionItem[];
}
