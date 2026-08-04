import type { Project } from '../../types';
import type { ProductDefinition, ProductWorkspaceKey } from '../../products/productRegistry';

export type PlatformRole =
  | 'master_admin'
  | 'tenant_admin'
  | 'operator'
  | 'public_user'
  | 'unknown';

export interface PlatformUserContext {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  tenantId?: string;
  workspaceId?: string;
  productIds?: string[];
  licensedProductIds?: string[];
  [key: string]: unknown;
}

export interface PlatformTenantContext {
  id: string;
  organizationId: string;
  workspaceId?: string;
  isInternalOiBetaUser: boolean;
  requiresWorkspace: boolean;
}

export interface PlatformBetaContext {
  activeProductId?: string;
  activeProductName?: string;
  activeWorkspaceKey?: ProductWorkspaceKey;
  activeTab: string;
  selectedProjectId: string;
}

export interface PlatformContextValue {
  currentUser: PlatformUserContext | null;
  currentRole: PlatformRole;
  currentTenant: PlatformTenantContext;
  licensedProductIds: string[];
  isPrivilegedProductAccess: boolean;
  productAccessCoverage: number;
  selectedProjectId: string;
  projects: Project[];
  activeTab: string;
  activeProduct?: ProductDefinition;
  activeWorkspaceKey?: ProductWorkspaceKey;
  availableProducts: ProductDefinition[];
  unavailableProducts: ProductDefinition[];
  isTabLicensed: (tabId: string) => boolean;
  isProductLicensed: (productId: string) => boolean;
  betaContext: PlatformBetaContext;
}
