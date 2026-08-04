import type { PlatformUserContext } from '../../contexts/platform/platformContextTypes';

const OI_BETA_ORGANIZATION_IDS = new Set(['org-oi-beta', 'org_oi_beta']);
const MASTER_ROLES = new Set(['master_admin', 'super_admin', 'superadmin', 'owner']);

export interface ResolvedOperationalContext {
  userId: string;
  organizationId: string;
  tenantId: string;
  workspaceId?: string;
  role: string;
  isOiBetaOrganization: boolean;
  isInternalOiBetaUser: boolean;
  requiresWorkspace: boolean;
  hasWorkspace: boolean;
  isMasterAdmin: boolean;
  isOiBetaMasterAdmin: boolean;
}

export class OperationalContextResolver {
  static resolve(user: PlatformUserContext | null | undefined): ResolvedOperationalContext {
    const role = String(user?.role || 'unknown').trim().toLowerCase();
    const isMasterAdmin = MASTER_ROLES.has(role);
    const organizationId = String(
      user?.organizationId || (isMasterAdmin ? 'org-oi-beta' : 'unprovisioned-organization'),
    ).trim();
    const tenantId = String(user?.tenantId || organizationId).trim();
    const workspaceId = String(user?.workspaceId || '').trim() || undefined;
    const isOiBetaOrganization = OI_BETA_ORGANIZATION_IDS.has(organizationId.toLowerCase());
    const isInternalOiBetaUser = isOiBetaOrganization;

    return {
      userId: String(user?.id || 'anonymous'),
      organizationId,
      tenantId,
      workspaceId,
      role,
      isOiBetaOrganization,
      isInternalOiBetaUser,
      requiresWorkspace: !isInternalOiBetaUser,
      hasWorkspace: Boolean(workspaceId),
      isMasterAdmin,
      isOiBetaMasterAdmin: isOiBetaOrganization && isMasterAdmin,
    };
  }
}
