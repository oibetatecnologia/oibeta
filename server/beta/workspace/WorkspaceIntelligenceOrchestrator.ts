import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "./MemoryOS";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import {
  WorkspaceContext,
  KnowledgeGraphContext,
  MemoryContext,
  WorkspaceOperationalState,
} from "../core/types";

export class WorkspaceIntelligenceOrchestrator {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;
  private commandCenter: OperationalCommandCenterEngine;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    commandCenter: OperationalCommandCenterEngine,
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.commandCenter = commandCenter;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId)
      throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  public async buildWorkspaceContext(
    organizationId: string,
    workspaceId: string,
  ): Promise<WorkspaceContext> {
    this.validateTenant(organizationId, workspaceId);

    try {
      const dbkg = (this.kg as any).dbAdapter;
      let totalNodes = 0;
      let totalRelationships = 0;
      let entityTypes: string[] = [];
      let relationshipTypes: string[] = [];

      if (dbkg && typeof dbkg.query === "function") {
        // if there is a method to fetch from KG
      }

      const operationalSummary = await this.commandCenter
        .getOperationalSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const campaignSummary = await this.commandCenter
        .getCampaignSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const territorySummary = await this.commandCenter
        .getTerritorySummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const coordinatorSummary = await this.commandCenter
        .getCoordinatorSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const communicationSummary = await this.commandCenter
        .getCommunicationSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const presenceSummary = await this.commandCenter
        .getPresenceSummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const activitySummary = await this.commandCenter
        .getActivitySummary(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const pendingItems = await this.commandCenter
        .getPendingItems(organizationId, workspaceId)
        .catch(() => "NO_DATA" as const);
      const operationalAlerts = await this.commandCenter
        .getOperationalAlerts(organizationId, workspaceId)
        .catch(() => []);

      const kgContext: KnowledgeGraphContext = {
        totalNodes,
        totalRelationships,
        entityTypes,
        relationshipTypes,
        recentChanges: [],
      };

      const memoryContext: MemoryContext = {
        recentEvents: [],
        recentDecisions: [],
        recentActions: [],
        recentChanges: [],
      };

      const context: WorkspaceContext = {
        organization: organizationId,
        workspace: workspaceId,
        operationalSummary,
        campaignSummary,
        territorySummary,
        coordinatorSummary,
        communicationSummary,
        presenceSummary,
        activitySummary,
        pendingItems,
        operationalAlerts,
        knowledgeGraphContext: kgContext,
        memoryContext,
        generatedAt: new Date().toISOString(),
      };

      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(
          organizationId,
          "WorkspaceContextGenerated",
          `Workspace context generated for workspace ${workspaceId}.`,
        );
      }

      if (this.kg) {
        try {
          const contextNode = await this.kg.ensureNode(
            organizationId,
            workspaceId,
            "WORKSPACE_CONTEXT",
            "Workspace Context",
            "Consolidated operational context",
            `context_${workspaceId}`,
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
            "HAS_CONTEXT",
          );
        } catch (e) {}
      }

      return context;
    } catch (e) {
      throw e;
    }
  }

  public async getWorkspaceStatus(
    organizationId: string,
    workspaceId: string,
  ): Promise<string> {
    this.validateTenant(organizationId, workspaceId);

    const summary = await this.commandCenter
      .getOperationalSummary(organizationId, workspaceId)
      .catch(() => null);

    let status = "NO_DATA";

    if (summary && summary !== ("NO_DATA" as any)) {
      if (
        summary.campaigns > 0 &&
        summary.territories > 0 &&
        summary.coordinators > 0
      ) {
        status = "READY";
      } else if (
        summary.campaigns > 0 ||
        summary.territories > 0 ||
        summary.coordinators > 0
      ) {
        status = "PARTIAL_DATA";
      }
    }

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "WorkspaceStatusEvaluated",
        `Workspace status evaluated as ${status} for workspace ${workspaceId}.`,
      );
    }

    if (this.kg) {
      try {
        const statusNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "WORKSPACE_STATUS",
          `Status: ${status}`,
          `Evaluated workspace status`,
          `status_${workspaceId}`,
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
          statusNode.id,
          "HAS_STATUS",
        );
      } catch (e) {}
    }

    return status;
  }

  public async getWorkspaceHealth(
    organizationId: string,
    workspaceId: string,
  ): Promise<{ status: string; reason: string }> {
    this.validateTenant(organizationId, workspaceId);

    const summary = await this.commandCenter
      .getOperationalSummary(organizationId, workspaceId)
      .catch(() => null);

    let status = "NO_DATA";
    let reason = "Workspace doesn't have any data yet.";

    if (summary && summary !== ("NO_DATA" as any)) {
      if (
        summary.campaigns > 0 &&
        summary.territories > 0 &&
        summary.coordinators > 0
      ) {
        if (summary.events === 0) {
          status = "PARTIAL_DATA";
          reason =
            "Workspace possui campanhas e territórios cadastrados, porém não possui eventos registrados.";
        } else {
          status = "READY";
          reason = "Workspace appears healthy and has active operations.";
        }
      } else if (
        summary.campaigns > 0 ||
        summary.territories > 0 ||
        summary.coordinators > 0
      ) {
        status = "PARTIAL_DATA";
        reason =
          "Workspace is missing either campaigns, territories, or coordinators.";
      }
    }

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "WorkspaceHealthEvaluated",
        `Workspace health evaluated as ${status} for workspace ${workspaceId}.`,
      );
    }

    return { status, reason };
  }

  public async getWorkspaceTimeline(
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    this.validateTenant(organizationId, workspaceId);

    let recentEvents = [];
    if (this.memoryOS && typeof this.memoryOS.getEvents === "function") {
      recentEvents = await this.memoryOS
        .getEvents(organizationId, 10)
        .catch(() => []);
    }

    return {
      recentEvents,
      recentActions: [],
      recentChanges: [],
    };
  }

  public async getWorkspaceSnapshot(
    organizationId: string,
    workspaceId: string,
  ): Promise<WorkspaceOperationalState> {
    this.validateTenant(organizationId, workspaceId);

    const campaignSummary = await this.commandCenter
      .getCampaignSummary(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const territorySummary = await this.commandCenter
      .getTerritorySummary(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const coordinatorSummary = await this.commandCenter
      .getCoordinatorSummary(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const communicationSummary = await this.commandCenter
      .getCommunicationSummary(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const presenceSummary = await this.commandCenter
      .getPresenceSummary(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const pendingItems = await this.commandCenter
      .getPendingItems(organizationId, workspaceId)
      .catch(() => "NO_DATA" as const);
    const operationalAlerts = await this.commandCenter
      .getOperationalAlerts(organizationId, workspaceId)
      .catch(() => []);
    const operationalSummary = await this.commandCenter
      .getOperationalSummary(organizationId, workspaceId)
      .catch(() => null);

    const snapshot: WorkspaceOperationalState = {
      campaigns: campaignSummary,
      territories: territorySummary,
      coordinators: coordinatorSummary,
      crm: operationalSummary?.crmContacts ?? "NO_DATA",
      events: operationalSummary?.events ?? "NO_DATA",
      communications: communicationSummary,
      presence: presenceSummary,
      tasks: pendingItems,
      workflows: pendingItems, // same structure
      alerts: operationalAlerts,
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "WorkspaceSnapshotGenerated",
        `Workspace snapshot generated for workspace ${workspaceId}.`,
      );
    }

    if (this.kg) {
      try {
        const snapshotNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "WORKSPACE_SNAPSHOT",
          "Workspace Snapshot",
          "Consolidated current state snapshot",
          `snapshot_${workspaceId}`,
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
          "HAS_SNAPSHOT",
        );
      } catch (e) {}
    }

    return snapshot;
  }
}
