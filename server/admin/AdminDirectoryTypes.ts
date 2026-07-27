export type AdminUserStatus = "invited" | "active" | "paused" | "inactive";
export type AdminUserProfile =
  | "master_admin"
  | "tenant_admin"
  | "executive"
  | "manager"
  | "operator"
  | "auditor"
  | "public_user";

export interface AdminDirectoryUser {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  email: string;
  profile: AdminUserProfile;
  roleLabel: string;
  department?: string;
  status: AdminUserStatus;
  superiorUserId?: string;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDirectoryTenant {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type:
    | "city_hall"
    | "city_council"
    | "autarchy"
    | "public_consortium"
    | "private_organization";
  status: "implementation" | "active" | "paused" | "inactive";
  licensedProductIds: string[];
  primaryAdminName?: string;
  primaryAdminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserInput {
  organizationId: string;
  tenantId?: string;
  name: string;
  email: string;
  profile: AdminUserProfile;
  roleLabel?: string;
  department?: string;
  superiorUserId?: string;
  productIds?: string[];
}

export interface UpdateAdminUserInput {
  name?: string;
  profile?: AdminUserProfile;
  roleLabel?: string;
  department?: string;
  status?: AdminUserStatus;
  superiorUserId?: string;
  productIds?: string[];
}

export interface UpdateAdminTenantInput {
  status?: AdminDirectoryTenant["status"];
  primaryAdminName?: string;
  primaryAdminEmail?: string;
}

export interface CreateAdminTenantInput {
  name: string;
  type: AdminDirectoryTenant["type"];
  status?: AdminDirectoryTenant["status"];
  licensedProductIds?: string[];
  primaryAdminName?: string;
  primaryAdminEmail?: string;
}
