import { useCallback, useEffect, useState } from 'react';
import { AdminDirectoryService } from '../core/admin/AdminDirectoryService';
import type {
  CreateAdminTenantInput,
  InviteAdminUserInput,
  UpdateAdminUserInput,
  UpdateAdminTenantInput,
} from '../core/admin/AdminDirectoryTypes';
import type { PlatformUserDefinition } from '../core/users/UserRegistry';
import type { TenantDefinition } from '../core/tenants/TenantRegistry';

export default function useAdminDirectory() {
  const [users, setUsers] = useState<PlatformUserDefinition[]>([]);
  const [tenants, setTenants] = useState<TenantDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [nextUsers, nextTenants] = await Promise.all([
        AdminDirectoryService.listUsers(),
        AdminDirectoryService.listTenants(),
      ]);
      setUsers(nextUsers);
      setTenants(nextTenants);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inviteUser = useCallback(async (input: InviteAdminUserInput) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const user = await AdminDirectoryService.inviteUser(input);
      setUsers((current) => [...current.filter((item) => item.id !== user.id), user]);
      return user;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, input: UpdateAdminUserInput) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const user = await AdminDirectoryService.updateUser(userId, input);
      setUsers((current) => current.map((item) => item.id === user.id ? user : item));
      return user;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateTenant = useCallback(async (tenantId: string, input: UpdateAdminTenantInput) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const tenant = await AdminDirectoryService.updateTenant(tenantId, input);
      setTenants((current) => current.map((item) => item.id === tenant.id ? tenant : item));
      return tenant;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const createTenant = useCallback(async (input: CreateAdminTenantInput) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const tenant = await AdminDirectoryService.createTenant(input);
      setTenants((current) => [...current.filter((item) => item.id !== tenant.id), tenant]);
      return tenant;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    users,
    tenants,
    isLoading,
    isSaving,
    error,
    refresh,
    inviteUser,
    updateUser,
    createTenant,
    updateTenant,
  };
}
