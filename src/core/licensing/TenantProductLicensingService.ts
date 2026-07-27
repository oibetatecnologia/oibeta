import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  TenantProductLicenseSnapshot,
  TenantProductLicensingSummary,
  UpdateTenantProductLicensesInput,
} from './TenantProductLicensingTypes';

const ENDPOINT = '/api/admin/tenants';

export class TenantProductLicensingService {
  static getTenantLicenses(
    tenantId: string,
  ): Promise<TenantProductLicenseSnapshot> {
    return HttpRepositoryClient.get<TenantProductLicenseSnapshot>(
      `${ENDPOINT}/${encodeURIComponent(tenantId)}/licenses`,
    );
  }

  static updateTenantLicenses(
    tenantId: string,
    input: UpdateTenantProductLicensesInput,
  ): Promise<TenantProductLicenseSnapshot> {
    return HttpRepositoryClient.put<TenantProductLicenseSnapshot>(
      `${ENDPOINT}/${encodeURIComponent(tenantId)}/licenses`,
      input,
    );
  }

  static buildSummary(
    snapshot: TenantProductLicenseSnapshot,
    totalProducts: number,
  ): TenantProductLicensingSummary {
    const licensedProducts = snapshot.licensedProductIds.length;
    const availableProducts = Math.max(0, totalProducts - licensedProducts);
    const userSynchronizationScore =
      snapshot.userCount === 0
        ? 100
        : Math.round(
            (snapshot.usersSynchronized / snapshot.userCount) * 100,
          );
    const productCoverageScore =
      totalProducts === 0
        ? 100
        : Math.round((licensedProducts / totalProducts) * 100);

    return {
      totalProducts,
      licensedProducts,
      availableProducts,
      synchronizedUsers: snapshot.usersSynchronized,
      totalUsers: snapshot.userCount,
      readinessScore: Math.round(
        productCoverageScore * 0.6 + userSynchronizationScore * 0.4,
      ),
    };
  }
}
