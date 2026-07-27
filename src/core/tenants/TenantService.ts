import { getActiveProducts } from '../../products/productRegistry';
import {
  createTenantFromRuntimeContext,
  getTenantStatusLabel,
  getTenantTypeLabel,
  type TenantDefinition,
  type TenantStatus,
  type TenantType,
} from './TenantRegistry';

export interface TenantRuntimeContext {
  organizationId?: string;
  workspaceId?: string;
  selectedProjectName?: string;
}

export interface TenantOperationalSummary {
  totalTenants: number;
  activeTenants: number;
  implementationTenants: number;
  pausedTenants: number;
  licensedProductsCount: number;
}

export interface TenantOperationalSnapshot {
  tenants: TenantDefinition[];
  summary: TenantOperationalSummary;
}

/**
 * TenantService
 *
 * Camada inicial da capacidade Gestão de Tenants.
 * Nesta fase, não acessa backend diretamente.
 * Ela normaliza dados existentes do runtime e prepara a futura integração
 * com SuperAdminEngine / APIs administrativas.
 */
export class TenantService {
  static buildRuntimeTenant(context: TenantRuntimeContext): TenantDefinition {
    return createTenantFromRuntimeContext({
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      selectedProjectName: context.selectedProjectName,
      licensedProducts: getActiveProducts(),
    });
  }

  static buildOperationalSnapshot(context: TenantRuntimeContext): TenantOperationalSnapshot {
    const tenant = this.buildRuntimeTenant(context);

    const tenants = [tenant];

    return {
      tenants,
      summary: {
        totalTenants: tenants.length,
        activeTenants: tenants.filter((item) => item.status === 'active').length,
        implementationTenants: tenants.filter((item) => item.status === 'implementation').length,
        pausedTenants: tenants.filter((item) => item.status === 'paused').length,
        licensedProductsCount: tenant.licensedProductIds.length,
      },
    };
  }

  static getTypeLabel(type: TenantType): string {
    return getTenantTypeLabel(type);
  }

  static getStatusLabel(status: TenantStatus): string {
    return getTenantStatusLabel(status);
  }

  static getStatusTone(status: TenantStatus): 'success' | 'warning' | 'neutral' | 'danger' {
    if (status === 'active') return 'success';
    if (status === 'implementation') return 'warning';
    if (status === 'paused') return 'neutral';
    return 'danger';
  }
}
