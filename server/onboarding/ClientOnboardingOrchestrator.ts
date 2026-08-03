import type { AdminDirectoryService } from "../admin/AdminDirectoryService.ts";
import type { AdminDirectoryTenant } from "../admin/AdminDirectoryTypes.ts";
import type { TenantCommercialContractService } from "../commercial/TenantCommercialContractService.ts";
import type { TenantCommercialContract } from "../commercial/TenantCommercialContractTypes.ts";
import type { TenantProductInstallationService } from "../products/TenantProductInstallationService.ts";
import { normalizeOfficialProductIds } from "../../src/products/officialProductIds.ts";

export interface CreateClientOnboardingInput {
  organizationName: string;
  tenantType: AdminDirectoryTenant["type"];
  administratorName: string;
  administratorEmail: string;
  productIds: string[];
  planName: string;
  monthlyValue: number;
  setupValue: number;
  billingDay: number;
  startDate: string;
  responsible: string;
  notes?: string;
}

export interface ClientActivationCheck {
  id: "organization" | "workspace" | "administrator" | "products" | "product_runtime" | "contract";
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

export interface ClientOnboardingResult {
  tenant: AdminDirectoryTenant;
  contract: TenantCommercialContract;
  readiness: ClientActivationReadiness;
  completedAt: string;
}

export class ClientOnboardingOrchestrator {
  constructor(
    private readonly directory: AdminDirectoryService,
    private readonly contracts: TenantCommercialContractService,
    private readonly productInstallations: TenantProductInstallationService,
  ) {}

  async create(input: CreateClientOnboardingInput): Promise<ClientOnboardingResult> {
    const organizationName = input.organizationName.trim();
    const administratorName = input.administratorName.trim();
    const administratorEmail = input.administratorEmail.trim().toLowerCase();
    const productIds = normalizeOfficialProductIds(input.productIds);

    if (!organizationName) throw new Error("Informe o nome da organização cliente.");
    if (!administratorName) throw new Error("Informe o nome do administrador do cliente.");
    if (!administratorEmail.includes("@")) throw new Error("Informe um e-mail válido para o administrador.");
    if (productIds.length === 0) throw new Error("Selecione pelo menos um produto comercial.");
    if (!input.planName.trim()) throw new Error("Informe o nome do plano ou contrato.");
    if (!input.startDate) throw new Error("Informe a data de início do contrato.");
    if (!input.responsible.trim()) throw new Error("Informe o responsável da Oi Beta.");

    const tenant = await this.directory.createTenant({
      name: organizationName,
      type: input.tenantType,
      status: "implementation",
      licensedProductIds: productIds,
      primaryAdminName: administratorName,
      primaryAdminEmail: administratorEmail,
    });

    try {
      const contract = await this.contracts.save({
        tenantId: tenant.id,
        planName: input.planName.trim(),
        status: "active",
        productIds,
        monthlyValue: Math.max(0, Number(input.monthlyValue) || 0),
        setupValue: Math.max(0, Number(input.setupValue) || 0),
        billingDay: Math.min(28, Math.max(1, Number(input.billingDay) || 10)),
        startDate: input.startDate,
        autoRenew: true,
        responsible: input.responsible.trim(),
        notes: input.notes?.trim() || undefined,
      });
      await this.productInstallations.sync({
        tenantId: tenant.id,
        organizationId: tenant.organizationId,
        workspaceId: tenant.workspaceId,
        productIds,
      });
      const readiness = await this.evaluate(tenant.id);
      return { tenant, contract, readiness, completedAt: new Date().toISOString() };
    } catch (error) {
      throw new Error(`O tenant ${tenant.name} foi criado, mas a ativação comercial ficou pendente. Motivo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async evaluate(tenantId: string): Promise<ClientActivationReadiness> {
    const tenant = (await this.directory.listTenants()).find(
      (item) => item.id === tenantId || item.organizationId === tenantId,
    );
    if (!tenant) throw new Error("Tenant não encontrado.");

    const contract = (await this.contracts.list(tenant.id))[0];
    const users = await this.directory.listUsers(tenant.organizationId);
    const administrator = users.find(
      (user) => user.profile === "tenant_admin" && user.email.toLowerCase() === tenant.primaryAdminEmail?.toLowerCase(),
    );
    const productRuntimeReady = await this.productInstallations.isReady(tenant.organizationId, tenant.licensedProductIds);

    const checks: ClientActivationCheck[] = [
      { id: "organization", label: "Organização e tenant", ready: Boolean(tenant.organizationId && tenant.id && tenant.name.trim()), detail: tenant.organizationId || "Organização não persistida" },
      { id: "workspace", label: "Workspace principal", ready: Boolean(tenant.workspaceId && tenant.workspaceId !== "default-workspace"), detail: tenant.workspaceId || "Workspace não criado" },
      { id: "administrator", label: "Administrador inicial", ready: Boolean(administrator && ["invited", "active"].includes(administrator.status)), detail: administrator ? `${administrator.email} · ${administrator.status}` : "Administrador não localizado no diretório" },
      { id: "products", label: "Produtos licenciados", ready: tenant.licensedProductIds.length > 0, detail: tenant.licensedProductIds.length > 0 ? `${tenant.licensedProductIds.length} produto(s) liberado(s)` : "Nenhum produto licenciado" },
      { id: "product_runtime", label: "Recursos dos produtos", ready: productRuntimeReady, detail: productRuntimeReady ? "Capacidades e configurações provisionadas no tenant" : "Provisionamento operacional dos produtos pendente" },
      { id: "contract", label: "Contrato comercial", ready: Boolean(contract && ["active", "trial"].includes(contract.status)), detail: contract ? `${contract.planName} · ${contract.status}` : "Contrato não encontrado" },
    ];
    const score = Math.round((checks.filter((item) => item.ready).length / checks.length) * 100);
    return { score, readyForActivation: score === 100, checks, contract };
  }

  async activate(tenantId: string): Promise<{ tenant: AdminDirectoryTenant; readiness: ClientActivationReadiness }> {
    const readiness = await this.evaluate(tenantId);
    if (!readiness.readyForActivation) {
      const pending = readiness.checks.filter((item) => !item.ready).map((item) => item.label).join(", ");
      throw new Error(`O cliente ainda não pode ser liberado. Pendências: ${pending}.`);
    }
    const tenant = await this.directory.updateTenant(tenantId, { status: "active" });
    return { tenant, readiness: await this.evaluate(tenant.id) };
  }
}
