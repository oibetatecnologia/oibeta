import { AdminDirectoryService } from '../admin/AdminDirectoryService';
import { TenantCommercialContractService } from '../commercial/TenantCommercialContractService';
import type { TenantCommercialContract } from '../commercial/TenantCommercialContractTypes';
import type { TenantDefinition } from '../tenants/TenantRegistry';
import type { ClientRecord, ClientEntityType } from '../../hooks/useClientState';
import type { TenantType } from '../tenants/TenantRegistry';
import { normalizeOfficialProductIds } from '../../products/officialProductIds';

export interface ClientProvisioningReadiness {
  tenantLinked: boolean;
  contractLinked: boolean;
  licenseActive: boolean;
  administratorReady: boolean;
  implementationReady: boolean;
  goLiveReady: boolean;
  score: number;
  tenant?: TenantDefinition;
  contract?: TenantCommercialContract;
  productIds: string[];
  blockers: string[];
}

export interface ClientProvisioningResolution {
  organizationId: string;
  tenantId: string;
  tenantCommercialContractId: string;
  productIds: string[];
  readiness: ClientProvisioningReadiness;
}

const ACTIVE_CONTRACT_STATUSES = new Set(['trial', 'active']);

export class ClientProvisioningService {
  static async resolve(client: ClientRecord): Promise<ClientProvisioningResolution> {
    const [tenants, contracts] = await Promise.all([
      AdminDirectoryService.listTenants(),
      TenantCommercialContractService.list(),
    ]);

    let tenant = this.findTenant(client, tenants);
    if (!tenant) {
      tenant = await this.createTenantFromClient(client);
    }

    let contract = this.findContract(client, tenant, contracts);
    if (!contract) {
      contract = await this.createCommercialContractFromClient(client, tenant);
    }

    const productIds = normalizeOfficialProductIds(contract.productIds);
    if (productIds.length === 0) {
      throw new Error('O contrato comercial não possui produtos oficiais válidos para licenciamento.');
    }

    const readiness = this.buildReadiness(client, tenant, contract, productIds);

    return {
      organizationId: tenant.organizationId,
      tenantId: tenant.id,
      tenantCommercialContractId: contract.id,
      productIds,
      readiness,
    };
  }

  static buildReadiness(
    client: ClientRecord,
    tenant?: TenantDefinition,
    contract?: TenantCommercialContract,
    productIds: string[] = [],
  ): ClientProvisioningReadiness {
    const tenantLinked = Boolean(tenant || client.tenantId || client.organizationId);
    const contractLinked = Boolean(contract || client.tenantCommercialContractId);
    const licenseActive = Boolean(contract && ACTIVE_CONTRACT_STATUSES.has(contract.status) && productIds.length > 0);
    const administratorReady = Boolean(tenant?.primaryAdminEmail && tenant?.primaryAdminName);
    const implementationReady = client.implementations.length > 0;
    const goLiveReady = client.implementations.some((item) => item.status === 'completed' || item.status === 'go_live');

    const checks = [tenantLinked, contractLinked, licenseActive, administratorReady, implementationReady, goLiveReady];
    const blockers: string[] = [];
    if (!tenantLinked) blockers.push('Tenant não vinculado');
    if (!contractLinked) blockers.push('Contrato comercial não vinculado');
    if (!licenseActive) blockers.push('Licença ativa não confirmada');
    if (!administratorReady) blockers.push('Administrador do cliente não confirmado');
    if (!implementationReady) blockers.push('Implantação não criada');
    if (!goLiveReady) blockers.push('Go-live ainda não concluído');

    return {
      tenantLinked,
      contractLinked,
      licenseActive,
      administratorReady,
      implementationReady,
      goLiveReady,
      score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      tenant,
      contract,
      productIds,
      blockers,
    };
  }


  private static async createTenantFromClient(client: ClientRecord): Promise<TenantDefinition> {
    const productIds = this.resolveClientProductIds(client);
    if (productIds.length === 0) {
      throw new Error('O cliente não possui produtos contratados válidos para criar o ambiente.');
    }

    const administratorEmail = this.resolveAdministratorEmail(client);
    if (!administratorEmail) {
      throw new Error('Informe um e-mail válido para o administrador do cliente antes do provisionamento.');
    }

    return AdminDirectoryService.createTenant({
      name: client.name || client.entity,
      type: this.mapTenantType(client.entityType),
      status: 'implementation',
      licensedProductIds: productIds,
      primaryAdminName: client.manager || client.contacts[0]?.name || 'Administrador do Cliente',
      primaryAdminEmail: administratorEmail,
    });
  }

  private static async createCommercialContractFromClient(
    client: ClientRecord,
    tenant: TenantDefinition,
  ): Promise<TenantCommercialContract> {
    const crmContract = [...client.contracts]
      .filter((item) => item.status === 'active' || item.status === 'signed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!crmContract) {
      throw new Error('Nenhum contrato assinado ou ativo foi encontrado no CRM para provisionar o tenant.');
    }

    const productIds = this.resolveClientProductIds(client);
    return TenantCommercialContractService.save({
      tenantId: tenant.id,
      planName: crmContract.title || `Contrato ${client.name || client.entity}`,
      status: 'active',
      productIds,
      monthlyValue: crmContract.monthlyValue || 0,
      setupValue: crmContract.setupValue || 0,
      billingDay: 10,
      startDate: crmContract.startDate || new Date().toISOString().slice(0, 10),
      endDate: crmContract.endDate,
      autoRenew: true,
      responsible: client.manager || 'Oi Beta',
      notes: `Provisionado a partir do contrato CRM ${crmContract.id}.`,
    });
  }

  private static resolveClientProductIds(client: ClientRecord): string[] {
    const linked = client.products
      .filter((item) => item.status === 'contracted' || item.status === 'implantation')
      .map((item) => item.productId);
    const proposalProducts = client.proposals
      .filter((item) => item.status === 'accepted')
      .flatMap((item) => item.productIds);
    return normalizeOfficialProductIds([...linked, ...proposalProducts]);
  }

  private static resolveAdministratorEmail(client: ClientRecord): string | undefined {
    const contactEmail = client.contacts.find((item) => item.email?.includes('@'))?.email;
    if (contactEmail) return contactEmail.trim().toLowerCase();
    return client.contact?.includes('@') ? client.contact.trim().toLowerCase() : undefined;
  }

  private static mapTenantType(entityType: ClientEntityType): TenantType {
    if (entityType === 'city_hall') return 'city_hall';
    if (entityType === 'city_council') return 'city_council';
    if (entityType === 'consortium') return 'public_consortium';
    if (entityType === 'other') return 'private_organization';
    return 'autarchy';
  }

  private static findTenant(client: ClientRecord, tenants: TenantDefinition[]): TenantDefinition | undefined {
    const explicitId = client.tenantId || client.organizationId;
    if (explicitId) {
      const explicit = tenants.find((item) => item.id === explicitId || item.organizationId === explicitId);
      if (explicit) return explicit;
    }

    const clientName = normalizeName(client.name || client.entity);
    return tenants.find((item) => normalizeName(item.name) === clientName);
  }

  private static findContract(
    client: ClientRecord,
    tenant: TenantDefinition,
    contracts: TenantCommercialContract[],
  ): TenantCommercialContract | undefined {
    if (client.tenantCommercialContractId) {
      const explicit = contracts.find((item) => item.id === client.tenantCommercialContractId);
      if (explicit) return explicit;
    }

    return contracts
      .filter((item) => item.tenantId === tenant.id || item.organizationId === tenant.organizationId)
      .filter((item) => ACTIVE_CONTRACT_STATUSES.has(item.status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}
