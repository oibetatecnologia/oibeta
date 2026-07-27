import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import {
  GovernmentWorkspace,
  GovernmentWorkspaceSummary,
  GovernmentWorkspaceHealth,
  GovernmentWorkspaceTimeline,
  GovernmentWorkspaceIndicators,
  GovernmentWorkspacePrograms,
  GovernmentWorkspaceContracts,
  GovernmentWorkspaceBids,
  GovernmentWorkspaceRisk,
  GovernmentWorkspaceContext,
  GovernmentDataStatus
} from "../core/types";

export class GovernmentWorkspaceEngine {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;

  // External engines mapping
  private govDomainEngine: any;
  private govMemoryEngine: any;
  private govContextEngine: any;
  private govIndicatorEngine: any;
  private govRiskEngine: any;
  private govHealthEngine: any;
  private govTimelineEngine: any;
  private govNarrativeEngine: any;
  private govProgramEngine: any;
  private contractIntEngine: any;
  private bidIntEngine: any;
  private wsIntelligenceOrchestrator: any;
  private opCommandCenterEngine: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    deps: {
      govDomainEngine?: any;
      govMemoryEngine?: any;
      govContextEngine?: any;
      govIndicatorEngine?: any;
      govRiskEngine?: any;
      govHealthEngine?: any;
      govTimelineEngine?: any;
      govNarrativeEngine?: any;
      govProgramEngine?: any;
      contractIntEngine?: any;
      bidIntEngine?: any;
      wsIntelligenceOrchestrator?: any;
      opCommandCenterEngine?: any;
    }
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    
    this.govDomainEngine = deps.govDomainEngine;
    this.govMemoryEngine = deps.govMemoryEngine;
    this.govContextEngine = deps.govContextEngine;
    this.govIndicatorEngine = deps.govIndicatorEngine;
    this.govRiskEngine = deps.govRiskEngine;
    this.govHealthEngine = deps.govHealthEngine;
    this.govTimelineEngine = deps.govTimelineEngine;
    this.govNarrativeEngine = deps.govNarrativeEngine;
    this.govProgramEngine = deps.govProgramEngine;
    this.contractIntEngine = deps.contractIntEngine;
    this.bidIntEngine = deps.bidIntEngine;
    this.wsIntelligenceOrchestrator = deps.wsIntelligenceOrchestrator;
    this.opCommandCenterEngine = deps.opCommandCenterEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  public async buildGovernmentWorkspace(organizationId: string, workspaceId: string): Promise<GovernmentWorkspace> {
    this.validateTenant(organizationId, workspaceId);

    let ws = await this.db.getGovernmentWorkspace(organizationId, workspaceId);
    if (!ws) {
      ws = await this.db.createGovernmentWorkspace({
        organizationId,
        workspaceId,
        status: "READY",
        metadata: {}
      });

      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(organizationId, "GovernmentWorkspaceCreated", `Gov workspace created for ${workspaceId}`);
      }

      if (this.kg) {
        try {
          const wsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Workspace ${workspaceId}`, "", workspaceId);
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace ${ws.id}`, "", `gov_ws_${ws.id}`);
          await this.kg.createRelationship(organizationId, wsNode.id, govWsNode.id, "HAS_GOVERNMENT_WORKSPACE");
        } catch (e) {}
      }
    } else {
      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(organizationId, "GovernmentWorkspaceUpdated", `Gov workspace accessed for ${workspaceId}`);
      }
    }

    // Attempt to snapshot
    await this.db.createGovernmentWorkspaceSnapshot({
      organizationId,
      workspaceId,
      snapshotType: "BUILD",
      snapshot: { timestamp: new Date().toISOString() }
    });

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "GovernmentSnapshotCreated", `Gov snapshot created for ${workspaceId}`);
    }

    return ws;
  }

  public async getGovernmentSummary(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceSummary> {
    this.validateTenant(organizationId, workspaceId);

    let summaryData = null;
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govContextEngine && typeof this.govContextEngine.getGovernmentContext === "function") {
      summaryData = await this.govContextEngine.getGovernmentContext(organizationId, workspaceId).catch(() => null);
    }
    
    // Check if we have domain info
    if (!summaryData && this.govDomainEngine && typeof this.govDomainEngine.getDomainData === "function") {
      summaryData = await this.govDomainEngine.getDomainData(organizationId, workspaceId).catch(() => null);
    }

    if (summaryData && Object.keys(summaryData).length > 0) {
      status = "READY";
    }

    return { status, summary: summaryData || {} };
  }

  public async getGovernmentHealth(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceHealth> {
    this.validateTenant(organizationId, workspaceId);

    let healthData = null;
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govHealthEngine && typeof this.govHealthEngine.computeHealth === "function") {
      healthData = await this.govHealthEngine.computeHealth(organizationId, workspaceId).catch(() => null);
    }

    if (healthData) {
      status = "READY";
      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(organizationId, "GovernmentHealthComputed", `Health computed for ${workspaceId}`);
      }
    }

    return { status, health: healthData || null };
  }

  public async getGovernmentTimeline(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceTimeline> {
    this.validateTenant(organizationId, workspaceId);

    let timelineData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govTimelineEngine && typeof this.govTimelineEngine.getTimelineEvents === "function") {
      timelineData = await this.govTimelineEngine.getTimelineEvents(organizationId, workspaceId).catch(() => []);
    }

    if (timelineData && timelineData.length > 0) {
      status = "READY";
    }

    return { status, timeline: timelineData };
  }

  public async getGovernmentIndicators(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceIndicators> {
    this.validateTenant(organizationId, workspaceId);

    let indicatorsData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govIndicatorEngine && typeof this.govIndicatorEngine.getIndicators === "function") {
      indicatorsData = await this.govIndicatorEngine.getIndicators(organizationId, workspaceId).catch(() => []);
    }

    if (indicatorsData && indicatorsData.length > 0) {
      status = "READY";
      if (this.kg) {
        try {
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace`, "", `gov_ws_generic`);
          for (const ind of indicatorsData) {
            const indNode = await this.kg.ensureNode(organizationId, workspaceId, "DOCUMENT", `Indicator ${ind.id}`, "", ind.id);
            await this.kg.createRelationship(organizationId, govWsNode.id, indNode.id, "HAS_INDICATOR");
          }
        } catch (e) {}
      }
    }

    return { status, indicators: indicatorsData };
  }

  public async getGovernmentPrograms(organizationId: string, workspaceId: string): Promise<GovernmentWorkspacePrograms> {
    this.validateTenant(organizationId, workspaceId);

    let programsData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govProgramEngine && typeof this.govProgramEngine.getPrograms === "function") {
      programsData = await this.govProgramEngine.getPrograms(organizationId, workspaceId).catch(() => []);
    }

    if (programsData && programsData.length > 0) {
      status = "READY";
      if (this.kg) {
        try {
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace`, "", `gov_ws_generic`);
          for (const prog of programsData) {
            const progNode = await this.kg.ensureNode(organizationId, workspaceId, "DOCUMENT", `Program ${prog.id}`, "", prog.id);
            await this.kg.createRelationship(organizationId, govWsNode.id, progNode.id, "HAS_PROGRAM");
          }
        } catch (e) {}
      }
    }

    return { status, programs: programsData };
  }

  public async getGovernmentContracts(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceContracts> {
    this.validateTenant(organizationId, workspaceId);

    let contractsData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.contractIntEngine && typeof this.contractIntEngine.getContracts === "function") {
      contractsData = await this.contractIntEngine.getContracts(organizationId, workspaceId).catch(() => []);
    }

    if (contractsData && contractsData.length > 0) {
      status = "READY";
      if (this.kg) {
        try {
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace`, "", `gov_ws_generic`);
          for (const con of contractsData) {
            const conNode = await this.kg.ensureNode(organizationId, workspaceId, "DOCUMENT", `Contract ${con.id}`, "", con.id);
            await this.kg.createRelationship(organizationId, govWsNode.id, conNode.id, "HAS_CONTRACT");
          }
        } catch (e) {}
      }
    }

    return { status, contracts: contractsData };
  }

  public async getGovernmentBids(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceBids> {
    this.validateTenant(organizationId, workspaceId);

    let bidsData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.bidIntEngine && typeof this.bidIntEngine.getBids === "function") {
      bidsData = await this.bidIntEngine.getBids(organizationId, workspaceId).catch(() => []);
    }

    if (bidsData && bidsData.length > 0) {
      status = "READY";
      if (this.kg) {
        try {
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace`, "", `gov_ws_generic`);
          for (const bid of bidsData) {
            const bidNode = await this.kg.ensureNode(organizationId, workspaceId, "DOCUMENT", `Bid ${bid.id}`, "", bid.id);
            await this.kg.createRelationship(organizationId, govWsNode.id, bidNode.id, "HAS_BID");
          }
        } catch (e) {}
      }
    }

    return { status, bids: bidsData };
  }

  public async getGovernmentRisks(organizationId: string, workspaceId: string): Promise<GovernmentWorkspaceRisk> {
    this.validateTenant(organizationId, workspaceId);

    let risksData: any[] = [];
    let status: GovernmentDataStatus = "NO_DATA";

    if (this.govRiskEngine && typeof this.govRiskEngine.getRisks === "function") {
      risksData = await this.govRiskEngine.getRisks(organizationId, workspaceId).catch(() => []);
    }

    if (risksData && risksData.length > 0) {
      status = "READY";
      if (this.kg) {
        try {
          const govWsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Gov Workspace`, "", `gov_ws_generic`);
          for (const risk of risksData) {
            const riskNode = await this.kg.ensureNode(organizationId, workspaceId, "DOCUMENT", `Risk ${risk.id}`, "", risk.id);
            await this.kg.createRelationship(organizationId, govWsNode.id, riskNode.id, "HAS_RISK");
          }
        } catch (e) {}
      }
    }

    return { status, risks: risksData };
  }
}
