import type { PlatformContextValue, PlatformRole, PlatformUserContext } from './platformContextTypes';

export const DEFAULT_PLATFORM_ORGANIZATION_ID = 'org-oi-beta';
export const DEFAULT_PLATFORM_WORKSPACE_ID = 'default-workspace';

export function resolvePlatformRole(user: PlatformUserContext | null): PlatformRole {
  const role = String(user?.role || '').toLowerCase();

  if (['master_admin', 'super_admin', 'owner'].includes(role)) {
    return 'master_admin';
  }

  if (['tenant_admin', 'admin'].includes(role)) {
    return 'tenant_admin';
  }

  if (['operator', 'user'].includes(role)) {
    return 'operator';
  }

  if (['public', 'citizen', 'public_user'].includes(role)) {
    return 'public_user';
  }

  return 'unknown';
}

export const EMPTY_PLATFORM_CONTEXT: PlatformContextValue = {
  currentUser: null,
  currentRole: 'unknown',
  currentTenant: {
    id: DEFAULT_PLATFORM_ORGANIZATION_ID,
    organizationId: DEFAULT_PLATFORM_ORGANIZATION_ID,
    workspaceId: DEFAULT_PLATFORM_WORKSPACE_ID,
  },
  licensedProductIds: [],
  isPrivilegedProductAccess: false,
  productAccessCoverage: 0,
  selectedProjectId: '',
  projects: [],
  activeTab: 'dashboard',
  activeProduct: undefined,
  activeWorkspaceKey: undefined,
  availableProducts: [],
  unavailableProducts: [],
  isTabLicensed: () => true,
  isProductLicensed: () => true,
  betaContext: {
    activeProductId: undefined,
    activeProductName: undefined,
    activeWorkspaceKey: undefined,
    activeTab: 'dashboard',
    selectedProjectId: '',
  },
};
