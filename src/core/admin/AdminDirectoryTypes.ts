import type {
  PlatformUserDefinition,
  PlatformUserProfile,
  PlatformUserStatus,
} from '../users/UserRegistry';
import type { TenantDefinition, TenantStatus, TenantType } from '../tenants/TenantRegistry';

export interface AdminDirectorySnapshot {
  users: PlatformUserDefinition[];
  tenants: TenantDefinition[];
  isLoading: boolean;
  error?: string;
}

export interface InviteAdminUserInput {
  tenantId?: string;
  name: string;
  email: string;
  profile: PlatformUserProfile;
  roleLabel?: string;
  department?: string;
  superiorUserId?: string;
  productIds?: string[];
}

export interface UpdateAdminUserInput {
  name?: string;
  profile?: PlatformUserProfile;
  roleLabel?: string;
  department?: string;
  status?: PlatformUserStatus;
  superiorUserId?: string;
  productIds?: string[];
}

export interface UpdateAdminTenantInput {
  status?: TenantStatus;
  primaryAdminName?: string;
  primaryAdminEmail?: string;
}

export interface CreateAdminTenantInput {
  name: string;
  type: TenantType;
  status?: TenantStatus;
  licensedProductIds?: string[];
  primaryAdminName?: string;
  primaryAdminEmail?: string;
}
