import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";

// Consumed sub-engines
import { ProcurementDomainEngine } from "../gov/ProcurementDomainEngine";
import { ProcurementMemoryEngine } from "../gov/ProcurementMemoryEngine";
import { ProcurementContextEngine } from "../gov/ProcurementContextEngine";
import { SupplierExtractionEngine } from "../gov/SupplierExtractionEngine";
import { ProcurementItemEngine } from "../gov/ProcurementItemEngine";
import { LotIntelligenceEngine } from "../gov/LotIntelligenceEngine";
import { ProposalIntelligenceEngine } from "../gov/ProposalIntelligenceEngine";
import { ProcurementCorrelationEngine } from "../gov/ProcurementCorrelationEngine";
import { ProcurementContractLinker } from "../gov/ProcurementContractLinker";
import { SupplierIntelligenceEngine } from "../gov/SupplierIntelligenceEngine";
import { ProcurementHealthEngine } from "../gov/ProcurementHealthEngine";
import { ProcurementTimelineEngine } from "../gov/ProcurementTimelineEngine";

// Types
import {
  ProcurementWorkspace,
  ProcurementWorkspaceSummary,
  ProcurementWorkspaceHealth,
  ProcurementWorkspaceTimeline,
  ProcurementBid,
  ProcurementSupplier,
  ProcurementLot,
  ProcurementProposal,
  ProcurementContract
} from "../core/types";

export class ProcurementWorkspaceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private memoryOS?: MemoryOS,
    private orchestrator?: WorkspaceIntelligenceOrchestrator,
    private occEngine?: OperationalCommandCenterEngine
  ) {}

  /**
   * Helper utility to proxy a DatabaseAdapter instance to strictly filter
   * Knowledge Graph nodes for the given multi-tenant workspaceId.
   */
  private getTenantDbAdapter(organizationId: string, workspaceId: string): DatabaseAdapter {
    return {
      ...this.dbAdapter,
      getKnowledgeNodes: async (orgId: string, projectId?: string) => {
        return this.dbAdapter.getKnowledgeNodes(orgId, projectId, workspaceId);
      }
    } as any;
  }

  /**
   * Builds and integrates the entire procurement workspace context, linking nodes,
   * calculating baseline health scoring metrics, taking a database snapshot and
   * propagating logs through Memory OS.
   */
  public async buildProcurementWorkspace(
    organizationId: string,
    workspaceId: string,
    metadata: any = {}
  ): Promise<ProcurementWorkspace> {
    // 1. Check if workspace already exists
    let activeWorkspace = await this.dbAdapter.getProcurementWorkspace(organizationId, workspaceId);
    let isNew = false;

    if (!activeWorkspace) {
      isNew = true;
      const workspaceData = {
        organizationId,
        workspaceId,
        status: "READY" as const,
        metadata: {
          ...metadata,
          builtAt: new Date().toISOString()
        }
      };
      activeWorkspace = await this.dbAdapter.createProcurementWorkspace(workspaceData);
    }

    // 2. Establish foundational node structure in the Knowledge Graph
    const wsNodeId = `pws-${workspaceId}`;
    await this.kgEngine.createNode(wsNodeId, "ProcurementWorkspace", {
      organizationId,
      workspaceId,
      name: metadata.name || `Beta Licita Workspace (${workspaceId})`,
      description: metadata.description || "Workspace operacional do módulo Beta Licita de compras públicas."
    });

    // Link: Workspace → HAS_PROCUREMENT_WORKSPACE → ProcurementWorkspace
    await this.kgEngine.createRelationship(organizationId, workspaceId, wsNodeId, "HAS_PROCUREMENT_WORKSPACE");

    // 3. Link all local domain elements to the ProcurementWorkspace context
    const bids = await this.getProcurementBids(organizationId, workspaceId);
    for (const bid of bids) {
      await this.kgEngine.createRelationship(organizationId, wsNodeId, bid.id, "HAS_BID");
    }

    const suppliers = await this.getProcurementSuppliers(organizationId, workspaceId);
    for (const supplier of suppliers) {
      await this.kgEngine.createRelationship(organizationId, wsNodeId, supplier.id, "HAS_SUPPLIER");
    }

    const lots = await this.getProcurementLots(organizationId, workspaceId);
    for (const lot of lots) {
      await this.kgEngine.createRelationship(organizationId, wsNodeId, lot.id, "HAS_LOT");
    }

    const proposals = await this.getProcurementProposals(organizationId, workspaceId);
    for (const proposal of proposals) {
      await this.kgEngine.createRelationship(organizationId, wsNodeId, proposal.id, "HAS_PROPOSAL");
    }

    const contracts = await this.getProcurementContracts(organizationId, workspaceId);
    for (const contract of contracts) {
      await this.kgEngine.createRelationship(organizationId, wsNodeId, contract.id, "HAS_CONTRACT");
    }

    // 4. Compute Health & Summary to create the historic operational snapshot
    const health = await this.getProcurementHealth(organizationId, workspaceId);
    const summary = await this.getProcurementSummary(organizationId, workspaceId);

    const snapshotPayload = {
      organizationId,
      workspaceId,
      snapshotType: "BUILD",
      snapshot: {
        health,
        summary,
        generatedAt: new Date().toISOString()
      }
    };
    await this.dbAdapter.createProcurementSnapshot(snapshotPayload);

    // 5. Populate logs through the database records
    await this.dbAdapter.createProcurementLog({
      organizationId,
      workspaceId,
      eventType: isNew ? "ProcurementWorkspaceCreated" : "ProcurementWorkspaceUpdated",
      details: {
        workspaceId,
        metadata,
        timestamp: new Date().toISOString()
      }
    });

    // 6. Propagate events through Memory OS architecture
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        isNew ? "ProcurementWorkspaceCreated" : "ProcurementWorkspaceUpdated",
        isNew 
          ? `Módulo de licitações iniciado oficialmente para o workspace ${workspaceId}.`
          : `Workspace de licitações recalibrado e atualizado para o workspace ${workspaceId}.`,
        { workspaceId, activeWorkspaceId: activeWorkspace.id }
      ).catch(() => {});

      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementSnapshotCreated",
        `Snapshot de segurança operacional e histórico de compras públicas consolidado.`,
        { workspaceId }
      ).catch(() => {});

      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementHealthComputed",
        `Índice de conformidade e integridade licitatória calculado: ${health.healthScore}/100.`,
        { workspaceId, healthScore: health.healthScore }
      ).catch(() => {});
    }

    return activeWorkspace;
  }

  /**
   * Summarizes operational metrics and counts within the workspace.
   */
  public async getProcurementSummary(organizationId: string, workspaceId: string): Promise<ProcurementWorkspaceSummary> {
    const bids = await this.getProcurementBids(organizationId, workspaceId);
    const suppliers = await this.getProcurementSuppliers(organizationId, workspaceId);
    const lots = await this.getProcurementLots(organizationId, workspaceId);
    const proposals = await this.getProcurementProposals(organizationId, workspaceId);
    const contracts = await this.getProcurementContracts(organizationId, workspaceId);

    const hasNoData = bids.length === 0 && suppliers.length === 0 && lots.length === 0 && proposals.length === 0 && contracts.length === 0;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (hasNoData) {
      status = "NO_DATA";
    } else if (bids.length === 0 || suppliers.length === 0 || lots.length === 0 || proposals.length === 0) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      bidsCount: bids.length,
      suppliersCount: suppliers.length,
      lotsCount: lots.length,
      proposalsCount: proposals.length,
      contractsCount: contracts.length,
      recentBids: bids.slice(0, 5),
      recentContracts: contracts.slice(0, 5)
    };
  }

  /**
   * Evaluates the health score using the dedicated ProcurementHealthEngine.
   */
  public async getProcurementHealth(organizationId: string, workspaceId: string): Promise<ProcurementWorkspaceHealth> {
    const summary = await this.getProcurementSummary(organizationId, workspaceId);

    if (summary.status === "NO_DATA") {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          completeness: 0,
          competition: 0,
          supplierVariety: 0,
          riskMitigation: 0
        }
      };
    }

    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const healthEngine = new ProcurementHealthEngine(tenantDb, this.kgEngine);

    const bids = await this.getProcurementBids(organizationId, workspaceId);
    const notices = (await tenantDb.getKnowledgeNodes(organizationId, undefined, workspaceId)).filter(n => n.nodeType === "NOTICE");
    const suppliers = await this.getProcurementSuppliers(organizationId, workspaceId);
    const lots = await this.getProcurementLots(organizationId, workspaceId);
    const priceRegistries = (await tenantDb.getKnowledgeNodes(organizationId, undefined, workspaceId)).filter(n => n.nodeType === "PRICE_REGISTRY");
    const documents = (await tenantDb.getKnowledgeNodes(organizationId, undefined, workspaceId)).filter(n => n.nodeType === "DOCUMENT" || n.nodeType === "CONTRACT_DOCUMENT");

    const calculated = await healthEngine.calculateHealth(
      organizationId,
      bids,
      notices,
      suppliers,
      lots,
      priceRegistries,
      documents,
      null,
      summary.status
    );

    const score = typeof calculated.healthScore === "number" ? calculated.healthScore : 0;

    return {
      status: summary.status,
      healthScore: score,
      metrics: {
        completeness: calculated.details?.completeness || 0,
        competition: calculated.details?.competitiveness || 0,
        supplierVariety: calculated.details?.supplierVariety || 0,
        riskMitigation: calculated.details?.riskMitigation || 0
      }
    };
  }

  /**
   * Resolves chronological timeline of events for the procurement workspace.
   */
  public async getProcurementTimeline(organizationId: string, workspaceId: string): Promise<ProcurementWorkspaceTimeline> {
    const summary = await this.getProcurementSummary(organizationId, workspaceId);

    if (summary.status === "NO_DATA") {
      return {
        status: "NO_DATA",
        timeline: []
      };
    }

    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const timelineEngine = new ProcurementTimelineEngine(tenantDb);
    const timeline = await timelineEngine.generateTimeline(organizationId);

    return {
      status: summary.status,
      timeline
    };
  }

  /**
   * Fetches only active bids (LICITAÇÕES) for the multi-tenant context.
   */
  public async getProcurementBids(organizationId: string, workspaceId: string): Promise<ProcurementBid[]> {
    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const domainEngine = new ProcurementDomainEngine(tenantDb, this.kgEngine);
    return domainEngine.getBids(organizationId);
  }

  /**
   * Fetches only active suppliers (FORNECEDORES) for the multi-tenant context.
   */
  public async getProcurementSuppliers(organizationId: string, workspaceId: string): Promise<ProcurementSupplier[]> {
    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const domainEngine = new ProcurementDomainEngine(tenantDb, this.kgEngine);
    return domainEngine.getSuppliers(organizationId);
  }

  /**
   * Fetches only active lots (LOTES) for the multi-tenant context.
   */
  public async getProcurementLots(organizationId: string, workspaceId: string): Promise<ProcurementLot[]> {
    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const domainEngine = new ProcurementDomainEngine(tenantDb, this.kgEngine);
    return domainEngine.getLots(organizationId);
  }

  /**
   * Fetches only active proposals (PROPOSTAS) for the multi-tenant context.
   */
  public async getProcurementProposals(organizationId: string, workspaceId: string): Promise<ProcurementProposal[]> {
    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const domainEngine = new ProcurementDomainEngine(tenantDb, this.kgEngine);
    return domainEngine.getProposals(organizationId);
  }

  /**
   * Fetches only active contracts (CONTRATOS) for the multi-tenant context.
   */
  public async getProcurementContracts(organizationId: string, workspaceId: string): Promise<ProcurementContract[]> {
    const tenantDb = this.getTenantDbAdapter(organizationId, workspaceId);
    const allNodes = await tenantDb.getKnowledgeNodes(organizationId, undefined, workspaceId);
    
    return allNodes
      .filter(n => n.nodeType === "CONTRACT")
      .map(c => ({
        id: c.id,
        title: c.title || null,
        number: c.metadata?.number || c.metadata?.contractNumber || null,
        value: typeof (c.metadata?.value || c.metadata?.contractValue) === "number" 
          ? (c.metadata?.value || c.metadata?.contractValue) 
          : null,
        supplierName: c.metadata?.supplierName || null
      }));
  }
}
