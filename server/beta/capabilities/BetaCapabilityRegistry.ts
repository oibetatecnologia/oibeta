import type { CurrentUser } from "../../auth/currentUser";

export type BetaCapabilityId =
  | "radar.read"
  | "radar.explain"
  | "radar.qualify"
  | "radar.send_to_crm"
  | "radar.create_task";

export interface BetaCapabilityDefinition {
  id: BetaCapabilityId;
  label: string;
  description: string;
  productId: string;
  requiredRoles: string[];
  confirmationRequired: boolean;
  executionType: "read" | "write";
}

export interface BetaCapabilityAvailability extends BetaCapabilityDefinition {
  available: boolean;
  reason?: string;
}

const COMMERCIAL_ROLES = ["master_admin", "tenant_admin", "executive", "manager", "operator"];

const CAPABILITIES: BetaCapabilityDefinition[] = [
  {
    id: "radar.read",
    label: "Consultar Radar Comercial",
    description: "Consultar oportunidades e indicadores reais do Radar Comercial.",
    productId: "radar-comercial",
    requiredRoles: COMMERCIAL_ROLES,
    confirmationRequired: false,
    executionType: "read",
  },
  {
    id: "radar.explain",
    label: "Explicar oportunidade",
    description: "Explicar score, evidências, hipóteses e aderência ao portfólio.",
    productId: "radar-comercial",
    requiredRoles: COMMERCIAL_ROLES,
    confirmationRequired: false,
    executionType: "read",
  },
  {
    id: "radar.qualify",
    label: "Qualificar oportunidade",
    description: "Alterar uma oportunidade para qualificada após confirmação humana.",
    productId: "radar-comercial",
    requiredRoles: COMMERCIAL_ROLES,
    confirmationRequired: true,
    executionType: "write",
  },
  {
    id: "radar.send_to_crm",
    label: "Enviar oportunidade ao CRM",
    description: "Criar ou atualizar o prospect correspondente no CRM e manter o vínculo com o Radar.",
    productId: "radar-comercial",
    requiredRoles: COMMERCIAL_ROLES,
    confirmationRequired: true,
    executionType: "write",
  },
  {
    id: "radar.create_task",
    label: "Criar tarefa comercial",
    description: "Criar uma próxima ação comercial vinculada à oportunidade.",
    productId: "radar-comercial",
    requiredRoles: COMMERCIAL_ROLES,
    confirmationRequired: true,
    executionType: "write",
  },
];

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export class BetaCapabilityRegistry {
  static list(): BetaCapabilityDefinition[] {
    return CAPABILITIES.map((capability) => ({ ...capability }));
  }

  static resolveForUser(user: CurrentUser): BetaCapabilityAvailability[] {
    const tenantProductIds = unique(user.licensedProductIds || []);
    const assignedProductIds = unique(user.productIds || []);
    const effectiveProductIds = assignedProductIds.length > 0
      ? assignedProductIds.filter((productId) => tenantProductIds.includes(productId))
      : tenantProductIds;
    const isOiBetaMaster = user.role === "master_admin" && user.organizationId === "org-oi-beta";

    return CAPABILITIES.map((capability) => {
      if (!capability.requiredRoles.includes(user.role)) {
        return { ...capability, available: false, reason: "O perfil do usuário não possui permissão operacional." };
      }

      if (!isOiBetaMaster && !effectiveProductIds.includes(capability.productId)) {
        return { ...capability, available: false, reason: "O produto Radar Comercial não está disponível para este usuário." };
      }

      return { ...capability, available: true };
    });
  }

  static can(user: CurrentUser, capabilityId: BetaCapabilityId): BetaCapabilityAvailability {
    const capability = this.resolveForUser(user).find((item) => item.id === capabilityId);
    if (!capability) {
      throw new Error(`Capacidade desconhecida: ${capabilityId}`);
    }
    return capability;
  }
}
