import type { ProductDefinition } from '../../products/productRegistry';
import type { PlatformUserDefinition, PlatformUserProfile } from '../users/UserRegistry';

export type PlatformPermissionAction =
  | 'platform_admin'
  | 'tenant_manage'
  | 'users_manage'
  | 'organization_manage'
  | 'products_license'
  | 'commercial_operate'
  | 'finance_operate'
  | 'support_operate'
  | 'audit_read'
  | 'public_read';

export interface PlatformPermissionDefinition {
  action: PlatformPermissionAction;
  label: string;
  description: string;
}

export interface UserPermissionSnapshot {
  userId: string;
  profile: PlatformUserProfile;
  permissions: PlatformPermissionAction[];
  accessibleProductIds: string[];
  canDelegateUsers: boolean;
  delegationProfiles: PlatformUserProfile[];
  permissionCoverage: number;
}

const PERMISSION_DEFINITIONS: PlatformPermissionDefinition[] = [
  {
    action: 'platform_admin',
    label: 'Administração da plataforma',
    description: 'Acesso ao Beta Core, tenants, módulos, ambientes e operação global.',
  },
  {
    action: 'tenant_manage',
    label: 'Gestão do tenant',
    description: 'Administração do próprio tenant, contexto e configurações operacionais.',
  },
  {
    action: 'users_manage',
    label: 'Gestão de usuários',
    description: 'Convites, perfis, escopos e delegação de usuários permitidos.',
  },
  {
    action: 'organization_manage',
    label: 'Estrutura organizacional',
    description: 'Gestão de unidades, hierarquia, responsáveis e escopos.',
  },
  {
    action: 'products_license',
    label: 'Licenciamento de produtos',
    description: 'Controle dos produtos liberados para o tenant.',
  },
  {
    action: 'commercial_operate',
    label: 'Operação comercial',
    description: 'Radar, CRM, propostas, contratos e acompanhamento comercial.',
  },
  {
    action: 'finance_operate',
    label: 'Operação financeira',
    description: 'Receita, cobranças, recebimentos e risco financeiro.',
  },
  {
    action: 'support_operate',
    label: 'Suporte e sucesso',
    description: 'Chamados, retenção, implantação e sucesso do cliente.',
  },
  {
    action: 'audit_read',
    label: 'Auditoria e leitura',
    description: 'Leitura transversal para controle, conformidade e governança.',
  },
  {
    action: 'public_read',
    label: 'Leitura pública',
    description: 'Acesso somente a recursos explicitamente públicos.',
  },
];

const PROFILE_PERMISSIONS: Record<PlatformUserProfile, PlatformPermissionAction[]> = {
  master_admin: [
    'platform_admin',
    'tenant_manage',
    'users_manage',
    'organization_manage',
    'products_license',
    'commercial_operate',
    'finance_operate',
    'support_operate',
    'audit_read',
  ],
  tenant_admin: [
    'tenant_manage',
    'users_manage',
    'organization_manage',
    'commercial_operate',
    'finance_operate',
    'support_operate',
    'audit_read',
  ],
  executive: [
    'organization_manage',
    'commercial_operate',
    'finance_operate',
    'support_operate',
    'audit_read',
  ],
  manager: [
    'users_manage',
    'commercial_operate',
    'support_operate',
    'audit_read',
  ],
  operator: [
    'commercial_operate',
    'support_operate',
  ],
  auditor: [
    'audit_read',
  ],
  public_user: [
    'public_read',
  ],
};

const DELEGATION_MATRIX: Record<PlatformUserProfile, PlatformUserProfile[]> = {
  master_admin: ['tenant_admin', 'executive', 'manager', 'operator', 'auditor'],
  tenant_admin: ['executive', 'manager', 'operator', 'auditor'],
  executive: ['manager', 'operator', 'auditor'],
  manager: ['operator'],
  operator: [],
  auditor: [],
  public_user: [],
};

export class PermissionPolicyService {
  static listDefinitions(): PlatformPermissionDefinition[] {
    return PERMISSION_DEFINITIONS;
  }

  static getPermissions(profile: PlatformUserProfile): PlatformPermissionAction[] {
    return PROFILE_PERMISSIONS[profile];
  }

  static can(profile: PlatformUserProfile, action: PlatformPermissionAction): boolean {
    return this.getPermissions(profile).includes(action);
  }

  static getDelegationProfiles(profile: PlatformUserProfile): PlatformUserProfile[] {
    return DELEGATION_MATRIX[profile];
  }

  static buildUserSnapshot(
    user: PlatformUserDefinition,
    availableProducts: ProductDefinition[],
  ): UserPermissionSnapshot {
    const permissions = this.getPermissions(user.profile);
    const accessibleProductIds = user.profile === 'master_admin'
      ? availableProducts.map((product) => product.id)
      : user.productIds.filter((productId) =>
          availableProducts.some((product) => product.id === productId)
        );

    return {
      userId: user.id,
      profile: user.profile,
      permissions,
      accessibleProductIds,
      canDelegateUsers: this.getDelegationProfiles(user.profile).length > 0,
      delegationProfiles: this.getDelegationProfiles(user.profile),
      permissionCoverage: Math.round(
        (permissions.length / Math.max(PERMISSION_DEFINITIONS.length, 1)) * 100,
      ),
    };
  }

  static buildCoverageSummary(users: PlatformUserDefinition[]): {
    totalUsers: number;
    usersWithDelegation: number;
    usersWithoutProducts: number;
    privilegedUsers: number;
    averagePermissionCoverage: number;
  } {
    const permissionCoverages = users.map((user) =>
      Math.round(
        (this.getPermissions(user.profile).length /
          Math.max(PERMISSION_DEFINITIONS.length, 1)) *
          100,
      )
    );

    return {
      totalUsers: users.length,
      usersWithDelegation: users.filter(
        (user) => this.getDelegationProfiles(user.profile).length > 0,
      ).length,
      usersWithoutProducts: users.filter((user) => user.productIds.length === 0).length,
      privilegedUsers: users.filter((user) =>
        ['master_admin', 'tenant_admin'].includes(user.profile)
      ).length,
      averagePermissionCoverage: permissionCoverages.length > 0
        ? Math.round(
            permissionCoverages.reduce((total, coverage) => total + coverage, 0) /
              permissionCoverages.length,
          )
        : 0,
    };
  }
}
