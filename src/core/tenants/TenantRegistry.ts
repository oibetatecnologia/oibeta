import type { ProductDefinition } from '../../products/productRegistry';

export type TenantType = 'city_hall' | 'city_council' | 'autarchy' | 'public_consortium' | 'private_organization';

export type TenantStatus = 'implementation' | 'active' | 'paused' | 'inactive';

export interface TenantDefinition {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: TenantType;
  status: TenantStatus;
  licensedProductIds: string[];
  primaryAdminName?: string;
  primaryAdminEmail?: string;
}

export interface TenantRegistryInput {
  organizationId?: string;
  workspaceId?: string;
  selectedProjectName?: string;
  licensedProducts?: ProductDefinition[];
}

/**
 * TenantRegistry
 *
 * Primeira base incremental para a gestão de tenants.
 * Não busca dados diretamente e não substitui persistência backend.
 * Apenas normaliza o contexto já disponível no frontend para uso administrativo.
 */
export function createTenantFromRuntimeContext(input: TenantRegistryInput): TenantDefinition {
  const organizationId = input.organizationId || 'org-oi-beta';
  const workspaceId = input.workspaceId || 'default-workspace';

  return {
    id: organizationId,
    organizationId,
    workspaceId,
    name: input.selectedProjectName || organizationId,
    type: 'city_hall',
    status: 'implementation',
    licensedProductIds: (input.licensedProducts || []).map((product) => product.id),
  };
}

export function getTenantTypeLabel(type: TenantType): string {
  const labels: Record<TenantType, string> = {
    city_hall: 'Prefeitura',
    city_council: 'Câmara Municipal',
    autarchy: 'Autarquia',
    public_consortium: 'Consórcio Público',
    private_organization: 'Organização Privada',
  };

  return labels[type];
}

export function getTenantStatusLabel(status: TenantStatus): string {
  const labels: Record<TenantStatus, string> = {
    implementation: 'Em implantação',
    active: 'Ativo',
    paused: 'Pausado',
    inactive: 'Inativo',
  };

  return labels[status];
}
