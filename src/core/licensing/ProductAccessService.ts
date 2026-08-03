import type {
  ProductDefinition,
  ProductStatus,
} from '../../products/productRegistry';
import {
  PRODUCT_REGISTRY,
  getProductByTab,
} from '../../products/productRegistry';
import type { PlatformUserContext } from '../../contexts/platform/platformContextTypes';

const PRIVILEGED_ROLES = new Set([
  'master_admin',
  'super_admin',
  'superadmin',
  'owner',
]);

const ALWAYS_AVAILABLE_STATUSES = new Set<ProductStatus>([
  'embedded',
]);

const CLIENT_UNIVERSAL_TABS = new Set([
  'dashboard',
  'client_onboarding',
  'client_products',
  'client_settings',
  'beta_brain',
  'memories',
  'knowledge',
  'decisions',
]);

const CLIENT_ADMIN_TABS = new Set([
  'client_users',
  'client_audit',
]);

export interface ProductAccessSnapshot {
  licensedProductIds: string[];
  availableProducts: ProductDefinition[];
  unavailableProducts: ProductDefinition[];
  isPrivileged: boolean;
  coverageScore: number;
}

export class ProductAccessService {
  static buildSnapshot(
    user: PlatformUserContext | null | undefined,
  ): ProductAccessSnapshot {
    const role = String(user?.role || '').trim().toLowerCase();
    const isPrivileged = PRIVILEGED_ROLES.has(role);
    const tenantLicensedProductIds = this.normalizeProductIds(user?.licensedProductIds);
    const userProductIds = this.normalizeProductIds(user?.productIds);
    const licensedProductIds = isPrivileged
      ? tenantLicensedProductIds
      : tenantLicensedProductIds.length > 0
        ? userProductIds.filter((productId) => tenantLicensedProductIds.includes(productId))
        : userProductIds;

    const availableProducts = PRODUCT_REGISTRY.filter((product) =>
      this.canAccessProduct(product, licensedProductIds, isPrivileged),
    );
    const unavailableProducts = PRODUCT_REGISTRY.filter(
      (product) =>
        !this.canAccessProduct(product, licensedProductIds, isPrivileged),
    );

    return {
      licensedProductIds,
      availableProducts,
      unavailableProducts,
      isPrivileged,
      coverageScore:
        PRODUCT_REGISTRY.length === 0
          ? 100
          : Math.round(
              (availableProducts.length / PRODUCT_REGISTRY.length) * 100,
            ),
    };
  }

  static canAccessTab(
    tabId: string,
    snapshot: ProductAccessSnapshot,
  ): boolean {
    const product = getProductByTab(tabId);

    if (!product) return true;

    return snapshot.availableProducts.some(
      (availableProduct) => availableProduct.id === product.id,
    );
  }

  static canAccessClientTab(
    tabId: string,
    role: string | null | undefined,
    snapshot: ProductAccessSnapshot,
  ): boolean {
    const normalizedRole = String(role || '').trim().toLowerCase();

    if (snapshot.isPrivileged) return true;
    if (CLIENT_UNIVERSAL_TABS.has(tabId)) return true;
    if (CLIENT_ADMIN_TABS.has(tabId)) return normalizedRole === 'tenant_admin';

    return this.canAccessTab(tabId, snapshot);
  }

  static canAccessProductId(
    productId: string,
    snapshot: ProductAccessSnapshot,
  ): boolean {
    return snapshot.availableProducts.some(
      (product) => product.id === productId,
    );
  }

  static getRequiredProductForTab(
    tabId: string,
  ): ProductDefinition | undefined {
    return getProductByTab(tabId);
  }

  private static canAccessProduct(
    product: ProductDefinition,
    licensedProductIds: string[],
    isPrivileged: boolean,
  ): boolean {
    if (isPrivileged) return product.status !== 'planned';
    if (ALWAYS_AVAILABLE_STATUSES.has(product.status)) return true;

    return licensedProductIds.includes(product.id);
  }

  private static normalizeProductIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return Array.from(
      new Set(
        value
          .map((productId) => String(productId).trim())
          .filter(Boolean),
      ),
    );
  }
}
