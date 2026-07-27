import type { ProductDefinition } from '../../products/productRegistry';

export type PlatformUserStatus = 'invited' | 'active' | 'paused' | 'inactive';

export type PlatformUserProfile =
  | 'master_admin'
  | 'tenant_admin'
  | 'executive'
  | 'manager'
  | 'operator'
  | 'auditor'
  | 'public_user';

export interface PlatformUserDefinition {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  email: string;
  profile: PlatformUserProfile;
  roleLabel: string;
  department?: string;
  status: PlatformUserStatus;
  superiorUserId?: string;
  productIds: string[];
}

export interface UserRegistryInput {
  tenantId: string;
  organizationId: string;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  availableProducts?: ProductDefinition[];
}

export function createCurrentUserFromRuntimeContext(input: UserRegistryInput): PlatformUserDefinition {
  return {
    id: input.currentUser?.id || 'dev-user-douglas',
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    name: input.currentUser?.name || 'Admin Mestre',
    email: input.currentUser?.email || 'admin@oibeta.com',
    profile: resolveUserProfile(input.currentUser?.role),
    roleLabel: resolveUserRoleLabel(input.currentUser?.role),
    department: 'Administração da Plataforma',
    status: 'active',
    productIds: (input.availableProducts || []).map((product) => product.id),
  };
}

export function createInitialTenantUsers(input: UserRegistryInput): PlatformUserDefinition[] {
  const currentUser = createCurrentUserFromRuntimeContext(input);

  return [
    currentUser,
    {
      id: 'tenant-admin-template',
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      name: 'Admin do Cliente',
      email: 'admin.cliente@exemplo.gov.br',
      profile: 'tenant_admin',
      roleLabel: 'Administrador do Cliente',
      department: 'Gabinete / Administração',
      status: 'invited',
      superiorUserId: currentUser.id,
      productIds: (input.availableProducts || []).map((product) => product.id),
    },
    {
      id: 'secretary-template',
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      name: 'Secretário Municipal',
      email: 'secretario@exemplo.gov.br',
      profile: 'manager',
      roleLabel: 'Gestor de Área',
      department: 'Secretaria',
      status: 'invited',
      superiorUserId: 'tenant-admin-template',
      productIds: (input.availableProducts || []).slice(0, 2).map((product) => product.id),
    },
  ];
}

export function resolveUserProfile(role?: string): PlatformUserProfile {
  const normalizedRole = String(role || '').toLowerCase();

  if (['master_admin', 'super_admin', 'owner'].includes(normalizedRole)) {
    return 'master_admin';
  }

  if (['tenant_admin', 'admin'].includes(normalizedRole)) {
    return 'tenant_admin';
  }

  if (['executive', 'prefeito', 'presidente'].includes(normalizedRole)) {
    return 'executive';
  }

  if (['manager', 'gestor', 'secretario'].includes(normalizedRole)) {
    return 'manager';
  }

  if (['operator', 'user', 'servidor'].includes(normalizedRole)) {
    return 'operator';
  }

  if (['auditor', 'controlador'].includes(normalizedRole)) {
    return 'auditor';
  }

  if (['public', 'citizen', 'public_user'].includes(normalizedRole)) {
    return 'public_user';
  }

  return 'operator';
}

export function resolveUserRoleLabel(role?: string): string {
  const profile = resolveUserProfile(role);

  const labels: Record<PlatformUserProfile, string> = {
    master_admin: 'Admin Mestre Oi Beta',
    tenant_admin: 'Administrador do Cliente',
    executive: 'Executivo / Autoridade',
    manager: 'Gestor',
    operator: 'Operador',
    auditor: 'Auditoria / Controle',
    public_user: 'Usuário Público',
  };

  return labels[profile];
}

export function getUserStatusLabel(status: PlatformUserStatus): string {
  const labels: Record<PlatformUserStatus, string> = {
    invited: 'Convite enviado',
    active: 'Ativo',
    paused: 'Pausado',
    inactive: 'Inativo',
  };

  return labels[status];
}

export function getUserProfileLabel(profile: PlatformUserProfile): string {
  const labels: Record<PlatformUserProfile, string> = {
    master_admin: 'Admin Mestre',
    tenant_admin: 'Admin do Cliente',
    executive: 'Executivo',
    manager: 'Gestor',
    operator: 'Operador',
    auditor: 'Auditor',
    public_user: 'Usuário Público',
  };

  return labels[profile];
}
