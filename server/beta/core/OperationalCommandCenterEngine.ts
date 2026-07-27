import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import {
  OperationalSummary,
  CampaignSummary,
  TerritorySummary,
  CoordinatorSummary,
  CommunicationSummary,
  PresenceSummary,
  ActivitySummary,
  PendingItemsSummary,
  OperationalAlert,
} from "./types";

export class OperationalCommandCenterEngine {
  private db: DatabaseAdapter;
  private memoryOS?: any;
  private kg?: KnowledgeGraphEngine;

  private campaignEngine: any;
  private coordinatorEngine: any;
  private territoryEngine: any;
  private crmEngine: any;
  private calendarEngine: any;
  private taskEngine: any;
  private workflowEngine: any;
  private evidenceEngine: any;
  private communicationEngine: any;
  private actionDispatchEngine: any;
  private userPresenceEngine: any;
  private workspaceEngine: any;

  constructor(
    db: DatabaseAdapter,
    memoryOS: any,
    kg: KnowledgeGraphEngine,
    dependencies: {
      campaignEngine: any;
      coordinatorEngine: any;
      territoryEngine: any;
      crmEngine: any;
      calendarEngine: any;
      taskEngine: any;
      workflowEngine: any;
      evidenceEngine: any;
      communicationEngine: any;
      actionDispatchEngine: any;
      userPresenceEngine: any;
      workspaceEngine: any;
    },
  ) {
    this.db = db;
    this.memoryOS = memoryOS;
    this.kg = kg;

    this.campaignEngine = dependencies.campaignEngine;
    this.coordinatorEngine = dependencies.coordinatorEngine;
    this.territoryEngine = dependencies.territoryEngine;
    this.crmEngine = dependencies.crmEngine;
    this.calendarEngine = dependencies.calendarEngine;
    this.taskEngine = dependencies.taskEngine;
    this.workflowEngine = dependencies.workflowEngine;
    this.evidenceEngine = dependencies.evidenceEngine;
    this.communicationEngine = dependencies.communicationEngine;
    this.actionDispatchEngine = dependencies.actionDispatchEngine;
    this.userPresenceEngine = dependencies.userPresenceEngine;
    this.workspaceEngine = dependencies.workspaceEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId)
      throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  public async getOperationalSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<OperationalSummary> {
    this.validateTenant(organizationId, workspaceId);

    const campaigns = await this.getCampaignSummary(
      organizationId,
      workspaceId,
    );
    const territories = await this.getTerritorySummary(
      organizationId,
      workspaceId,
    );
    const coordinators = await this.getCoordinatorSummary(
      organizationId,
      workspaceId,
    );
    const presence = await this.getPresenceSummary(organizationId, workspaceId);
    const communications = await this.getCommunicationSummary(
      organizationId,
      workspaceId,
    );

    // crmContacts
    const contacts = await this.crmEngine.getContacts(
      organizationId,
      workspaceId,
    );

    // events
    const events = await this.calendarEngine.getEvents(
      organizationId,
      workspaceId,
    );
    const futureEvents = events.filter(
      (e: { startDate?: string; startTime?: string }) => new Date(e.startDate || e.startTime || "") > new Date(),
    );

    // tasks
    const tasks = await this.taskEngine.getTasks(organizationId, workspaceId);
    const pendingTasks = tasks.filter(
      (t: { status?: string }) => t.status !== "DONE" && t.status !== "COMPLETED",
    );

    // workflows
    const workflows = await this.workflowEngine.getWorkflows(
      organizationId,
      workspaceId,
    );
    const activeWorkflows = workflows.filter(
      (w: { status?: string }) => w.status === "ACTIVE" || w.status === "IN_PROGRESS",
    );

    // evidences
    const evidences = await this.evidenceEngine.getEvidences(
      organizationId,
      workspaceId,
    );

    const alerts = await this.getOperationalAlerts(organizationId, workspaceId);

    const summary: OperationalSummary = {
      campaigns: campaigns.total,
      activeCampaigns: campaigns.active,
      territories: territories.total,
      coveredTerritories: territories.covered,
      uncoveredTerritories: territories.uncovered,
      coordinators: coordinators.total,
      activeCoordinators: coordinators.active,
      crmContacts: contacts.length,
      events: events.length,
      futureEvents: futureEvents.length,
      tasks: tasks.length,
      pendingTasks: pendingTasks.length,
      workflows: workflows.length,
      activeWorkflows: activeWorkflows.length,
      evidences: evidences.length,
      communications: communications.messages,
      pendingRequests: communications.pendingRequests,
      pendingDispatches: communications.pendingDispatches,
      onlineUsers: presence.online,
      offlineUsers: presence.offline,
      activeUsersLast24h: presence.activeLast24h,
      alerts,
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      try {
        await this.memoryOS.registerEvent(
          organizationId,
          "OperationalSummaryGenerated",
          `Operational summary requested for workspace ${workspaceId}.`,
        );
        if (alerts.length > 0) {
          await this.memoryOS.registerEvent(
            organizationId,
            "OperationalAlertDetected",
            `${alerts.length} operational alerts detected.`,
          );
        }
      } catch (e) {}
    }

    if (this.kg) {
      try {
        const summaryNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "OPERATIONAL_SUMMARY",
          "Operational Summary",
          "Aggregated state of the operation",
          `summary_${workspaceId}`,
        );
        const orgNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "ORGANIZATION",
          `Organization ${organizationId}`,
          "",
          organizationId,
        );

        await this.kg.createRelationship(
          organizationId,
          orgNode.id,
          summaryNode.id,
          "HAS_OPERATIONAL_STATE",
        );
      } catch (e) {}
    }

    return summary;
  }

  public async getCampaignSummary(organizationId: string, workspaceId: string): Promise<CampaignSummary> {
    this.validateTenant(organizationId, workspaceId);
    const campaignsList = await this.campaignEngine.getCampaigns(
      organizationId,
      workspaceId,
    );
    const active = campaignsList.filter(
      (c: { status?: string }) => c.status === "ACTIVE" || c.status === "ONGOING",
    ).length;
    const inactive = campaignsList.length - active;

    return {
      total: campaignsList.length,
      active,
      inactive,
      campaignsWithoutActivities: "NO_DATA",
      campaignsWithoutCoordinators: "NO_DATA",
      campaignsWithoutEvents: "NO_DATA",
    };
  }

  public async getTerritorySummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<TerritorySummary> {
    this.validateTenant(organizationId, workspaceId);
    const territories = await this.territoryEngine.getTerritories(
      organizationId,
      workspaceId,
    );
    const coords = await this.coordinatorEngine.getCoordinators(
      organizationId,
      workspaceId,
    );

    let covered = 0;
    let uncovered = 0;
    let withoutCoordinators = 0;

    for (const t of territories) {
      if (t.status === "ACTIVE" || t.status === "COVERED") {
        covered++;
      } else {
        uncovered++;
      }
      const assigned = coords.filter((c: { territoryId?: string }) => c.territoryId === t.id);
      if (assigned.length === 0) {
        withoutCoordinators++;
      }
    }

    if (covered === 0 && uncovered === 0 && territories.length > 0) {
      uncovered = territories.length;
    }

    return {
      total: territories.length,
      covered,
      uncovered,
      territoriesWithoutEvents: "NO_DATA",
      territoriesWithoutCoordinators: withoutCoordinators,
    };
  }

  public async getCoordinatorSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<CoordinatorSummary> {
    this.validateTenant(organizationId, workspaceId);
    const coordinators = await this.coordinatorEngine.getCoordinators(
      organizationId,
      workspaceId,
    );

    const active = coordinators.filter(
      (c: { status?: string }) => c.status === "ACTIVE",
    ).length;

    let withoutTerritories = 0;
    for (const c of coordinators) {
      if (!c.territoryId) {
        withoutTerritories++;
      }
    }

    return {
      total: coordinators.length,
      active,
      inactive: coordinators.length - active,
      coordinatorsWithoutActivities: "NO_DATA",
      coordinatorsWithoutTerritories: withoutTerritories,
    };
  }

  public async getCommunicationSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationSummary> {
    this.validateTenant(organizationId, workspaceId);
    const threads = await this.communicationEngine.getThreads(
      organizationId,
      workspaceId,
    );

    const pendingReqs = await this.actionDispatchEngine.getPendingRequests(
      organizationId,
      workspaceId,
    );
    const pendingDisps = await this.actionDispatchEngine.getPendingDispatches(
      organizationId,
      workspaceId,
    );

    let totalMessages: number | "NO_DATA" = 0;
    try {
      if (typeof this.db.getTotalMessagesCount === "function") {
        totalMessages = await this.db.getTotalMessagesCount(
          organizationId,
          workspaceId,
        );
      } else {
        totalMessages = "NO_DATA";
      }
    } catch (e) {
      totalMessages = "NO_DATA";
    }

    return {
      threads: threads.length,
      messages: totalMessages,
      pendingRequests: pendingReqs.length,
      pendingDispatches: pendingDisps.length,
      usersWithoutRecentCommunication: "NO_DATA",
    };
  }

  public async getPresenceSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<PresenceSummary> {
    this.validateTenant(organizationId, workspaceId);
    return this.userPresenceEngine.getOrganizationPresenceSummary(
      organizationId,
      workspaceId,
    );
  }

  public async getActivitySummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<ActivitySummary> {
    this.validateTenant(organizationId, workspaceId);
    const logs = await this.userPresenceEngine.getActivityLog(
      organizationId,
      workspaceId,
    );

    const logins = logs.filter((l: { activityType?: string }) => l.activityType === "login").length;
    const tasksCreated = logs.filter(
      (l: { activityType?: string }) => l.activityType === "task_created",
    ).length;
    const eventsCreated = logs.filter(
      (l: { activityType?: string }) => l.activityType === "event_created",
    ).length;
    const messagesSent = logs.filter(
      (l: { activityType?: string }) => l.activityType === "message_sent",
    ).length;

    return {
      totalActions: logs.length,
      logins,
      tasksCreated,
      eventsCreated,
      messagesSent,
    };
  }

  public async getPendingItems(
    organizationId: string,
    workspaceId: string,
  ): Promise<PendingItemsSummary> {
    this.validateTenant(organizationId, workspaceId);

    const tasks = await this.taskEngine.getTasks(organizationId, workspaceId);
    const pendingTasks = tasks.filter(
      (t: { status?: string }) => t.status !== "DONE" && t.status !== "COMPLETED",
    );

    const reqs = await this.actionDispatchEngine.getPendingRequests(
      organizationId,
      workspaceId,
    );
    const disps = await this.actionDispatchEngine.getPendingDispatches(
      organizationId,
      workspaceId,
    );

    const workflows = await this.workflowEngine.getWorkflows(
      organizationId,
      workspaceId,
    );
    const pendingWorkflows = workflows.filter(
      (w: { status?: string }) =>
        w.status === "PENDING" ||
        w.status === "IN_PROGRESS" ||
        w.status === "ACTIVE",
    );

    return {
      tasks: pendingTasks,
      requests: reqs,
      dispatches: disps,
      workflows: pendingWorkflows,
    };
  }

  public async getOperationalAlerts(
    organizationId: string,
    workspaceId: string,
  ): Promise<OperationalAlert[]> {
    this.validateTenant(organizationId, workspaceId);

    const alerts: OperationalAlert[] = [];

    try {
      const territories = await this.territoryEngine.getTerritories(
        organizationId,
        workspaceId,
      );
      const coords = await this.coordinatorEngine.getCoordinators(
        organizationId,
        workspaceId,
      );
      const reqs = await this.actionDispatchEngine.getPendingRequests(
        organizationId,
        workspaceId,
      );
      const disps = await this.actionDispatchEngine.getPendingDispatches(
        organizationId,
        workspaceId,
      );
      const campaigns = await this.campaignEngine.getCampaigns(
        organizationId,
        workspaceId,
      );
      const events = await this.calendarEngine.getEvents(
        organizationId,
        workspaceId,
      );
      const evidence = await this.evidenceEngine.getEvidences(
        organizationId,
        workspaceId,
      );
      const workflows = await this.workflowEngine.getWorkflows(
        organizationId,
        workspaceId,
      );

      for (const t of territories) {
        const assigned = coords.filter((c: { territoryId?: string }) => c.territoryId === t.id);
        if (assigned.length === 0) {
          alerts.push({
            type: "territory_without_coordinator",
            entityId: t.id,
            message: `Territory ${t.name} has no coordinator.`,
          });
        }
      }

      for (const c of coords) {
        if (c.status === "INACTIVE" || c.status === "OFFLINE") {
          alerts.push({
            type: "inactive_coordinator",
            entityId: c.id,
            message: `Coordinator ${c.name} is inactive.`,
          });
        }
      }

      for (const req of reqs) {
        alerts.push({
          type: "pending_request",
          entityId: req.id,
          message: `Request pending from ${req.requesterUserId}.`,
        });
      }

      for (const disp of disps) {
        alerts.push({
          type: "pending_dispatch",
          entityId: disp.id,
          message: `Dispatch ${disp.title || disp.name || disp.id} is pending.`,
        });
      }

      for (const w of workflows) {
        if (w.status === "PENDING" || w.status === "IN_PROGRESS") {
          alerts.push({
            type: "workflow_pending",
            entityId: w.id,
            message: `Workflow ${w.name || w.id} is pending.`,
          });
        }
      }

      for (const c of campaigns) {
        // If the campaign has status active, check if it has events
        if (c.status === "ACTIVE" || c.status === "ONGOING") {
          const campEvents = events.filter((e: { campaignId?: string }) => e.campaignId === c.id);
          if (campEvents.length === 0) {
            alerts.push({
              type: "campaign_without_event",
              entityId: c.id,
              message: `Campaign ${c.title || c.name} has no scheduled events.`,
            });
          }
        }
      }

      for (const e of events) {
        const evEvidence = evidence.filter((ev: { eventId?: string; referenceId?: string }) => ev.eventId === e.id || ev.referenceId === e.id);
        if (evEvidence.length === 0) {
           alerts.push({
             type: "event_without_evidence",
             entityId: e.id,
             message: `Event ${e.title || e.name} has no evidence attached.`,
           });
        }
        
        if (!e.participants || e.participants.length === 0) {
           alerts.push({
             type: "event_without_participant",
             entityId: e.id,
             message: `Event ${e.title || e.name} has no participants.`,
           });
        }
      }
    } catch (e) {}

    return alerts;
  }
}
