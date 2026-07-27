import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { 
  CampaignCoordinator, 
  CampaignCoordinatorAssignment, 
  CampaignCoordinatorHealth 
} from "../core/types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CoordinatorOperationalEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getCoordinators(organizationId: string, campaignId: string): Promise<CampaignCoordinator[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    if (!campaignId) {
      throw new Error("Campaign Error: campaignId is required");
    }
    return this.db.getCampaignCoordinators(organizationId, campaignId);
  }

  public async getCoordinator(organizationId: string, campaignId: string, id: string): Promise<CampaignCoordinator | null> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    const coordinators = await this.db.getCampaignCoordinators(organizationId, campaignId);
    return coordinators.find(c => c.id === id) || null;
  }

  public async createCoordinator(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      contactId: string;
      coordinatorLevel: string;
      role: string;
      status?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignCoordinator> {
    if (!organizationId || !workspaceId || !campaignId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, and campaign_id are mandatory.");
    }

    const coordinator = await this.db.createCampaignCoordinator({
      organizationId,
      workspaceId,
      campaignId,
      contactId: data.contactId,
      coordinatorLevel: data.coordinatorLevel,
      role: data.role,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph Relationship
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Campaign: ${campaignId}`, "", campaignId);
        const contactNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE" as any, `Contact: ${data.contactId}`, "", data.contactId);
        const coordNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Coordinator: ${data.contactId}`, `[${data.coordinatorLevel}]`, coordinator.id);

        await this.kgEngine.createRelationship(organizationId, campNode.id, coordNode.id, "HAS_COORDINATOR" as any);
        await this.kgEngine.createRelationship(organizationId, coordNode.id, contactNode.id, "REPRESENTS_CONTACT" as any);
      } catch (e) {
        console.warn("CoordinatorOperationalEngine KG integration failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignCoordinatorCreated",
            `Coordinator registered on index level [${data.coordinatorLevel}] for campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return coordinator;
  }

  public async updateCoordinator(
    id: string,
    organizationId: string,
    campaignId: string,
    data: {
      coordinatorLevel?: string;
      role?: string;
      status?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignCoordinator> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const coordinator = await this.db.updateCampaignCoordinator(id, organizationId, data);

    // Memory OS Event log
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignCoordinatorUpdated",
            `Coordinator ${id} of level [${coordinator.coordinatorLevel}] updated`
          );
        }
      } catch (e) {}
    }

    return coordinator;
  }

  public async getAssignments(organizationId: string, campaignId: string): Promise<CampaignCoordinatorAssignment[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    return this.db.getCoordinatorAssignments(organizationId, campaignId);
  }

  public async assignCoordinator(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      coordinatorId: string;
      territoryId: string;
      assignmentType: string;
      status?: string;
      startedAt?: string;
      endedAt?: string | null;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignCoordinatorAssignment> {
    if (!organizationId || !workspaceId || !campaignId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, and campaign_id are required.");
    }

    const assignment = await this.db.assignCoordinatorToTerritory({
      organizationId,
      workspaceId,
      campaignId,
      coordinatorId: data.coordinatorId,
      territoryId: data.territoryId,
      assignmentType: data.assignmentType,
      status: data.status || "ACTIVE",
      startedAt: data.startedAt || new Date().toISOString(),
      endedAt: data.endedAt || null,
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph linking
    if (this.kgEngine) {
      try {
        const coordNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Coordinator: ${data.coordinatorId}`, "", data.coordinatorId);
        const terrNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Territory: ${data.territoryId}`, "", data.territoryId);
        
        await this.kgEngine.createRelationship(organizationId, coordNode.id, terrNode.id, `ASSIGNED_TO_${data.assignmentType.toUpperCase()}` as any);
      } catch (e) {
        console.warn("CoordinatorOperationalEngine KG linking error:", e);
      }
    }

    // Memory OS event register
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CoordinatorAssigned",
            `Coordinator ${data.coordinatorId} assigned to territory ${data.territoryId} as ${data.assignmentType}`
          );
        }
      } catch (e) {}
    }

    return assignment;
  }

  public async removeAssignment(id: string, organizationId: string): Promise<void> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    await this.db.removeCoordinatorAssignment(id, organizationId);
  }

  public async getHealth(organizationId: string, campaignId: string): Promise<CampaignCoordinatorHealth[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    return this.db.getCoordinatorHealth(organizationId, campaignId);
  }

  public async computeHealth(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    coordinatorId: string
  ): Promise<CampaignCoordinatorHealth> {
    if (!organizationId || !workspaceId || !campaignId || !coordinatorId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, campaign_id, and coordinator_id are required.");
    }

    // 1. Get coordinator assigned territories
    const assignments = await this.db.getCoordinatorAssignments(organizationId, campaignId);
    const activeAssignments = assignments.filter(
      a => a.coordinatorId === coordinatorId && a.status === "ACTIVE"
    );
    const assignedTerritoriesCount = activeAssignments.length;

    // 2. Fetch campaign tasks/actions assigned to this coordinator
    const campaignTasks = await this.db.getElectoralCampaignTasks(organizationId, campaignId);
    
    // Check assignments on campaign tasks where assignedCoordinatorId === coordinatorId
    const coordinatorTasks = campaignTasks.filter(
      t => t.assignedCoordinatorId === coordinatorId
    );

    const activeActionsCount = coordinatorTasks.filter(
      t => t.status === "IN_PROGRESS" || t.status === "PENDING"
    ).length;

    const completedActionsCount = coordinatorTasks.filter(
      t => t.status === "COMPLETED"
    ).length;

    const pendingActionsCount = coordinatorTasks.filter(
      t => t.status === "PENDING"
    ).length;

    // Determine last activity time
    let lastActivityAt: string | null = null;
    let maxTimeVal = 0;

    const datesToCompare = [
      ...activeAssignments.map(a => String(a.updatedAt || a.createdAt)),
      ...coordinatorTasks.map(t => String(t.updatedAt || t.createdAt))
    ];

    for (const dt of datesToCompare) {
      if (dt) {
        const val = Date.parse(dt);
        if (!isNaN(val) && val > maxTimeVal) {
          maxTimeVal = val;
          lastActivityAt = dt;
        }
      }
    }

    // 4. Map health status based on strict Coordinator Health rules
    let healthStatus: string = "NO_DATA";
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;

    if (assignedTerritoriesCount === 0) {
      if (lastActivityAt && Date.parse(lastActivityAt) < fifteenDaysAgo) {
        healthStatus = "INACTIVE";
      } else {
        healthStatus = "NO_DATA";
      }
    } else {
      if (activeActionsCount === 0) {
        if (lastActivityAt && Date.parse(lastActivityAt) < fifteenDaysAgo) {
          healthStatus = "LOW_ACTIVITY";
        } else {
          healthStatus = "ACTIVE";
        }
      } else if (activeActionsCount > 0 && activeActionsCount <= 5) {
        healthStatus = "ACTIVE";
      } else if (activeActionsCount > 5) {
        healthStatus = "OVERLOADED";
      }
    }

    const health = await this.db.computeCoordinatorHealth({
      organizationId,
      workspaceId,
      campaignId,
      coordinatorId,
      assignedTerritoriesCount,
      activeActionsCount,
      completedActionsCount,
      pendingActionsCount,
      lastActivityAt,
      healthStatus,
      metadataJson: {
        computedAt: new Date().toISOString()
      }
    });

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CoordinatorHealthComputed",
            `Health computed for coordinator ${coordinatorId}: ${healthStatus}`
          );
        }
      } catch (e) {}
    }

    return health;
  }
}
