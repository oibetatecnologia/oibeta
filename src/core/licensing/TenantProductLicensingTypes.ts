export interface TenantProductLicenseSnapshot {
  tenantId: string;
  organizationId: string;
  licensedProductIds: string[];
  userCount: number;
  usersSynchronized: number;
  updatedAt: string;
}

export interface UpdateTenantProductLicensesInput {
  productIds: string[];
  synchronizeUsers?: boolean;
}

export interface TenantProductLicensingSummary {
  totalProducts: number;
  licensedProducts: number;
  availableProducts: number;
  synchronizedUsers: number;
  totalUsers: number;
  readinessScore: number;
}
