import crypto from "crypto";
import type { DatabaseAdapter } from "../../database/DatabaseAdapter";
import type { CurrentUser } from "../../auth/currentUser";
import { BetaCapabilityRegistry, type BetaCapabilityId } from "./BetaCapabilityRegistry";

interface PendingCommercialAction {
  type: "BETA_COMMERCIAL_CAPABILITY";
  capabilityId: BetaCapabilityId;
  opportunityId: string;
  description: string;
}

export interface CommercialCapabilityResponse {
  message: string;
  suggestions?: Record<string, unknown> | null;
  actionExecuted?: string;
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function isAffirmative(message: string): boolean {
  const value = normalize(message);
  return ["sim", "confirmo", "confirmar", "pode", "pode executar", "prosseguir", "ok", "concordo"].some((term) => value === term || value.startsWith(`${term} `));
}

function isNegative(message: string): boolean {
  const value = normalize(message);
  return ["nao", "cancelar", "cancela", "parar", "abortar"].some((term) => value === term || value.startsWith(`${term} `));
}

export class BetaCommercialCapabilityEngine {
  constructor(private readonly db: DatabaseAdapter) {}

  private async listOpportunities(user: CurrentUser, workspaceId: string): Promise<any[]> {
    return this.db.getCommercialOpportunities(user.organizationId, workspaceId);
  }

  private selectOpportunity(message: string, opportunities: any[]): any | null {
    if (opportunities.length === 0) return null;
    const normalizedMessage = normalize(message);

    const explicit = opportunities.find((opportunity) =>
      normalizedMessage.includes(normalize(String(opportunity.id))) ||
      (opportunity.externalId && normalizedMessage.includes(normalize(String(opportunity.externalId)))) ||
      (opportunity.processNumber && normalizedMessage.includes(normalize(String(opportunity.processNumber)))) ||
      normalizedMessage.includes(normalize(String(opportunity.title)))
    );
    if (explicit) return explicit;

    return [...opportunities].sort((a, b) => Number(b.analysis?.iac || 0) - Number(a.analysis?.iac || 0))[0] || null;
  }

  private detectCapability(message: string): BetaCapabilityId | null {
    const value = normalize(message);
    if ((value.includes("enviar") || value.includes("mandar") || value.includes("vincular")) && value.includes("crm")) return "radar.send_to_crm";
    if ((value.includes("qualificar") || value.includes("qualifique")) && value.includes("oportunidade")) return "radar.qualify";
    if ((value.includes("criar") || value.includes("gere") || value.includes("gerar")) && value.includes("tarefa") && (value.includes("comercial") || value.includes("oportunidade"))) return "radar.create_task";
    if ((value.includes("explique") || value.includes("explicar") || value.includes("por que") || value.includes("porque")) && value.includes("oportunidade")) return "radar.explain";
    return null;
  }

  async prepareFromMessage(message: string, user: CurrentUser, workspaceId: string): Promise<CommercialCapabilityResponse | null> {
    const capabilityId = this.detectCapability(message);
    if (!capabilityId) return null;

    const availability = BetaCapabilityRegistry.can(user, capabilityId);
    if (!availability.available) {
      return { message: `Não posso executar essa ação: ${availability.reason}` };
    }

    const opportunities = await this.listOpportunities(user, workspaceId);
    const opportunity = this.selectOpportunity(message, opportunities);
    if (!opportunity) {
      return { message: "Não encontrei uma oportunidade registrada no Radar para executar essa ação." };
    }

    if (capabilityId === "radar.explain") {
      return { message: this.explainOpportunity(opportunity) };
    }

    if (capabilityId === "radar.send_to_crm" && opportunity.qualificationStatus !== "qualified") {
      return { message: `A oportunidade **${opportunity.title}** ainda não está qualificada. Qualifique-a primeiro para preservar o controle do funil comercial.` };
    }

    const description = this.describeAction(capabilityId, opportunity);
    const pendingAction: PendingCommercialAction = {
      type: "BETA_COMMERCIAL_CAPABILITY",
      capabilityId,
      opportunityId: opportunity.id,
      description,
    };

    return {
      message: `${description}\n\nEsta ação altera dados comerciais. Confirma a execução?`,
      suggestions: { pendingAction },
    };
  }

  async processPendingConfirmation(message: string, lastBetaMessage: any, user: CurrentUser, workspaceId: string): Promise<CommercialCapabilityResponse | null> {
    const pending = lastBetaMessage?.suggestions?.pendingAction as PendingCommercialAction | undefined;
    if (!pending || pending.type !== "BETA_COMMERCIAL_CAPABILITY") return null;

    if (isNegative(message)) {
      await this.audit(user, workspaceId, pending.capabilityId, "CANCELLED", { opportunityId: pending.opportunityId });
      return { message: "Ação comercial cancelada. Nenhum dado foi alterado." };
    }
    if (!isAffirmative(message)) return null;

    const availability = BetaCapabilityRegistry.can(user, pending.capabilityId);
    if (!availability.available) {
      await this.audit(user, workspaceId, pending.capabilityId, "DENIED", { opportunityId: pending.opportunityId, reason: availability.reason });
      return { message: `A ação não foi executada: ${availability.reason}` };
    }

    const opportunities = await this.listOpportunities(user, workspaceId);
    const opportunity = opportunities.find((item) => item.id === pending.opportunityId);
    if (!opportunity) return { message: "A oportunidade não foi localizada. Nenhum dado foi alterado." };

    try {
      let response: CommercialCapabilityResponse;
      if (pending.capabilityId === "radar.qualify") response = await this.qualify(opportunity, user, workspaceId);
      else if (pending.capabilityId === "radar.send_to_crm") response = await this.sendToCrm(opportunity, user, workspaceId);
      else if (pending.capabilityId === "radar.create_task") response = await this.createCommercialTask(opportunity, user, workspaceId);
      else return null;

      await this.audit(user, workspaceId, pending.capabilityId, "EXECUTED", { opportunityId: opportunity.id });
      return response;
    } catch (error: any) {
      await this.audit(user, workspaceId, pending.capabilityId, "FAILED", { opportunityId: opportunity.id, error: error?.message || String(error) });
      return { message: `Não consegui concluir a ação: ${error?.message || "falha operacional não identificada"}.` };
    }
  }

  private explainOpportunity(opportunity: any): string {
    const analysis = opportunity.analysis;
    if (!analysis) return `A oportunidade **${opportunity.title}** ainda não possui análise persistida.`;
    const matches = (analysis.bestMatches || []).slice(0, 3).map((match: any) => `- ${match.serviceName}: aderência ${match.score}%`).join("\n") || "- Nenhum produto aderente identificado.";
    const evidence = (analysis.findings || []).filter((finding: any) => finding.kind === "evidence").slice(0, 4).map((finding: any) => `- ${finding.label}: ${finding.detail}`).join("\n") || "- Nenhuma evidência explícita registrada.";
    const limitations = (analysis.findings || []).filter((finding: any) => ["hypothesis", "missing_information"].includes(finding.kind)).slice(0, 4).map((finding: any) => `- ${finding.label}: ${finding.detail}`).join("\n") || "- Nenhuma limitação adicional registrada.";
    return `**${opportunity.title}**\n\nIAC: **${analysis.iac}** • Confiança: **${analysis.confidence}** • Qualificação: **${opportunity.qualificationStatus}**\n\nProdutos aderentes:\n${matches}\n\nEvidências:\n${evidence}\n\nLimitações e informações ausentes:\n${limitations}\n\nPróxima ação registrada: ${analysis.recommendedAction}`;
  }

  private describeAction(capabilityId: BetaCapabilityId, opportunity: any): string {
    if (capabilityId === "radar.qualify") return `Vou qualificar a oportunidade **${opportunity.title}** no Radar Comercial.`;
    if (capabilityId === "radar.send_to_crm") return `Vou enviar a oportunidade **${opportunity.title}** ao CRM, vinculando o órgão comprador e os produtos aderentes.`;
    return `Vou criar uma tarefa comercial vinculada à oportunidade **${opportunity.title}**.`;
  }

  private async qualify(opportunity: any, user: CurrentUser, workspaceId: string): Promise<CommercialCapabilityResponse> {
    const updated = await this.db.updateCommercialOpportunity(opportunity.id, user.organizationId, workspaceId, {
      qualificationStatus: "qualified",
      status: opportunity.status === "draft" || opportunity.status === "new" ? "analyzed" : opportunity.status,
      updatedAt: new Date().toISOString(),
    });
    return { message: `A oportunidade **${updated.title}** foi qualificada com sucesso.`, actionExecuted: "radar.qualify" };
  }

  private async createCommercialTask(opportunity: any, user: CurrentUser, workspaceId: string): Promise<CommercialCapabilityResponse> {
    const productId = opportunity.analysis?.bestMatches?.[0]?.productId;
    const task = {
      id: `task-beta-${opportunity.id}-${Date.now()}`,
      title: `Avançar oportunidade: ${opportunity.title}`,
      description: `Revisar evidências, prazo e estratégia comercial da oportunidade ${opportunity.title}.`,
      priority: opportunity.priority || "high",
      relatedProductId: productId,
      sourceOpportunityId: opportunity.id,
      organizationId: user.organizationId,
      workspaceId,
    };
    await this.db.createCommercialTasks([task]);
    return { message: `Criei a tarefa comercial **${task.title}**, vinculada à oportunidade.`, actionExecuted: "radar.create_task" };
  }

  private async sendToCrm(opportunity: any, user: CurrentUser, workspaceId: string): Promise<CommercialCapabilityResponse> {
    if (opportunity.qualificationStatus !== "qualified") throw new Error("A oportunidade precisa estar qualificada antes de seguir ao CRM");

    const clients = await this.db.getCrmGovClients(user.organizationId, workspaceId);
    const buyerKey = normalize(opportunity.buyerName || opportunity.title);
    let client = clients.find((item: any) => normalize(item.name || item.entity || "") === buyerKey);
    const now = new Date().toISOString();
    const productLinks = (opportunity.analysis?.bestMatches || []).slice(0, 3).map((match: any) => ({
      serviceId: match.serviceId,
      productId: match.productId,
      shortName: match.serviceName,
      commercialName: match.serviceName,
      status: "interested",
      linkedAt: now,
    }));

    if (!client) {
      client = {
        id: `client-${crypto.randomUUID()}`,
        provisioningStatus: "not_provisioned",
        name: opportunity.buyerName || opportunity.title,
        city: opportunity.city || "",
        state: opportunity.state || "",
        entity: opportunity.buyerName || "Órgão comprador",
        entityType: "other",
        manager: user.name,
        status: "prospect",
        contact: "A identificar",
        notes: `Prospect criado pela Beta a partir do Radar Comercial. Origem: ${opportunity.sourceLabel || opportunity.sourceId || "Radar"}.`,
        contacts: [],
        timeline: [],
        opportunities: [],
        products: [],
        proposals: [],
        contracts: [],
        implementations: [],
        financialRecords: [],
        supportTickets: [],
        createdAt: now,
        updatedAt: now,
      };
      clients.push(client);
    }

    client.opportunities = Array.isArray(client.opportunities) ? client.opportunities : [];
    if (!client.opportunities.some((item: any) => item.opportunityId === opportunity.id)) {
      client.opportunities.push({ opportunityId: opportunity.id, title: opportunity.title, source: "commercial_radar", linkedAt: now });
    }
    client.products = Array.isArray(client.products) ? client.products : [];
    for (const product of productLinks) {
      if (!client.products.some((item: any) => item.productId === product.productId)) client.products.push(product);
    }
    client.timeline = Array.isArray(client.timeline) ? client.timeline : [];
    client.timeline.push({ id: `timeline-${crypto.randomUUID()}`, type: "opportunity", title: "Oportunidade vinculada pelo Radar", description: opportunity.title, date: now, createdAt: now });
    client.nextAction = { title: `Analisar abordagem comercial para ${opportunity.title}`, dueDate: opportunity.submissionDeadline, notes: "Ação criada pela Beta após confirmação.", updatedAt: now };
    client.updatedAt = now;

    await this.db.replaceCrmGovClients(user.organizationId, workspaceId, clients);
    await this.db.updateCommercialOpportunity(opportunity.id, user.organizationId, workspaceId, { crmOpportunityId: client.id, status: "proposal", updatedAt: now });
    await this.createCommercialTask(opportunity, user, workspaceId);

    return { message: `A oportunidade **${opportunity.title}** foi vinculada ao CRM no prospect **${client.name}**. Também criei a próxima tarefa comercial.`, actionExecuted: "radar.send_to_crm" };
  }

  private async audit(user: CurrentUser, workspaceId: string, capabilityId: BetaCapabilityId, status: string, details: Record<string, unknown>): Promise<void> {
    await this.db.createBetaActionLog({
      organizationId: user.organizationId,
      workspaceId,
      userId: user.id,
      actionType: capabilityId,
      status,
      details,
      createdAt: new Date().toISOString(),
    });
  }
}
