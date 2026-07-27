import type { ProductDefinition } from '../../products/productRegistry';
import {
  createInitialTenantUsers,
  getUserProfileLabel,
  getUserStatusLabel,
  type PlatformUserDefinition,
  type PlatformUserProfile,
  type PlatformUserStatus,
} from './UserRegistry';

export interface UserRuntimeContext {
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

export interface UserOperationalSummary {
  totalUsers: number;
  activeUsers: number;
  invitedUsers: number;
  tenantAdmins: number;
  operationalUsers: number;
}

export interface UserOperationalSnapshot {
  users: PlatformUserDefinition[];
  summary: UserOperationalSummary;
}

/**
 * UserService
 *
 * Camada inicial da Capacidade Gestão de Usuários.
 * Ainda não acessa backend diretamente.
 * Normaliza dados do runtime e prepara a futura integração com autenticação,
 * convites, permissões e SuperAdminEngine.
 */
export class UserService {
  static buildOperationalSnapshot(context: UserRuntimeContext): UserOperationalSnapshot {
    const users = createInitialTenantUsers({
      tenantId: context.tenantId,
      organizationId: context.organizationId,
      currentUser: context.currentUser,
      availableProducts: context.availableProducts,
    });

    return {
      users,
      summary: {
        totalUsers: users.length,
        activeUsers: users.filter((user) => user.status === 'active').length,
        invitedUsers: users.filter((user) => user.status === 'invited').length,
        tenantAdmins: users.filter((user) => user.profile === 'tenant_admin').length,
        operationalUsers: users.filter((user) => ['manager', 'operator', 'auditor'].includes(user.profile)).length,
      },
    };
  }

  static getStatusLabel(status: PlatformUserStatus): string {
    return getUserStatusLabel(status);
  }

  static getProfileLabel(profile: PlatformUserProfile): string {
    return getUserProfileLabel(profile);
  }

  static canDelegateUsers(profile: PlatformUserProfile): boolean {
    return ['master_admin', 'tenant_admin', 'executive', 'manager'].includes(profile);
  }

  static getDelegationScope(profile: PlatformUserProfile): string {
    if (profile === 'master_admin') return 'Todos os tenants e administradores iniciais';
    if (profile === 'tenant_admin') return 'Usuários e equipes dentro do próprio tenant';
    if (profile === 'executive') return 'Secretários, gestores e equipes subordinadas';
    if (profile === 'manager') return 'Coordenadores, operadores e equipe subordinada';
    return 'Sem delegação administrativa';
  }
}
