import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { PlatformUserDefinition } from '../users/UserRegistry';
import type { TenantDefinition } from '../tenants/TenantRegistry';
import type {
  CreateAdminTenantInput,
  InviteAdminUserInput,
  UpdateAdminUserInput,
  UpdateAdminTenantInput,
} from './AdminDirectoryTypes';

const USERS_ENDPOINT = '/api/admin/users';
const TENANTS_ENDPOINT = '/api/admin/tenants';

export class AdminDirectoryService {
  static listUsers(): Promise<PlatformUserDefinition[]> {
    return HttpRepositoryClient.get<PlatformUserDefinition[]>(USERS_ENDPOINT);
  }

  static inviteUser(input: InviteAdminUserInput): Promise<PlatformUserDefinition> {
    return HttpRepositoryClient.post<PlatformUserDefinition>(
      `${USERS_ENDPOINT}/invite`,
      input,
    );
  }

  static resendInvitation(userId: string): Promise<PlatformUserDefinition> {
    return HttpRepositoryClient.post<PlatformUserDefinition>(
      `${USERS_ENDPOINT}/${encodeURIComponent(userId)}/resend-invitation`,
      {},
    );
  }

  static cancelInvitation(userId: string): Promise<PlatformUserDefinition> {
    return HttpRepositoryClient.delete<PlatformUserDefinition>(
      `${USERS_ENDPOINT}/${encodeURIComponent(userId)}/invitation`,
    );
  }

  static updateUser(
    userId: string,
    input: UpdateAdminUserInput,
  ): Promise<PlatformUserDefinition> {
    return HttpRepositoryClient.put<PlatformUserDefinition>(
      `${USERS_ENDPOINT}/${encodeURIComponent(userId)}`,
      input,
    );
  }

  static listTenants(): Promise<TenantDefinition[]> {
    return HttpRepositoryClient.get<TenantDefinition[]>(TENANTS_ENDPOINT);
  }

  static createTenant(input: CreateAdminTenantInput): Promise<TenantDefinition> {
    return HttpRepositoryClient.post<TenantDefinition>(TENANTS_ENDPOINT, input);
  }

  static updateTenant(
    tenantId: string,
    input: UpdateAdminTenantInput,
  ): Promise<TenantDefinition> {
    return HttpRepositoryClient.put<TenantDefinition>(
      `${TENANTS_ENDPOINT}/${encodeURIComponent(tenantId)}`,
      input,
    );
  }
}
