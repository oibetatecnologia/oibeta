import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import { getInvalidOfficialProductIds, normalizeOfficialProductIds } from "../../src/products/officialProductIds";
import type {
  TenantProductLicenseSnapshot,
  UpdateTenantProductLicensesInput,
} from "./ProductLicensingTypes";
import type {
  AdminDirectoryTenant,
  AdminDirectoryUser,
  CreateAdminTenantInput,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  UpdateAdminTenantInput,
} from "./AdminDirectoryTypes";

interface JsonAdminDirectory {
  users: AdminDirectoryUser[];
  tenants: AdminDirectoryTenant[];
}

const JSON_DIRECTORY_PATH = path.join(
  process.cwd(),
  ".data",
  "admin-directory.json",
);

const nowIso = () => new Date().toISOString();

const mapOrganizationType = (
  type: AdminDirectoryTenant["type"],
): string => {
  if (type === "city_hall") return "prefeitura";
  if (type === "private_organization") return "empresa";
  return "consultoria";
};

const mapDbTenantType = (
  type?: string,
): AdminDirectoryTenant["type"] => {
  if (type === "prefeitura") return "city_hall";
  if (type === "empresa") return "private_organization";
  return "autarchy";
};

export class AdminDirectoryService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async listUsers(organizationId: string): Promise<AdminDirectoryUser[]> {
    if (this.mode === "json") {
      return this.readJson().users
        .filter((user) => user.organizationId === organizationId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id || row.organization_id,
      organizationId: row.organization_id,
      name: row.name,
      email: row.email,
      profile: row.profile || row.role || "operator",
      roleLabel: row.role_label || row.role || "Operador",
      department: row.department || undefined,
      status: row.status || "active",
      superiorUserId: row.superior_user_id || undefined,
      productIds: Array.isArray(row.product_ids) ? row.product_ids : [],
      createdAt: row.created_at || nowIso(),
      updatedAt: row.updated_at || nowIso(),
    }));
  }

  async inviteUser(
    input: CreateAdminUserInput,
  ): Promise<AdminDirectoryUser> {
    const timestamp = nowIso();
    const baseUser: AdminDirectoryUser = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId || input.organizationId,
      organizationId: input.organizationId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      profile: input.profile,
      roleLabel: input.roleLabel || input.profile,
      department: input.department?.trim() || undefined,
      status: "invited",
      superiorUserId: input.superiorUserId,
      productIds: input.productIds || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (this.mode === "json") {
      const directory = this.readJson();
      if (
        directory.users.some(
          (user) => user.email.toLowerCase() === baseUser.email,
        )
      ) {
        throw new Error("Já existe um usuário com este e-mail.");
      }

      directory.users.push(baseUser);
      this.writeJson(directory);
      return baseUser;
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY é obrigatória para enviar convites.",
      );
    }

    const client = this.supabaseAdapter.getClient();
    const { data: invitation, error: invitationError } =
      await client.auth.admin.inviteUserByEmail(baseUser.email, {
        data: {
          name: baseUser.name,
          organizationId: baseUser.organizationId,
          profile: baseUser.profile,
        },
      });

    if (invitationError) throw invitationError;

    const invitedId = invitation.user?.id || baseUser.id;
    const { data, error } = await client
      .from("users")
      .upsert({
        id: invitedId,
        tenant_id: baseUser.tenantId,
        organization_id: baseUser.organizationId,
        name: baseUser.name,
        email: baseUser.email,
        role: baseUser.profile,
        profile: baseUser.profile,
        role_label: baseUser.roleLabel,
        department: baseUser.department || null,
        status: "invited",
        superior_user_id: baseUser.superiorUserId || null,
        product_ids: baseUser.productIds,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...baseUser,
      id: data.id,
      createdAt: data.created_at || timestamp,
      updatedAt: data.updated_at || timestamp,
    };
  }

  async resendInvitation(
    organizationId: string,
    userId: string,
  ): Promise<AdminDirectoryUser> {
    const users = await this.listUsers(organizationId);
    const user = users.find((item) => item.id === userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.status !== "invited") {
      throw new Error("Somente convites pendentes podem ser reenviados.");
    }

    if (this.mode === "supabase") {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY é obrigatória para reenviar convites.");
      }
      const { error } = await this.supabaseAdapter
        .getClient()
        .auth.admin.inviteUserByEmail(user.email, {
          data: {
            name: user.name,
            organizationId: user.organizationId,
            profile: user.profile,
          },
        });
      if (error) throw error;
    }

    return this.updateUser(organizationId, userId, { status: "invited" });
  }

  async cancelInvitation(
    organizationId: string,
    userId: string,
  ): Promise<AdminDirectoryUser> {
    const users = await this.listUsers(organizationId);
    const user = users.find((item) => item.id === userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.status !== "invited") {
      throw new Error("Somente convites pendentes podem ser cancelados.");
    }
    return this.updateUser(organizationId, userId, { status: "inactive" });
  }

  async updateUser(
    organizationId: string,
    userId: string,
    input: UpdateAdminUserInput,
  ): Promise<AdminDirectoryUser> {
    if (this.mode === "json") {
      const directory = this.readJson();
      const index = directory.users.findIndex(
        (user) =>
          user.id === userId &&
          user.organizationId === organizationId,
      );

      if (index < 0) throw new Error("Usuário não encontrado.");

      directory.users[index] = {
        ...directory.users[index],
        ...input,
        updatedAt: nowIso(),
      };
      this.writeJson(directory);
      return directory.users[index];
    }

    const payload: Record<string, unknown> = {
      updated_at: nowIso(),
    };

    if (input.name !== undefined) payload.name = input.name;
    if (input.profile !== undefined) {
      payload.profile = input.profile;
      payload.role = input.profile;
    }
    if (input.roleLabel !== undefined) payload.role_label = input.roleLabel;
    if (input.department !== undefined) payload.department = input.department;
    if (input.status !== undefined) payload.status = input.status;
    if (input.superiorUserId !== undefined) {
      payload.superior_user_id = input.superiorUserId || null;
    }
    if (input.productIds !== undefined) payload.product_ids = input.productIds;

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("users")
      .update(payload)
      .eq("id", userId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;

    return (await this.listUsers(organizationId)).find(
      (user) => user.id === data.id,
    ) as AdminDirectoryUser;
  }

  async listTenants(): Promise<AdminDirectoryTenant[]> {
    if (this.mode === "json") {
      return [...this.readJson().tenants].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    const client = this.supabaseAdapter.getClient();
    const { data: organizations, error } = await client
      .from("organizations")
      .select("*")
      .order("name");

    if (error) throw error;

    const { data: workspaces } = await client
      .from("workspaces")
      .select("id, organization_id, name, status");

    return (organizations || []).map((organization: any) => {
      const workspace = (workspaces || []).find(
        (item: any) =>
          item.organization_id === organization.id &&
          item.status !== "INACTIVE",
      );

      return {
        id: organization.id,
        organizationId: organization.id,
        workspaceId: workspace?.id || organization.id,
        name: organization.name,
        type:
          organization.tenant_type ||
          mapDbTenantType(organization.type),
        status: organization.status || "active",
        licensedProductIds: Array.isArray(
          organization.licensed_product_ids,
        )
          ? organization.licensed_product_ids
          : [],
        primaryAdminName:
          organization.primary_admin_name || undefined,
        primaryAdminEmail:
          organization.primary_admin_email || undefined,
        createdAt: organization.created_at || nowIso(),
        updatedAt: organization.updated_at || nowIso(),
      };
    });
  }

  async createTenant(
    input: CreateAdminTenantInput,
  ): Promise<AdminDirectoryTenant> {
    const timestamp = nowIso();
    const organizationId = `org-${crypto.randomUUID()}`;
    const workspaceId = `workspace-${crypto.randomUUID()}`;

    const tenant: AdminDirectoryTenant = {
      id: organizationId,
      organizationId,
      workspaceId,
      name: input.name.trim(),
      type: input.type,
      status: input.status || "implementation",
      licensedProductIds: input.licensedProductIds || [],
      primaryAdminName: input.primaryAdminName?.trim() || undefined,
      primaryAdminEmail:
        input.primaryAdminEmail?.trim().toLowerCase() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (this.mode === "json") {
      const directory = this.readJson();
      const duplicate = directory.tenants.find(
        (item) => item.name.trim().toLocaleLowerCase("pt-BR") === tenant.name.trim().toLocaleLowerCase("pt-BR"),
      );
      if (duplicate) return duplicate;
      directory.tenants.push(tenant);
      this.writeJson(directory);
      if (tenant.primaryAdminEmail && tenant.primaryAdminName) {
        await this.inviteUser({
          organizationId,
          tenantId: organizationId,
          name: tenant.primaryAdminName,
          email: tenant.primaryAdminEmail,
          profile: "tenant_admin",
          roleLabel: "Administrador do Cliente",
          productIds: tenant.licensedProductIds,
        });
      }
      return tenant;
    }

    const client = this.supabaseAdapter.getClient();
    const { error: organizationError } = await client
      .from("organizations")
      .insert({
        id: organizationId,
        name: tenant.name,
        type: mapOrganizationType(tenant.type),
        tenant_type: tenant.type,
        status: tenant.status,
        licensed_product_ids: tenant.licensedProductIds,
        primary_admin_name: tenant.primaryAdminName || null,
        primary_admin_email: tenant.primaryAdminEmail || null,
      });

    if (organizationError) throw organizationError;

    const { data: workspace, error: workspaceError } = await client
      .from("workspaces")
      .insert({
        organization_id: organizationId,
        name: `${tenant.name} — Principal`,
        description: "Workspace principal criado pelo Beta Core Admin",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (workspaceError) {
      await client.from("organizations").delete().eq("id", organizationId);
      throw workspaceError;
    }

    tenant.workspaceId = workspace.id;

    if (tenant.primaryAdminEmail && tenant.primaryAdminName) {
      await this.inviteUser({
        organizationId,
        tenantId: organizationId,
        name: tenant.primaryAdminName,
        email: tenant.primaryAdminEmail,
        profile: "tenant_admin",
        roleLabel: "Administrador do Cliente",
        productIds: tenant.licensedProductIds,
      });
    }

    return tenant;
  }


  async updateTenant(
    tenantId: string,
    input: UpdateAdminTenantInput,
  ): Promise<AdminDirectoryTenant> {
    const timestamp = nowIso();
    const primaryAdminEmail = input.primaryAdminEmail?.trim().toLowerCase();

    if (primaryAdminEmail !== undefined && primaryAdminEmail && !primaryAdminEmail.includes("@")) {
      throw new Error("Informe um e-mail válido para o administrador principal.");
    }

    if (this.mode === "json") {
      const directory = this.readJson();
      const tenantIndex = directory.tenants.findIndex(
        (item) => item.id === tenantId || item.organizationId === tenantId,
      );
      if (tenantIndex < 0) throw new Error("Tenant não encontrado.");

      const current = directory.tenants[tenantIndex];
      const next: AdminDirectoryTenant = {
        ...current,
        status: input.status ?? current.status,
        primaryAdminName: input.primaryAdminName !== undefined
          ? input.primaryAdminName.trim() || undefined
          : current.primaryAdminName,
        primaryAdminEmail: input.primaryAdminEmail !== undefined
          ? primaryAdminEmail || undefined
          : current.primaryAdminEmail,
        updatedAt: timestamp,
      };
      directory.tenants[tenantIndex] = next;
      this.writeJson(directory);
      return next;
    }

    const payload: Record<string, unknown> = { updated_at: timestamp };
    if (input.status !== undefined) payload.status = input.status;
    if (input.primaryAdminName !== undefined) payload.primary_admin_name = input.primaryAdminName.trim() || null;
    if (input.primaryAdminEmail !== undefined) payload.primary_admin_email = primaryAdminEmail || null;

    const client = this.supabaseAdapter.getClient();
    const { error } = await client
      .from("organizations")
      .update(payload)
      .eq("id", tenantId);
    if (error) throw error;

    const updated = (await this.listTenants()).find(
      (item) => item.id === tenantId || item.organizationId === tenantId,
    );
    if (!updated) throw new Error("Tenant atualizado, mas não foi possível recarregá-lo.");
    return updated;
  }


  async getTenantProductLicenses(
    tenantId: string,
  ): Promise<TenantProductLicenseSnapshot> {
    if (this.mode === "json") {
      const directory = this.readJson();
      const tenant = directory.tenants.find(
        (item) => item.id === tenantId || item.organizationId === tenantId,
      );

      if (!tenant) throw new Error("Tenant não encontrado.");

      const users = directory.users.filter(
        (user) => user.organizationId === tenant.organizationId,
      );
      const licensedProductIds = tenant.licensedProductIds || [];
      const usersSynchronized = users.filter((user) =>
        licensedProductIds.every((productId) =>
          user.productIds.includes(productId),
        ),
      ).length;

      return {
        tenantId: tenant.id,
        organizationId: tenant.organizationId,
        licensedProductIds,
        userCount: users.length,
        usersSynchronized,
        updatedAt: tenant.updatedAt,
      };
    }

    const client = this.supabaseAdapter.getClient();
    const { data: organization, error: organizationError } = await client
      .from("organizations")
      .select("id, licensed_product_ids, updated_at")
      .eq("id", tenantId)
      .single();

    if (organizationError) throw organizationError;

    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, product_ids")
      .eq("organization_id", organization.id);

    if (usersError) throw usersError;

    const licensedProductIds = Array.isArray(
      organization.licensed_product_ids,
    )
      ? organization.licensed_product_ids
      : [];

    const usersSynchronized = (users || []).filter((user: any) => {
      const userProducts = Array.isArray(user.product_ids)
        ? user.product_ids
        : [];

      return licensedProductIds.every((productId: string) =>
        userProducts.includes(productId),
      );
    }).length;

    return {
      tenantId: organization.id,
      organizationId: organization.id,
      licensedProductIds,
      userCount: (users || []).length,
      usersSynchronized,
      updatedAt: organization.updated_at || nowIso(),
    };
  }

  async updateTenantProductLicenses(
    tenantId: string,
    input: UpdateTenantProductLicensesInput,
  ): Promise<TenantProductLicenseSnapshot> {
    const invalidProductIds = getInvalidOfficialProductIds(input.productIds);
    if (invalidProductIds.length > 0) {
      throw new Error(`Produtos não reconhecidos pelo catálogo oficial: ${invalidProductIds.join(", ")}`);
    }
    const productIds = normalizeOfficialProductIds(input.productIds);
    const synchronizeUsers = input.synchronizeUsers !== false;
    const timestamp = nowIso();

    if (this.mode === "json") {
      const directory = this.readJson();
      const tenantIndex = directory.tenants.findIndex(
        (item) => item.id === tenantId || item.organizationId === tenantId,
      );

      if (tenantIndex < 0) throw new Error("Tenant não encontrado.");

      directory.tenants[tenantIndex] = {
        ...directory.tenants[tenantIndex],
        licensedProductIds: productIds,
        updatedAt: timestamp,
      };

      if (synchronizeUsers) {
        directory.users = directory.users.map((user) => {
          if (user.organizationId !== directory.tenants[tenantIndex].organizationId) return user;
          const nextProductIds = user.profile === "tenant_admin"
            ? productIds
            : user.productIds.filter((productId) => productIds.includes(productId));
          return { ...user, productIds: nextProductIds, updatedAt: timestamp };
        });
      }

      this.writeJson(directory);
      return this.getTenantProductLicenses(
        directory.tenants[tenantIndex].id,
      );
    }

    const client = this.supabaseAdapter.getClient();
    const { data: organization, error: organizationError } = await client
      .from("organizations")
      .update({
        licensed_product_ids: productIds,
        updated_at: timestamp,
      })
      .eq("id", tenantId)
      .select("id")
      .single();

    if (organizationError) throw organizationError;

    if (synchronizeUsers) {
      const { data: tenantUsers, error: usersReadError } = await client
        .from("users")
        .select("id,profile,role,product_ids")
        .eq("organization_id", organization.id);
      if (usersReadError) throw usersReadError;

      for (const user of tenantUsers || []) {
        const profile = user.profile || user.role || "operator";
        const currentProductIds = Array.isArray(user.product_ids) ? user.product_ids : [];
        const nextProductIds = profile === "tenant_admin"
          ? productIds
          : currentProductIds.filter((productId: string) => productIds.includes(productId));
        const { error: userUpdateError } = await client
          .from("users")
          .update({ product_ids: nextProductIds, updated_at: timestamp })
          .eq("id", user.id)
          .eq("organization_id", organization.id);
        if (userUpdateError) throw userUpdateError;
      }
    }

    return this.getTenantProductLicenses(organization.id);
  }

  private readJson(): JsonAdminDirectory {
    if (!fs.existsSync(JSON_DIRECTORY_PATH)) {
      return { users: [], tenants: [] };
    }

    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_DIRECTORY_PATH, "utf-8"),
      ) as Partial<JsonAdminDirectory>;

      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
      };
    } catch {
      return { users: [], tenants: [] };
    }
  }

  private writeJson(directory: JsonAdminDirectory): void {
    fs.mkdirSync(path.dirname(JSON_DIRECTORY_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_DIRECTORY_PATH,
      JSON.stringify(directory, null, 2),
      "utf-8",
    );
  }
}
