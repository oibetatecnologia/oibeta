import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { ProcurementWorkspaceEngine } from "./ProcurementWorkspaceEngine";
import { ProcurementBidManagementEngine } from "./ProcurementBidManagementEngine";
import { ProcurementSupplierManagementEngine } from "./ProcurementSupplierManagementEngine";
import { ProcurementContractManagementEngine } from "./ProcurementContractManagementEngine";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";

import {
  ProcurementARP,
  ProcurementARPItem,
  ProcurementARPConsumption,
  ProcurementARPParticipant,
  ProcurementARPCarona,
  ProcurementAuditEvent,
  ProcurementComplianceEvent,
  ProcurementComplianceSummary,
  ProcurementComplianceHealth
} from "../core/types";

export class ProcurementComplianceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private workspaceEngine?: ProcurementWorkspaceEngine,
    private bidManagementEngine?: ProcurementBidManagementEngine,
    private supplierManagementEngine?: ProcurementSupplierManagementEngine,
    private contractManagementEngine?: ProcurementContractManagementEngine,
    private memoryOS?: MemoryOS,
    private orchestrator?: WorkspaceIntelligenceOrchestrator,
    private occEngine?: OperationalCommandCenterEngine
  ) {}

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) {
      throw new Error("Multi-Tenant Error: organizationId is required.");
    }
    if (!wsId) {
      throw new Error("Multi-Tenant Error: workspaceId is required.");
    }
  }

  public async createARP(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementARP> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const arp = await this.dbAdapter.createARP({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const arpNodeId = arp.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARP",
      `Ata de Registro de Preços ${arp.id}`,
      `Ata de Registro de Preços em estado ${arp.status}`,
      arpNodeId,
      arp
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, arpNodeId, "HAS_ARP");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementARPCreated",
        `Nova Ata de Registro de Preços criada: ${arp.id}`,
        { arpId: arp.id, status: arp.status }
      ).catch(() => {});
    }

    return arp;
  }

  public async createARPItem(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    arpId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementARPItem> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const item = await this.dbAdapter.createARPItem({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      arpId: data.arpId,
      status: data.status,
      metadata: data.metadata || {}
    });

    const arpNodeId = data.arpId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARP",
      `Ata de Registro de Preços ${data.arpId}`,
      "Ata de Registro de Preços cadastrada.",
      arpNodeId,
      {}
    );

    const itemNodeId = item.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARPItem",
      `Item de Ata ${item.id}`,
      `Item pertencente à Ata ${item.arpId}`,
      itemNodeId,
      item
    );

    await this.kgEngine.createRelationship(data.organizationId, arpNodeId, itemNodeId, "HAS_ITEM");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementARPItemCreated",
        `Novo item de Ata de Registro de Preços adicionado: ${item.id}`,
        { arpId: item.arpId, itemId: item.id, status: item.status }
      ).catch(() => {});
    }

    return item;
  }

  public async createARPConsumption(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    arpItemId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementARPConsumption> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const consumption = await this.dbAdapter.createARPConsumption({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      arpItemId: data.arpItemId,
      status: data.status,
      metadata: data.metadata || {}
    });

    const itemNodeId = data.arpItemId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARPItem",
      `Item de Ata ${data.arpItemId}`,
      "Item de Ata de Registro de Preços cadastrada.",
      itemNodeId,
      {}
    );

    const consNodeId = consumption.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARPConsumption",
      `Consumo de Ata ${consumption.id}`,
      `Consumo efetuado para o item de ata ${consumption.arpItemId}`,
      consNodeId,
      consumption
    );

    await this.kgEngine.createRelationship(data.organizationId, itemNodeId, consNodeId, "HAS_CONSUMPTION");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementARPConsumptionCreated",
        `Consumo registrado para item de Ata de Registro de Preços: ${consumption.id}`,
        { arpItemId: consumption.arpItemId, consumptionId: consumption.id, status: consumption.status }
      ).catch(() => {});
    }

    return consumption;
  }

  public async createARPParticipant(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    arpId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementARPParticipant> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const participant = await this.dbAdapter.createARPParticipant({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      arpId: data.arpId,
      status: data.status,
      metadata: data.metadata || {}
    });

    const arpNodeId = data.arpId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARP",
      `Ata de Registro de Preços ${data.arpId}`,
      "Ata de Registro de Preços cadastrada.",
      arpNodeId,
      {}
    );

    const partNodeId = participant.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARPParticipant",
      `Órgão Participante ${participant.id}`,
      `Órgão cadastrado como participante da Ata ${participant.arpId}`,
      partNodeId,
      participant
    );

    await this.kgEngine.createRelationship(data.organizationId, arpNodeId, partNodeId, "HAS_PARTICIPANT");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementARPParticipantCreated",
        `Participante adicionado à Ata de Registro de Preços: ${participant.id}`,
        { arpId: participant.arpId, participantId: participant.id }
      ).catch(() => {});
    }

    return participant;
  }

  public async createARPCarona(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    arpId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementARPCarona> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const carona = await this.dbAdapter.createARPCarona({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      arpId: data.arpId,
      status: data.status,
      metadata: data.metadata || {}
    });

    const arpNodeId = data.arpId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARP",
      `Ata de Registro de Preços ${data.arpId}`,
      "Ata de Registro de Preços cadastrada.",
      arpNodeId,
      {}
    );

    const caronaNodeId = carona.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementARPCarona",
      `Órgão Carona (Adesão) ${carona.id}`,
      `Adesão carona registrada para a Ata de Registro de Preços ${carona.arpId}`,
      caronaNodeId,
      carona
    );

    await this.kgEngine.createRelationship(data.organizationId, arpNodeId, caronaNodeId, "HAS_CARONA");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementARPCaronaCreated",
        `Adesão "Carona" efetuada para a Ata de Registro de Preços: ${carona.id}`,
        { arpId: carona.arpId, caronaId: carona.id }
      ).catch(() => {});
    }

    return carona;
  }

  public async createAuditEvent(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    eventType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementAuditEvent> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const event = await this.dbAdapter.createAuditEvent({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      eventType: data.eventType,
      status: data.status,
      metadata: data.metadata || {}
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const eventNodeId = event.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementAuditEvent",
      `Evento de Auditoria - ${event.eventType}`,
      `Evento registrado sob status ${event.status}`,
      eventNodeId,
      event
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, eventNodeId, "HAS_AUDIT_EVENT");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementAuditEventCreated",
        `Novo evento de auditoria catalogado: ${event.eventType}`,
        { eventId: event.id, eventType: event.eventType, status: event.status }
      ).catch(() => {});
    }

    return event;
  }

  public async createComplianceEvent(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    eventType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementComplianceEvent> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const event = await this.dbAdapter.createComplianceEvent({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      eventType: data.eventType,
      status: data.status,
      metadata: data.metadata || {}
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const eventNodeId = event.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementComplianceEvent",
      `Evento de Compliance - ${event.eventType}`,
      `Evento de conformidade jurídica registrado sob status ${event.status}`,
      eventNodeId,
      event
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, eventNodeId, "HAS_COMPLIANCE_EVENT");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementComplianceEventCreated",
        `Novo evento de compliance catalogado: ${event.eventType}`,
        { eventId: event.id, eventType: event.eventType, status: event.status }
      ).catch(() => {});
    }

    return event;
  }

  public async getARPs(organizationId: string, workspaceId: string): Promise<ProcurementARP[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getARPs(organizationId, workspaceId);
  }

  public async getARPItems(organizationId: string, workspaceId: string): Promise<ProcurementARPItem[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getARPItems(organizationId, workspaceId);
  }

  public async getARPConsumptions(organizationId: string, workspaceId: string): Promise<ProcurementARPConsumption[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getARPConsumptions(organizationId, workspaceId);
  }

  public async getARPParticipants(organizationId: string, workspaceId: string): Promise<ProcurementARPParticipant[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getARPParticipants(organizationId, workspaceId);
  }

  public async getARPCaronas(organizationId: string, workspaceId: string): Promise<ProcurementARPCarona[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getARPCaronas(organizationId, workspaceId);
  }

  public async getAuditEvents(organizationId: string, workspaceId: string): Promise<ProcurementAuditEvent[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAuditEvents(organizationId, workspaceId);
  }

  public async getComplianceEvents(organizationId: string, workspaceId: string): Promise<ProcurementComplianceEvent[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getComplianceEvents(organizationId, workspaceId);
  }

  public async getComplianceSummary(organizationId: string, workspaceId: string): Promise<ProcurementComplianceSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [arps, arpItems, consumptions, participants, caronas, auditEvents, complianceEvents] = await Promise.all([
      this.getARPs(organizationId, workspaceId),
      this.getARPItems(organizationId, workspaceId),
      this.getARPConsumptions(organizationId, workspaceId),
      this.getARPParticipants(organizationId, workspaceId),
      this.getARPCaronas(organizationId, workspaceId),
      this.getAuditEvents(organizationId, workspaceId),
      this.getComplianceEvents(organizationId, workspaceId)
    ]);

    const hasNoData =
      arps.length === 0 &&
      arpItems.length === 0 &&
      consumptions.length === 0 &&
      participants.length === 0 &&
      caronas.length === 0 &&
      auditEvents.length === 0 &&
      complianceEvents.length === 0;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (hasNoData) {
      status = "NO_DATA";
    } else if (
      arps.length === 0 ||
      arpItems.length === 0 ||
      consumptions.length === 0 ||
      participants.length === 0 ||
      caronas.length === 0 ||
      auditEvents.length === 0 ||
      complianceEvents.length === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      arpsCount: arps.length,
      arpItemsCount: arpItems.length,
      arpConsumptionsCount: consumptions.length,
      arpParticipantsCount: participants.length,
      arpCaronasCount: caronas.length,
      auditEventsCount: auditEvents.length,
      complianceEventsCount: complianceEvents.length
    };
  }

  public async getComplianceHealth(organizationId: string, workspaceId: string): Promise<ProcurementComplianceHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [arps, arpItems, consumptions, participants, caronas, auditEvents, complianceEvents] = await Promise.all([
      this.getARPs(organizationId, workspaceId),
      this.getARPItems(organizationId, workspaceId),
      this.getARPConsumptions(organizationId, workspaceId),
      this.getARPParticipants(organizationId, workspaceId),
      this.getARPCaronas(organizationId, workspaceId),
      this.getAuditEvents(organizationId, workspaceId),
      this.getComplianceEvents(organizationId, workspaceId)
    ]);

    if (
      arps.length === 0 &&
      arpItems.length === 0 &&
      consumptions.length === 0 &&
      participants.length === 0 &&
      caronas.length === 0 &&
      auditEvents.length === 0 &&
      complianceEvents.length === 0
    ) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          arpActiveRate: 0,
          consumptionComplianceRate: 0,
          auditRegularityRate: 0,
          noNonCompliantRate: 0
        }
      };
    }

    const arpActiveRate = arps.length > 0 ? Math.round((arps.filter(a => a.status === "ACTIVE").length / arps.length) * 100) : 0;
    const consumptionComplianceRate = consumptions.length > 0 ? Math.round((consumptions.filter(c => c.status === "COMPLETED" || c.status === "ACTIVE").length / consumptions.length) * 100) : 0;
    const auditRegularityRate = auditEvents.length > 0 ? Math.round((auditEvents.filter(e => e.status === "ACTIVE" || e.status === "COMPLETED").length / auditEvents.length) * 100) : 0;
    const noNonCompliantRate = complianceEvents.length > 0 ? Math.round((complianceEvents.filter(e => e.status !== "SUSPENDED" && e.status !== "EXPIRED").length / complianceEvents.length) * 100) : 100;

    const scoresCount = (arps.length > 0 ? 1 : 0) + (consumptions.length > 0 ? 1 : 0) + (auditEvents.length > 0 ? 1 : 0) + (complianceEvents.length > 0 ? 1 : 0);
    const scoreSum =
      (arps.length > 0 ? arpActiveRate : 0) +
      (consumptions.length > 0 ? consumptionComplianceRate : 0) +
      (auditEvents.length > 0 ? auditRegularityRate : 0) +
      (complianceEvents.length > 0 ? noNonCompliantRate : 0);

    const healthScore = scoresCount > 0 ? Math.max(10, Math.min(100, Math.round(scoreSum / scoresCount))) : 0;

    const summary = await this.getComplianceSummary(organizationId, workspaceId);

    const healthResult: ProcurementComplianceHealth = {
      status: summary.status,
      healthScore,
      metrics: {
        arpActiveRate,
        consumptionComplianceRate,
        auditRegularityRate,
        noNonCompliantRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementComplianceHealthComputed",
        `Calculado indicador de compliance e auditoria licitatória: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return healthResult;
  }
}
