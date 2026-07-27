import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { ProcurementWorkspaceEngine } from "./ProcurementWorkspaceEngine";

import { ProcurementDomainEngine } from "../gov/ProcurementDomainEngine";
import { SupplierExtractionEngine } from "../gov/SupplierExtractionEngine";
import { ProcurementItemEngine } from "../gov/ProcurementItemEngine";
import { LotIntelligenceEngine } from "../gov/LotIntelligenceEngine";
import { ProposalIntelligenceEngine } from "../gov/ProposalIntelligenceEngine";
import { ProcurementContractLinker } from "../gov/ProcurementContractLinker";

import {
  ProcurementOpportunity,
  ProcurementBid,
  ProcurementParticipation,
  ProcurementLot,
  ProcurementProposal,
  ProcurementBidSummary,
  ProcurementBidHealth
} from "../core/types";

export class ProcurementBidManagementEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private workspaceEngine?: ProcurementWorkspaceEngine,
    private domainEngine?: ProcurementDomainEngine,
    private supplierExtractionEngine?: SupplierExtractionEngine,
    private itemEngine?: ProcurementItemEngine,
    private lotIntelligenceEngine?: LotIntelligenceEngine,
    private proposalIntelligenceEngine?: ProposalIntelligenceEngine,
    private contractLinker?: ProcurementContractLinker,
    private memoryOS?: MemoryOS,
    private orchestrator?: WorkspaceIntelligenceOrchestrator
  ) {}

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) {
      throw new Error("Multi-Tenant Error: organizationId is required.");
    }
    if (!wsId) {
      throw new Error("Multi-Tenant Error: workspaceId is required.");
    }
  }

  public async createOpportunity(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    title: string;
    description?: string | null;
    status: string;
    metadata?: any;
  }): Promise<ProcurementOpportunity> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const opp = await this.dbAdapter.createOpportunity({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description || null,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register node and relationship in Knowledge Graph
    // ProcurementWorkspace → HAS_OPPORTUNITY → ProcurementOpportunity
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

    const oppNodeId = opp.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementOpportunity",
      opp.title,
      opp.description || "",
      oppNodeId,
      opp
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, oppNodeId, "HAS_OPPORTUNITY");

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementOpportunityCreated",
        `Nova oportunidade de compra registrada: ${opp.title}`,
        { opportunityId: opp.id, status: opp.status }
      ).catch(() => {});
    }

    return opp;
  }

  public async createBid(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    opportunityId?: string | null;
    title: string;
    description?: string | null;
    status: string;
    metadata?: any;
  }): Promise<ProcurementBid> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const bid = await this.dbAdapter.createBid({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      opportunityId: data.opportunityId || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register node and relationship in Knowledge Graph
    // ProcurementOpportunity → HAS_BID → ProcurementBid
    const bidNodeId = bid.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementBid",
      bid.title,
      bid.description || "",
      bidNodeId,
      bid
    );

    if (bid.opportunityId) {
      await this.kgEngine.createRelationship(data.organizationId, bid.opportunityId, bidNodeId, "HAS_BID");
    } else {
      // Fallback: If no opportunity link, relate to workspace
      const wsNodeId = `pws-${data.workspaceId}`;
      await this.kgEngine.createRelationship(data.organizationId, wsNodeId, bidNodeId, "HAS_BID");
    }

    // 3. Register log event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementBidCreated",
        `Processo licitatório cadastrado operacionalmente: ${bid.title}`,
        { bidId: bid.id, status: bid.status }
      ).catch(() => {});
    }

    return bid;
  }

  public async createParticipation(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    bidId: string;
    supplierId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementParticipation> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const participation = await this.dbAdapter.createParticipation({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      bidId: data.bidId,
      supplierId: data.supplierId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementBid → HAS_PARTICIPATION → ProcurementParticipation
    const partNodeId = participation.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementParticipation",
      `Participação ${participation.id}`,
      `Participação de fornecedor ID ${participation.supplierId}`,
      partNodeId,
      participation
    );

    await this.kgEngine.createRelationship(data.organizationId, participation.bidId, partNodeId, "HAS_PARTICIPATION");

    // 3. Register on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementParticipationCreated",
        `Nova manifestação de participação associada à licitação.`,
        { participationId: participation.id, status: participation.status, bidId: participation.bidId, supplierId: participation.supplierId }
      ).catch(() => {});
    }

    return participation;
  }

  public async createLot(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    bidId: string;
    title: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementLot> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const lot = await this.dbAdapter.createLot({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      bidId: data.bidId,
      title: data.title,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementBid → HAS_LOT → ProcurementLot
    const lotNodeId = lot.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementLot",
      lot.title,
      "",
      lotNodeId,
      lot
    );

    await this.kgEngine.createRelationship(data.organizationId, lot.bidId, lotNodeId, "HAS_LOT");

    // 3. Register on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementLotCreated",
        `Novo lote configurado para a licitação: ${lot.title}`,
        { lotId: lot.id, status: lot.status, bidId: lot.bidId }
      ).catch(() => {});
    }

    return lot;
  }

  public async createProposal(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    bidId: string;
    lotId?: string | null;
    supplierId: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementProposal> {
    this.validateTenant(data.organizationId, data.workspaceId);

    // 1. Persist to database
    const proposal = await this.dbAdapter.createProposal({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      bidId: data.bidId,
      lotId: data.lotId || null,
      supplierId: data.supplierId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // 2. Register in Knowledge Graph
    // ProcurementLot → HAS_PROPOSAL → ProcurementProposal (or Bid fallback)
    const propNodeId = proposal.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementProposal",
      `Proposta ${proposal.id}`,
      "",
      propNodeId,
      proposal
    );

    if (proposal.lotId) {
      await this.kgEngine.createRelationship(data.organizationId, proposal.lotId, propNodeId, "HAS_PROPOSAL");
    } else {
      await this.kgEngine.createRelationship(data.organizationId, proposal.bidId, propNodeId, "HAS_PROPOSAL");
    }

    // 3. Register on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementProposalCreated",
        `Proposta financeira de fornecedor lançada no sistema.`,
        { proposalId: proposal.id, status: proposal.status, bidId: proposal.bidId, lotId: proposal.lotId, supplierId: proposal.supplierId }
      ).catch(() => {});
    }

    return proposal;
  }

  public async getOpportunities(organizationId: string, workspaceId: string): Promise<ProcurementOpportunity[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOpportunities(organizationId, workspaceId);
  }

  public async getBids(organizationId: string, workspaceId: string): Promise<ProcurementBid[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getBids(organizationId, workspaceId);
  }

  public async getParticipations(organizationId: string, workspaceId: string): Promise<ProcurementParticipation[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getParticipations(organizationId, workspaceId);
  }

  public async getLots(organizationId: string, workspaceId: string): Promise<ProcurementLot[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getLots(organizationId, workspaceId);
  }

  public async getProposals(organizationId: string, workspaceId: string): Promise<ProcurementProposal[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getProposals(organizationId, workspaceId);
  }

  public async getBidSummary(organizationId: string, workspaceId: string): Promise<ProcurementBidSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [opportunities, bids, participations, lots, proposals] = await Promise.all([
      this.getOpportunities(organizationId, workspaceId),
      this.getBids(organizationId, workspaceId),
      this.getParticipations(organizationId, workspaceId),
      this.getLots(organizationId, workspaceId),
      this.getProposals(organizationId, workspaceId)
    ]);

    const hasNoData =
      opportunities.length === 0 &&
      bids.length === 0 &&
      participations.length === 0 &&
      lots.length === 0 &&
      proposals.length === 0;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (hasNoData) {
      status = "NO_DATA";
    } else if (
      opportunities.length === 0 ||
      bids.length === 0 ||
      lots.length === 0 ||
      proposals.length === 0 ||
      participations.length === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      opportunitiesCount: opportunities.length,
      bidsCount: bids.length,
      participationsCount: participations.length,
      lotsCount: lots.length,
      proposalsCount: proposals.length,
      recentOpportunities: opportunities.slice(0, 5),
      recentBids: bids.slice(0, 5)
    };
  }

  public async getBidHealth(organizationId: string, workspaceId: string): Promise<ProcurementBidHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [opportunities, bids, participations, lots, proposals] = await Promise.all([
      this.getOpportunities(organizationId, workspaceId),
      this.getBids(organizationId, workspaceId),
      this.getParticipations(organizationId, workspaceId),
      this.getLots(organizationId, workspaceId),
      this.getProposals(organizationId, workspaceId)
    ]);

    if (
      opportunities.length === 0 &&
      bids.length === 0 &&
      participations.length === 0 &&
      lots.length === 0 &&
      proposals.length === 0
    ) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          completeness: 0,
          participationRate: 0,
          successRate: 0,
          riskFactor: 0
        }
      };
    }

    // Mathematical conformance calculation logic (Anti-AI slop, absolute truthfulness)
    let completeness = 0;
    if (opportunities.length > 0) completeness += 25;
    if (bids.length > 0) completeness += 25;
    if (lots.length > 0) completeness += 25;
    if (proposals.length > 0) completeness += 25;

    // Participation coverage
    const partRate = bids.length > 0 ? (participations.length / bids.length) : 0;
    const participationRateScore = Math.min(100, Math.round(partRate * 50));

    // Proposal/lot cover
    const propCover = lots.length > 0 ? (proposals.length / lots.length) : 0;
    const successRateScore = Math.min(100, Math.round(propCover * 50));

    // Base risk: cancelled proposals / total proposals
    const cancelledProposals = proposals.filter((p) => p.status === "CANCELLED").length;
    const riskFactor = proposals.length > 0 ? Math.min(100, Math.round((cancelledProposals / proposals.length) * 100)) : 0;

    // Health score weighted equation
    // Deduct risk factor, prioritize completeness and coverage
    let scoreBase = (completeness + participationRateScore + successRateScore) / 3;
    let healthScore = Math.max(10, Math.min(100, Math.round(scoreBase - riskFactor * 0.5)));

    const summary = await this.getBidSummary(organizationId, workspaceId);

    const bidHealthResult: ProcurementBidHealth = {
      status: summary.status,
      healthScore,
      metrics: {
        completeness,
        participationRate: participationRateScore,
        successRate: successRateScore,
        riskFactor
      }
    };

    // Propagate calculation event on MemoryOS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementBidHealthComputed",
        `Índice de saúde do ciclo de licitações computado: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return bidHealthResult;
  }
}
