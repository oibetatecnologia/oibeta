export type TenantCommercialContractStatus = "draft" | "trial" | "active" | "paused" | "cancelled" | "expired";

export interface TenantCommercialContract {
  id: string;
  tenantId: string;
  organizationId: string;
  planName: string;
  status: TenantCommercialContractStatus;
  productIds: string[];
  monthlyValue: number;
  setupValue: number;
  billingDay: number;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  responsible: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveTenantCommercialContractInput {
  tenantId: string;
  planName: string;
  status: TenantCommercialContractStatus;
  productIds: string[];
  monthlyValue: number;
  setupValue?: number;
  billingDay: number;
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  responsible: string;
  notes?: string;
}

export interface TenantCommercialContractSummary {
  total: number;
  active: number;
  trial: number;
  paused: number;
  expiringIn90Days: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  contractedSetupValue: number;
  licensedProducts: number;
  readinessScore: number;
}
