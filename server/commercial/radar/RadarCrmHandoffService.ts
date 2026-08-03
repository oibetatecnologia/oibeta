import crypto from "crypto";
import type { CurrentUser } from "../../auth/currentUser";
import type { DatabaseAdapter } from "../../database/DatabaseAdapter";

export interface RadarCrmHandoffInput {
  opportunityId: string;
  organizationId: string;
  workspaceId: string;
  requestedBy: CurrentUser;
  responsible?: string;
  priority?: "low" | "medium" | "high" | "critical";
  nextAction?: string;
  notes?: string;
  createTask?: boolean;
}

export interface RadarCrmHandoffResult {
  opportunity: any;
  client: any;
  createdClient: boolean;
  createdTask: boolean;
  alreadyLinked: boolean;
}

function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export class RadarCrmHandoffService {
  constructor(private readonly db: DatabaseAdapter) {}

  async send(input: RadarCrmHandoffInput): Promise<RadarCrmHandoffResult> {
    const opportunities = await this.db.getCommercialOpportunities(input.organizationId, input.workspaceId);
    const opportunity = opportunities.find((item: any) => item.id === input.opportunityId);
    if (!opportunity) throw new Error("Oportunidade não encontrada no Radar deste tenant.");
    if (opportunity.qualificationStatus !== "qualified") {
      throw new Error("A oportunidade precisa estar qualificada antes de seguir para o CRM.");
    }

    const clients = await this.db.getCrmGovClients(input.organizationId, input.workspaceId);
    const existingByLink = clients.find((item: any) =>
      Array.isArray(item.opportunities) && item.opportunities.some((link: any) => link.opportunityId === opportunity.id),
    );
    if (existingByLink) {
      return {
        opportunity,
        client: existingByLink,
        createdClient: false,
        createdTask: false,
        alreadyLinked: true,
      };
    }

    const buyerKey = normalize(opportunity.buyerName || opportunity.title);
    let client = clients.find((item: any) => normalize(item.name || item.entity) === buyerKey);
    const now = new Date().toISOString();
    const responsible = String(input.responsible || input.requestedBy.name || "Responsável não definido").trim();
    const nextActionTitle = String(input.nextAction || `Analisar abordagem comercial para ${opportunity.title}`).trim();
    const notes = String(input.notes || "").trim();
    const productLinks = (opportunity.analysis?.bestMatches || []).slice(0, 3).map((match: any) => ({
      serviceId: match.serviceId,
      productId: match.productId,
      shortName: match.serviceName,
      commercialName: match.serviceName,
      status: "interested",
      linkedAt: now,
    }));

    let createdClient = false;
    if (!client) {
      createdClient = true;
      client = {
        id: `client-${crypto.randomUUID()}`,
        provisioningStatus: "not_provisioned",
        name: opportunity.buyerName || opportunity.title,
        city: opportunity.city || "",
        state: opportunity.state || "",
        entity: opportunity.buyerName || "Órgão comprador",
        entityType: "other",
        manager: responsible,
        status: "prospect",
        contact: "A identificar",
        notes: notes || `Prospect criado manualmente a partir do Radar Comercial. Origem: ${opportunity.sourceLabel || opportunity.sourceId || "Radar"}.`,
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
    client.opportunities.push({
      opportunityId: opportunity.id,
      title: opportunity.title,
      source: "commercial_radar",
      linkedAt: now,
      linkedBy: input.requestedBy.id,
    });

    client.products = Array.isArray(client.products) ? client.products : [];
    for (const product of productLinks) {
      if (!client.products.some((item: any) => item.productId === product.productId)) client.products.push(product);
    }

    client.timeline = Array.isArray(client.timeline) ? client.timeline : [];
    client.timeline.push({
      id: `timeline-${crypto.randomUUID()}`,
      type: "opportunity",
      title: "Oportunidade enviada manualmente pelo Radar",
      description: notes ? `${opportunity.title} — ${notes}` : opportunity.title,
      date: now,
      createdAt: now,
      userId: input.requestedBy.id,
    });
    client.manager = responsible || client.manager;
    client.nextAction = {
      title: nextActionTitle,
      dueDate: opportunity.submissionDeadline,
      notes: notes || "Ação definida no envio manual pelo Radar.",
      updatedAt: now,
    };
    client.updatedAt = now;

    await this.db.replaceCrmGovClients(input.organizationId, input.workspaceId, clients);
    const updatedOpportunity = await this.db.updateCommercialOpportunity(
      opportunity.id,
      input.organizationId,
      input.workspaceId,
      {
        crmOpportunityId: client.id,
        status: "proposal",
        priority: input.priority || opportunity.priority,
        updatedAt: now,
      },
    );

    let createdTask = false;
    if (input.createTask !== false) {
      const productId = opportunity.analysis?.bestMatches?.[0]?.productId;
      await this.db.createCommercialTasks([{
        id: `task-radar-crm-${opportunity.id}-${Date.now()}`,
        title: nextActionTitle,
        description: notes || `Dar continuidade comercial à oportunidade ${opportunity.title}.`,
        priority: input.priority || opportunity.priority || "high",
        relatedProductId: productId,
        sourceOpportunityId: opportunity.id,
        assignedTo: responsible,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
      }]);
      createdTask = true;
    }

    return {
      opportunity: updatedOpportunity,
      client,
      createdClient,
      createdTask,
      alreadyLinked: false,
    };
  }
}
