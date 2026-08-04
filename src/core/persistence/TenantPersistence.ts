import {
  DEFAULT_PLATFORM_ORGANIZATION_ID,
  DEFAULT_PLATFORM_WORKSPACE_ID,
} from '../../contexts/platform/platformContextDefaults';
import { ClientSessionStorage } from '../auth/ClientSessionStorage';

export interface TenantPersistenceContext {
  organizationId: string;
  workspaceId?: string;
  userId: string;
  role: string;
}

export const DEFAULT_TENANT_PERSISTENCE_CONTEXT: TenantPersistenceContext = {
  organizationId: DEFAULT_PLATFORM_ORGANIZATION_ID,
  workspaceId: undefined,
  userId: 'dev-user-douglas',
  role: 'master_admin',
};

let runtimeTenantPersistenceContext: TenantPersistenceContext = {
  ...DEFAULT_TENANT_PERSISTENCE_CONTEXT,
};

export const setRuntimeTenantPersistenceContext = (
  context: Partial<TenantPersistenceContext>,
): TenantPersistenceContext => {
  runtimeTenantPersistenceContext = {
    ...runtimeTenantPersistenceContext,
    ...context,
    organizationId:
      context.organizationId ||
      runtimeTenantPersistenceContext.organizationId ||
      DEFAULT_TENANT_PERSISTENCE_CONTEXT.organizationId,
    workspaceId: context.workspaceId,
    userId:
      context.userId ||
      runtimeTenantPersistenceContext.userId ||
      DEFAULT_TENANT_PERSISTENCE_CONTEXT.userId,
    role:
      context.role ||
      runtimeTenantPersistenceContext.role ||
      DEFAULT_TENANT_PERSISTENCE_CONTEXT.role,
  };

  return runtimeTenantPersistenceContext;
};

export const getRuntimeTenantPersistenceContext = (): TenantPersistenceContext => ({
  ...runtimeTenantPersistenceContext,
});

export const resetRuntimeTenantPersistenceContext = (): void => {
  runtimeTenantPersistenceContext = {
    ...DEFAULT_TENANT_PERSISTENCE_CONTEXT,
  };
};

export const resolveTenantPersistenceContext = (
  context?: Partial<TenantPersistenceContext>,
): TenantPersistenceContext => ({
  ...runtimeTenantPersistenceContext,
  ...context,
  organizationId:
    context?.organizationId ||
    runtimeTenantPersistenceContext.organizationId ||
    DEFAULT_TENANT_PERSISTENCE_CONTEXT.organizationId,
  workspaceId: context?.workspaceId ?? runtimeTenantPersistenceContext.workspaceId,
  userId:
    context?.userId ||
    runtimeTenantPersistenceContext.userId ||
    DEFAULT_TENANT_PERSISTENCE_CONTEXT.userId,
  role:
    context?.role ||
    runtimeTenantPersistenceContext.role ||
    DEFAULT_TENANT_PERSISTENCE_CONTEXT.role,
});

export const buildTenantHeaders = (
  context?: Partial<TenantPersistenceContext>,
): Record<string, string> => {
  const tenant = resolveTenantPersistenceContext(context);

  return {
    ...ClientSessionStorage.buildAuthorizationHeader(),
    'Content-Type': 'application/json',
    'x-organization-id': tenant.organizationId,
    ...(tenant.workspaceId ? { 'x-workspace-id': tenant.workspaceId } : {}),
    'x-user-id': tenant.userId,
    'x-user-role': tenant.role,
  };
};

export const buildTenantQuery = (
  context?: Partial<TenantPersistenceContext>,
): string => {
  const tenant = resolveTenantPersistenceContext(context);
  const params = new URLSearchParams({ organizationId: tenant.organizationId });
  if (tenant.workspaceId) params.set('workspaceId', tenant.workspaceId);

  return params.toString();
};

export const buildTenantStorageKey = (
  baseKey: string,
  context?: Partial<TenantPersistenceContext>,
): string => {
  const tenant = resolveTenantPersistenceContext(context);

  return `${baseKey}:${tenant.organizationId}:${tenant.workspaceId || 'platform'}`;
};
