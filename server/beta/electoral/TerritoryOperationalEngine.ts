import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { 
  CampaignTerritory, 
  CampaignTerritoryCoverage, 
  CampaignTerritoryConflict 
} from "../core/types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class TerritoryOperationalEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getTerritories(organizationId: string, campaignId: string): Promise<CampaignTerritory[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    if (!campaignId) {
      throw new Error("Campaign Error: campaignId is required");
    }
    return this.db.getCampaignTerritories(organizationId, campaignId);
  }

  public async getTerritory(organizationId: string, campaignId: string, id: string): Promise<CampaignTerritory | null> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    const territories = await this.db.getCampaignTerritories(organizationId, campaignId);
    return territories.find(t => t.id === id) || null;
  }

  public async createTerritory(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      parentTerritoryId?: string | null;
      territoryType: string;
      name: string;
      description?: string | null;
      geoCode?: string | null;
      status?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignTerritory> {
    if (!organizationId || !workspaceId || !campaignId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, and campaign_id are mandatory.");
    }

    const territory = await this.db.createCampaignTerritory({
      organizationId,
      workspaceId,
      campaignId,
      parentTerritoryId: data.parentTerritoryId || null,
      territoryType: data.territoryType,
      name: data.name,
      description: data.description || null,
      geoCode: data.geoCode || null,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph: Campaign HAS_TERRITORY -> Territory, Territory BELONGS_TO -> Campaign, Territory CHILD_OF -> Parent
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Campaign: ${campaignId}`, "", campaignId);
        const terrNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Territory: ${data.name}`, `[${data.territoryType}]`, territory.id);
        
        await this.kgEngine.createRelationship(organizationId, campNode.id, terrNode.id, "HAS_TERRITORY" as any);
        await this.kgEngine.createRelationship(organizationId, terrNode.id, campNode.id, "BELONGS_TO" as any);

        if (data.parentTerritoryId) {
          const parentNode = await this.kgEngine.ensureNode(organizationId, null, "KNOWLEDGE", `Territory: ${data.parentTerritoryId}`, "", data.parentTerritoryId);
          await this.kgEngine.createRelationship(organizationId, terrNode.id, parentNode.id, "CHILD_OF" as any);
        }
      } catch (e) {
        console.warn("TerritoryOperationalEngine KG integration failing:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignTerritoryCreated",
            `Territory ${data.name} (${data.territoryType}) created for campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return territory;
  }

  public async updateTerritory(
    id: string,
    organizationId: string,
    campaignId: string,
    data: {
      parentTerritoryId?: string | null;
      territoryType?: string;
      name?: string;
      description?: string | null;
      geoCode?: string | null;
      status?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignTerritory> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const territory = await this.db.updateCampaignTerritory(id, organizationId, data);

    // Memory OS Event
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignTerritoryUpdated",
            `Territory ${territory.name} (${territory.id}) was updated in campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return territory;
  }

  public async getCoverage(organizationId: string, campaignId: string): Promise<CampaignTerritoryCoverage[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    return this.db.getTerritoryCoverage(organizationId, campaignId);
  }

  public async computeCoverage(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    territoryId: string
  ): Promise<CampaignTerritoryCoverage> {
    if (!organizationId || !workspaceId || !campaignId || !territoryId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, campaign_id, and territory_id are required.");
    }

    // 1. Count coordinators assigned to this territory
    const assignments = await this.db.getCoordinatorAssignments(organizationId, campaignId);
    const activeAssignments = assignments.filter(
      a => a.territoryId === territoryId && a.status === "ACTIVE"
    );
    const coordinatorsCount = activeAssignments.length;

    // 2. Count members under campaign
    const members = await this.db.getCampaignMembers(campaignId);
    const membersCount = members.length;

    // 3. Count actions and evidences
    const actions = await this.db.getCampaignActions(campaignId);
    // filter actions that might belong to child activities of this territory or if none, we look at total campaign action volume
    // But since actions are linked to activities, we can match direct activity link
    const orgActivities = await this.db.getActivities(organizationId);
    const territoryActivities = orgActivities.filter(act => act.territoryId === territoryId);
    const territoryActivityIds = new Set(territoryActivities.map(a => a.id));

    const actionsCount = actions.filter(action => {
      if (!action.activityId) return false;
      return territoryActivityIds.has(action.activityId);
    }).length;

    const evidences = await this.db.getCampaignEvidences(campaignId);
    const evidencesCount = evidences.length; // Campaign-wide or linked. Since campaign evidences are linked to evidence IDs, retrieve evidence and count
    
    // Determine last activity time
    let lastActivityAt: string | null = null;
    let maxTimeVal = 0;

    const datesToCompare = [
      ...activeAssignments.map(a => String(a.updatedAt || a.createdAt)),
      ...territoryActivities.map(act => String(act.updatedAt || act.createdAt))
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

    // 4. Determine status using the strict Coverage Rules
    let coverageStatus: string = "NO_DATA";
    if (coordinatorsCount === 0 && membersCount === 0 && actionsCount === 0 && evidencesCount === 0) {
      coverageStatus = "NO_DATA";
    } else if (coordinatorsCount === 0) {
      coverageStatus = "UNCOVERED";
    } else if (coordinatorsCount > 0 && actionsCount === 0 && evidencesCount === 0) {
      coverageStatus = "LOW_COVERAGE";
    } else if (coordinatorsCount > 0 && (actionsCount > 0 || evidencesCount > 0) && !(actionsCount > 0 && evidencesCount > 0)) {
      coverageStatus = "PARTIAL_COVERAGE";
    } else if (coordinatorsCount > 0 && actionsCount > 0 && evidencesCount > 0) {
      coverageStatus = "COVERED";
    }

    const coverage = await this.db.computeTerritoryCoverage({
      organizationId,
      workspaceId,
      campaignId,
      territoryId,
      coordinatorsCount,
      membersCount,
      actionsCount,
      evidencesCount,
      lastActivityAt,
      coverageStatus,
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
            "TerritoryCoverageComputed",
            `Coverage computed for territory ${territoryId}: ${coverageStatus}`
          );
        }
      } catch (e) {}
    }

    return coverage;
  }

  public async getConflicts(organizationId: string, campaignId: string): Promise<CampaignTerritoryConflict[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    return this.db.getTerritoryConflicts(organizationId, campaignId);
  }

  public async detectConflicts(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    territoryId: string
  ): Promise<CampaignTerritoryConflict[]> {
    if (!organizationId || !workspaceId || !campaignId || !territoryId) {
      throw new Error("Multi-Tenant Error: organization_id, workspace_id, campaign_id, and territory_id are required.");
    }

    const conflicts: CampaignTerritoryConflict[] = [];

    // 1. Fetch coordinators & active assignments of this territory
    const assignments = await this.db.getCoordinatorAssignments(organizationId, campaignId);
    const activeAssignments = assignments.filter(
      a => a.territoryId === territoryId && a.status === "ACTIVE"
    );

    const primaryAssignments = activeAssignments.filter(a => a.assignmentType === "primary");

    // Conflict type: multiple_primary_coordinators
    if (primaryAssignments.length > 1) {
      const conflict = await this.db.computeTerritoryConflicts({
        organizationId,
        workspaceId,
        campaignId,
        territoryId,
        conflictType: "multiple_primary_coordinators",
        description: `Territory has ${primaryAssignments.length} primary coordinators assigned simultaneously.`,
        status: "ACTIVE"
      });
      conflicts.push(conflict);
    }

    // Conflict type: territory_without_coordinator
    if (activeAssignments.length === 0) {
      const conflict = await this.db.computeTerritoryConflicts({
        organizationId,
        workspaceId,
        campaignId,
        territoryId,
        conflictType: "territory_without_coordinator",
        description: `Territory has zero active coordinator assignments.`,
        status: "ACTIVE"
      });
      conflicts.push(conflict);
    }

    // Conflict type: inactive_primary_coordinator
    const coordinators = await this.db.getCampaignCoordinators(organizationId, campaignId);
    for (const primary of primaryAssignments) {
      const coord = coordinators.find(c => c.id === primary.coordinatorId);
      if (coord && coord.status !== "ACTIVE") {
        const conflict = await this.db.computeTerritoryConflicts({
          organizationId,
          workspaceId,
          campaignId,
          territoryId,
          conflictType: "inactive_primary_coordinator",
          description: `Primary coordinator ${coord.id} assigned is set to status ${coord.status}.`,
          status: "ACTIVE"
        });
        conflicts.push(conflict);
      }
    }

    // Save detected conflicts to Memory OS
    if (this.memoryOS && conflicts.length > 0) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          for (const conflict of conflicts) {
            await (this.memoryOS as any).registerEvent(
              organizationId,
              "TerritoryConflictDetected",
              `Conflict [${conflict.conflictType}] detected on territory ${territoryId}: ${conflict.description}`
            );
          }
        }
      } catch (e) {}
    }

    return conflicts;
  }
}
