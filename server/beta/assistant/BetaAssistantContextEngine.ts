import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import {
  BetaAssistantContext,
  AssistantOperationalState,
  AssistantPresenceContext,
  AssistantCommunicationContext,
  AssistantMemoryContext,
  AssistantKnowledgeContext,
  AssistantMetadata,
} from "../core/types";

export class BetaAssistantContextEngine {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any; // Using any for MemoryOS as it may lack complete typings
  private commandCenter: OperationalCommandCenterEngine;
  private workspaceIntelligence: WorkspaceIntelligenceOrchestrator;
  private communicationEngine: any;
  private userPresenceEngine: any;
  private workspaceEngine: any;
  private moduleAccessEngine: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    commandCenter: OperationalCommandCenterEngine,
    workspaceIntelligence: WorkspaceIntelligenceOrchestrator,
    dependencies: {
      communicationEngine?: any;
      userPresenceEngine?: any;
      workspaceEngine?: any;
      moduleAccessEngine?: any;
    },
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.commandCenter = commandCenter;
    this.workspaceIntelligence = workspaceIntelligence;

    this.communicationEngine = dependencies.communicationEngine;
    this.userPresenceEngine = dependencies.userPresenceEngine;
    this.workspaceEngine = dependencies.workspaceEngine;
    this.moduleAccessEngine = dependencies.moduleAccessEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId)
      throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  public async createAssistantContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<BetaAssistantContext> {
    this.validateTenant(organizationId, workspaceId);

    try {
      const workspaceStatus = await this.workspaceIntelligence
        .getWorkspaceStatus(organizationId, workspaceId)
        .catch(() => "NO_DATA");
      const workspaceHealth = await this.workspaceIntelligence
        .getWorkspaceHealth(organizationId, workspaceId)
        .catch(() => "NO_DATA" as any);
      const workspaceContext = await this.workspaceIntelligence
        .buildWorkspaceContext(organizationId, workspaceId)
        .catch(() => "NO_DATA" as any);
      const operationalSummary = await this.commandCenter
        .getOperationalSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as any);
      const pendingItems = await this.commandCenter
        .getPendingItems(organizationId, workspaceId)
        .catch(() => "NO_DATA" as any);
      const operationalAlerts = await this.commandCenter
        .getOperationalAlerts(organizationId, workspaceId)
        .catch(() => []);

      const recentTimeline = await this.getAssistantTimeline(
        organizationId,
        workspaceId,
      ).catch(() => []);

      const knowledgeGraphContext = await this.getKnowledgeContext(
        organizationId,
        workspaceId,
      ).catch(() => "NO_DATA" as any);
      const memoryContext = await this.getMemoryContext(
        organizationId,
        workspaceId,
      ).catch(() => "NO_DATA" as any);
      const presenceContext = await this.getPresenceContext(
        organizationId,
        workspaceId,
      ).catch(() => "NO_DATA" as any);
      const communicationContext = await this.getCommunicationContext(
        organizationId,
        workspaceId,
      ).catch(() => "NO_DATA" as any);

      let enabledModules: string[] = [];
      if (
        this.moduleAccessEngine &&
        typeof this.moduleAccessEngine.getEnabledModules === "function"
      ) {
        enabledModules = await this.moduleAccessEngine
          .getEnabledModules(organizationId, workspaceId)
          .catch(() => []);
      }

      const context: BetaAssistantContext = {
        organization: organizationId,
        workspace: workspaceId,
        workspaceStatus,
        workspaceHealth,
        workspaceContext,
        operationalSummary,
        pendingItems,
        operationalAlerts,
        recentTimeline,
        knowledgeGraphContext,
        memoryContext,
        presenceContext,
        communicationContext,
        enabledModules,
        generatedAt: new Date().toISOString(),
      };

      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(
          organizationId,
          "AssistantContextGenerated",
          `Assistant context generated for workspace ${workspaceId}.`,
        );
      }

      if (this.kg) {
        try {
          const contextNode = await this.kg.ensureNode(
            organizationId,
            workspaceId,
            "ASSISTANT_CONTEXT",
            "Assistant Context",
            "Consolidated operational context for Beta Assistant",
            `assistant_context_${workspaceId}`,
          );
          const wsNode = await this.kg.ensureNode(
            organizationId,
            workspaceId,
            "PROJECT",
            `Workspace ${workspaceId}`,
            "",
            workspaceId,
          );
          await this.kg.createRelationship(
            organizationId,
            wsNode.id,
            contextNode.id,
            "HAS_ASSISTANT_CONTEXT",
          );
        } catch (e) {}
      }

      return context;
    } catch (e) {
      throw e;
    }
  }

  public async getAssistantContextStatus(
    organizationId: string,
    workspaceId: string,
  ): Promise<string> {
    this.validateTenant(organizationId, workspaceId);

    const wsStatus = await this.workspaceIntelligence
      .getWorkspaceStatus(organizationId, workspaceId)
      .catch(() => "NO_DATA");

    // Simplistic mapping for now - Beta Assistant is ready if Workspace is ready
    let status = "NO_DATA";
    if (wsStatus === "READY") {
      status = "READY";
    } else if (wsStatus === "PARTIAL_DATA") {
      status = "PARTIAL_DATA";
    }

    return status;
  }

  public async getAssistantSnapshot(
    organizationId: string,
    workspaceId: string,
  ): Promise<BetaAssistantContext> {
    this.validateTenant(organizationId, workspaceId);

    const context = await this.createAssistantContext(
      organizationId,
      workspaceId,
    );

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "AssistantSnapshotGenerated",
        `Assistant snapshot generated for workspace ${workspaceId}.`,
      );
    }

    if (this.kg) {
      try {
        const snapshotNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "ASSISTANT_SNAPSHOT",
          "Assistant Snapshot",
          "Point-in-time snapshot of Assistant Context",
          `assistant_snapshot_${workspaceId}_${Date.now()}`,
        );
        const wsNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "PROJECT",
          `Workspace ${workspaceId}`,
          "",
          workspaceId,
        );
        await this.kg.createRelationship(
          organizationId,
          wsNode.id,
          snapshotNode.id,
          "HAS_ASSISTANT_SNAPSHOT",
        );
      } catch (e) {}
    }

    return context;
  }

  public async getAssistantTimeline(
    organizationId: string,
    workspaceId: string,
  ): Promise<any[]> {
    this.validateTenant(organizationId, workspaceId);

    let recentEvents = [];
    if (this.memoryOS && typeof this.memoryOS.getEvents === "function") {
      recentEvents = await this.memoryOS
        .getEvents(organizationId, 20)
        .catch(() => []);
    }

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "AssistantTimelineGenerated",
        `Assistant timeline generated for workspace ${workspaceId}.`,
      );
    }

    return recentEvents;
  }

  private async getPresenceContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<AssistantPresenceContext | "NO_DATA"> {
    if (!this.userPresenceEngine) return "NO_DATA";

    try {
      const presenceSummary =
        await this.userPresenceEngine.getOrganizationPresenceSummary(
          organizationId,
          workspaceId,
        );

      return {
        onlineUsers: presenceSummary.online || 0,
        offlineUsers: presenceSummary.offline || 0,
        awayUsers: presenceSummary.away || 0,
        busyUsers: presenceSummary.busy || 0,
        activeLast24h: presenceSummary.activeLast24h || 0,
      };
    } catch (e) {
      return "NO_DATA";
    }
  }

  private async getCommunicationContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<AssistantCommunicationContext | "NO_DATA"> {
    try {
      const summary = await this.commandCenter.getCommunicationSummary(
        organizationId,
        workspaceId,
      );

      // We don't have ActionDispatchEngine specifically imported but it is queried within Command Center
      if (summary === ("NO_DATA" as any)) return "NO_DATA";

      let recentCommunications: any[] = [];
      if (
        this.communicationEngine &&
        typeof this.communicationEngine.getThreads === "function"
      ) {
        recentCommunications = await this.communicationEngine
          .getThreads(organizationId, workspaceId)
          .catch(() => []);
      }

      return {
        threads: summary.threads || 0,
        messages: typeof summary.messages === "number" ? summary.messages : 0,
        pendingRequests: summary.pendingRequests || 0,
        pendingDispatches: summary.pendingDispatches || 0,
        recentCommunications,
      };
    } catch (e) {
      return "NO_DATA";
    }
  }

  private async getMemoryContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<AssistantMemoryContext> {
    const memoryContext: AssistantMemoryContext = {
      recentEvents: [],
      recentActions: [],
      recentChanges: [],
      recentDecisions: [],
    };
    return memoryContext;
  }

  private async getKnowledgeContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<AssistantKnowledgeContext> {
    const kgContext: AssistantKnowledgeContext = {
      entityTypes: [],
      relationshipTypes: [],
      recentChanges: [],
      graphStatus: "PARTIAL",
    };
    return kgContext;
  }
}
