export interface AuthenticatedUserContext {
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

const MASTER_ROLES = new Set(['master_admin', 'super_admin', 'superadmin', 'owner']);
const OI_BETA_ORGANIZATION_IDS = new Set(['org-oi-beta', 'org_oi_beta']);

export const MASTER_ADMIN_CONTEXT: Required<Pick<AuthenticatedUserContext,
  'id' | 'name' | 'email' | 'role' | 'organizationId' | 'tenantId'
>> = {
  id: 'dev-user-douglas',
  name: 'Douglas',
  email: 'douglas.ujs@gmail.com',
  role: 'master_admin',
  organizationId: 'org-oi-beta',
  tenantId: 'org-oi-beta',
};

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
};

export const isMasterUserContext = (user: AuthenticatedUserContext | null | undefined): boolean =>
  MASTER_ROLES.has(String(user?.role || '').trim().toLowerCase());

export const isOiBetaInternalUserContext = (
  user: AuthenticatedUserContext | null | undefined,
): boolean => OI_BETA_ORGANIZATION_IDS.has(String(user?.organizationId || '').trim().toLowerCase());

export const requiresWorkspaceContext = (
  user: AuthenticatedUserContext | null | undefined,
): boolean => Boolean(user) && !isOiBetaInternalUserContext(user);

export const normalizeAuthenticatedUser = (
  input: AuthenticatedUserContext | null | undefined,
): AuthenticatedUserContext | null => {
  if (!input) return null;

  const role = String(input.role || '').trim().toLowerCase();
  const isMaster = MASTER_ROLES.has(role);
  const organizationId = String(
    input.organizationId || (isMaster ? MASTER_ADMIN_CONTEXT.organizationId : ''),
  ).trim();
  const workspaceId = String(input.workspaceId || '').trim() || undefined;
  const id = String(input.id || (isMaster ? MASTER_ADMIN_CONTEXT.id : '')).trim();
  const isInternal = OI_BETA_ORGANIZATION_IDS.has(organizationId.toLowerCase());

  if (!id || !role || !organizationId) return null;
  if (!isInternal && !workspaceId) return null;

  return {
    ...input,
    id,
    role,
    organizationId,
    tenantId: String(input.tenantId || organizationId).trim(),
    ...(workspaceId ? { workspaceId } : { workspaceId: undefined }),
    productIds: normalizeIds(input.productIds),
    licensedProductIds: normalizeIds(input.licensedProductIds),
  };
};

export const buildAuthenticatedHeaders = (
  user: AuthenticatedUserContext,
  includeJsonContentType = false,
): Record<string, string> => {
  const normalized = normalizeAuthenticatedUser(user);
  if (!normalized) {
    throw new Error('Sessão sem contexto de acesso válido. Faça login novamente.');
  }

  return {
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    'x-organization-id': String(normalized.organizationId),
    ...(normalized.workspaceId ? { 'x-workspace-id': String(normalized.workspaceId) } : {}),
    'x-user-id': String(normalized.id),
    'x-user-role': String(normalized.role),
    ...(normalized.name ? { 'x-user-name': String(normalized.name) } : {}),
    ...(normalized.email ? { 'x-user-email': String(normalized.email) } : {}),
  };
};
