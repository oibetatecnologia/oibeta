import type { PlatformUserContext } from '../../contexts/platform/platformContextTypes';

const OI_BETA_ORGANIZATION_IDS = new Set(['org-oi-beta', 'org_oi_beta']);
const MASTER_ROLES = new Set(['master_admin', 'super_admin', 'superadmin', 'owner']);

export interface ResolvedOperationalContext {
  userId: string;
  organizationId: string;
  tenantId: string;
  workspaceId: string;
  role: string;
  isOiBetaOrganization: boolean;
  isMasterAdmin: boolean;
  isOiBetaMasterAdmin: boolean;
}

export class OperationalContextResolver {
  static resolve(user: PlatformUserContext | null | undefined): ResolvedOperationalContext {
    const organizationId = String(user?.organizationId || 'org-oi-beta');
    const tenantId = String(user?.tenantId || organizationId);
    const workspaceId = String(user?.workspaceId || 'default-workspace');
    const role = String(user?.role || 'unknown').trim().toLowerCase();
    const isOiBetaOrganization = OI_BETA_ORGANIZATION_IDS.has(organizationId);
    const isMasterAdmin = MASTER_ROLES.has(role);

    return {
      userId: String(user?.id || 'anonymous'),
      organizationId,
      tenantId,
      workspaceId,
      role,
      isOiBetaOrganization,
      isMasterAdmin,
      isOiBetaMasterAdmin: isOiBetaOrganization && isMasterAdmin,
    };
  }
}
