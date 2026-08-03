import type { TenantCommercialContract } from '../commercial/TenantCommercialContractTypes';
import type { TenantDefinition } from '../tenants/TenantRegistry';

export interface ClientActivationCheck {
  id: 'organization' | 'workspace' | 'administrator' | 'products' | 'contract';
  label: string;
  ready: boolean;
  detail: string;
}

export interface ClientActivationReadiness {
  score: number;
  readyForActivation: boolean;
  checks: ClientActivationCheck[];
  contract?: TenantCommercialContract;
}

export class ClientActivationReadinessService {
  static evaluate(
    tenant: TenantDefinition,
    contracts: TenantCommercialContract[],
  ): ClientActivationReadiness {
    const contract = contracts
      .filter((item) => item.tenantId === tenant.id || item.tenantId === tenant.organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    const checks: ClientActivationCheck[] = [
      {
        id: 'organization',
        label: 'Organização e tenant',
        ready: Boolean(tenant.organizationId && tenant.id && tenant.name.trim()),
        detail: tenant.organizationId || 'Organização não persistida',
      },
      {
        id: 'workspace',
        label: 'Workspace principal',
        ready: Boolean(tenant.workspaceId && tenant.workspaceId !== 'default-workspace'),
        detail: tenant.workspaceId || 'Workspace não criado',
      },
      {
        id: 'administrator',
        label: 'Administrador inicial',
        ready: Boolean(tenant.primaryAdminName && tenant.primaryAdminEmail?.includes('@')),
        detail: tenant.primaryAdminEmail || 'Administrador não definido',
      },
      {
        id: 'products',
        label: 'Produtos licenciados',
        ready: tenant.licensedProductIds.length > 0,
        detail: tenant.licensedProductIds.length > 0
          ? `${tenant.licensedProductIds.length} produto(s) liberado(s)`
          : 'Nenhum produto licenciado',
      },
      {
        id: 'contract',
        label: 'Contrato comercial',
        ready: Boolean(contract && ['active', 'trial'].includes(contract.status)),
        detail: contract
          ? `${contract.planName} · ${contract.status}`
          : 'Contrato não encontrado',
      },
    ];

    const completed = checks.filter((item) => item.ready).length;
    const score = Math.round((completed / checks.length) * 100);

    return {
      score,
      readyForActivation: score === 100,
      checks,
      contract,
    };
  }
}
