import React, { useEffect, useMemo } from 'react';
import type { Project } from '../../types';
import {
  getProductByTab,
  getProductWorkspaceKeyByTab,
} from '../../products/productRegistry';
import { PlatformContextProvider } from '../../contexts/platform/PlatformContext';
import {
  DEFAULT_PLATFORM_ORGANIZATION_ID,
  DEFAULT_PLATFORM_WORKSPACE_ID,
  resolvePlatformRole,
} from '../../contexts/platform/platformContextDefaults';
import type { PlatformContextValue, PlatformUserContext } from '../../contexts/platform/platformContextTypes';
import { setRuntimeTenantPersistenceContext } from '../../core/persistence/TenantPersistence';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';
import { OperationalContextResolver } from '../../core/tenants/OperationalContextResolver';

interface PlatformProviderProps {
  user: PlatformUserContext | null;
  selectedProjectId: string;
  projects: Project[];
  activeTab: string;
  children: React.ReactNode;
}

/**
 * PlatformProvider
 * Primeira implementação incremental do Platform Context.
 *
 * Responsabilidade:
 * - derivar contexto a partir de dados já existentes no frontend;
 * - identificar produto ativo usando Product Registry;
 * - preparar Sidebar, WorkspaceRouter e Beta IA para consumir contexto centralizado;
 * - não substituir permissões backend;
 * - não buscar dados diretamente.
 */
export default function PlatformProvider({
  user,
  selectedProjectId,
  projects,
  activeTab,
  children,
}: PlatformProviderProps) {
  useEffect(() => {
    setRuntimeTenantPersistenceContext({
      organizationId: user?.organizationId || DEFAULT_PLATFORM_ORGANIZATION_ID,
      workspaceId: user?.workspaceId || DEFAULT_PLATFORM_WORKSPACE_ID,
      userId: user?.id || 'dev-user-douglas',
      role: user?.role || 'master_admin',
    });
  }, [user?.id, user?.organizationId, user?.role, user?.workspaceId]);

  const value = useMemo<PlatformContextValue>(() => {
    const activeProduct = getProductByTab(activeTab);
    const activeWorkspaceKey = getProductWorkspaceKeyByTab(activeTab);
    const productAccess = ProductAccessService.buildSnapshot(user);

    const operationalContext = OperationalContextResolver.resolve(user);
    const organizationId = operationalContext.organizationId || DEFAULT_PLATFORM_ORGANIZATION_ID;
    const workspaceId = operationalContext.workspaceId || DEFAULT_PLATFORM_WORKSPACE_ID;

    return {
      currentUser: user,
      currentRole: resolvePlatformRole(user),
      currentTenant: {
        id: operationalContext.tenantId,
        organizationId,
        workspaceId,
      },
      selectedProjectId,
      projects,
      activeTab,
      activeProduct,
      activeWorkspaceKey,
      licensedProductIds: productAccess.licensedProductIds,
      isPrivilegedProductAccess: productAccess.isPrivileged,
      productAccessCoverage: productAccess.coverageScore,
      availableProducts: productAccess.availableProducts,
      unavailableProducts: productAccess.unavailableProducts,
      isTabLicensed: (tabId: string) =>
        ProductAccessService.canAccessTab(tabId, productAccess),
      isProductLicensed: (productId: string) =>
        ProductAccessService.canAccessProductId(productId, productAccess),
      betaContext: {
        activeProductId: activeProduct?.id,
        activeProductName: activeProduct?.commercialName,
        activeWorkspaceKey,
        activeTab,
        selectedProjectId,
      },
    };
  }, [activeTab, projects, selectedProjectId, user]);

  return (
    <PlatformContextProvider value={value}>
      {children}
    </PlatformContextProvider>
  );
}
