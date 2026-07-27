import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine, Coordinator, Territory } from "./ElectoralDomainEngine";
import { CampaignObjective } from "./CampaignObjectiveEngine";
import { CampaignTask } from "./CampaignTaskEngine";

export interface CoordinatorResponsibilities {
  objectives: CampaignObjective[];
  tasks: CampaignTask[];
  territories: Territory[];
}

export interface ExpandedCoordinator extends Coordinator {
  responsibilities: CoordinatorResponsibilities;
}

export class CoordinatorEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine
  ) {}

  public async registerCoordinator(
    organizationId: string,
    projectId: string | null,
    coordinatorData: {
      id?: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      level: 'GENERAL' | 'REGIONAL' | 'MUNICIPAL' | 'DISTRICT' | 'VOTING_LOCATION';
      status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
      assignedTerritory?: string | null;
      campaignId?: string | null;
    },
    workspaceId?: string
  ): Promise<Coordinator> {
    const wsId = workspaceId || "default-workspace";
    const coord = await this.domainEngine.registerCoordinator(organizationId, projectId, coordinatorData, wsId);

    // Explicitly coordinate roles in relationships
    if (coordinatorData.campaignId) {
      await this.kgEngine.createRelationship(organizationId, coord.id, coordinatorData.campaignId, "COORDINATES", wsId);
    }

    if (coordinatorData.assignedTerritory) {
      await this.kgEngine.createRelationship(organizationId, coord.id, coordinatorData.assignedTerritory, "RESPONSIBLE_FOR", wsId);
      await this.kgEngine.createRelationship(organizationId, coord.id, coordinatorData.assignedTerritory, "RESPONSIBLE_FOR_TERRITORY", wsId);
    }

    return coord;
  }

  public async getCoordinatorsByCampaign(organizationId: string, campaignId: string): Promise<Coordinator[]> {
    const list = await this.domainEngine.getCoordinators(organizationId);
    return list.filter(c => c.campaignId === campaignId);
  }

  public async getCoordinatorsByTerritory(organizationId: string, territoryId: string): Promise<Coordinator[]> {
    const list = await this.domainEngine.getCoordinators(organizationId);
    return list.filter(c => c.assignedTerritory === territoryId);
  }

  public async getUnassignedCoordinators(organizationId: string): Promise<Coordinator[]> {
    const list = await this.domainEngine.getCoordinators(organizationId);
    return list.filter(c => !c.assignedTerritory);
  }

  // RESPONSIBILITY MODEL METHODS

  public async linkCoordinatorToObjective(organizationId: string, coordinatorId: string, objectiveId: string): Promise<void> {
    await this.kgEngine.createRelationship(organizationId, coordinatorId, objectiveId, "RESPONSIBLE_FOR_OBJECTIVE");
  }

  public async linkCoordinatorToTerritory(organizationId: string, coordinatorId: string, territoryId: string): Promise<void> {
    await this.kgEngine.createRelationship(organizationId, coordinatorId, territoryId, "RESPONSIBLE_FOR_TERRITORY");
  }

  public async linkCoordinatorToTask(organizationId: string, coordinatorId: string, taskId: string): Promise<void> {
    await this.kgEngine.createRelationship(organizationId, coordinatorId, taskId, "RESPONSIBLE_FOR_TASK");
  }

  public async getCoordinatorsWithResponsibilities(
    organizationId: string,
    campaignId?: string,
    workspaceId?: string
  ): Promise<ExpandedCoordinator[]> {
    const coords = await this.domainEngine.getCoordinators(organizationId, workspaceId);
    const campaignCoords = campaignId ? coords.filter(c => c.campaignId === campaignId) : coords;

    // Fetch Tasks & Objectives
    const dbTasks = await this.dbAdapter.getElectoralCampaignTasks(organizationId, campaignId);
    const dbObjectives = await this.dbAdapter.getElectoralCampaignObjectives(organizationId, campaignId);
    const territories = await this.domainEngine.getTerritories(organizationId, workspaceId);

    // Fetch all KG relations of the organization to resolve custom links
    const relations = await this.dbAdapter.getKnowledgeRelations(organizationId, workspaceId || "default-workspace");

    return campaignCoords.map(coord => {
      // 1. Resolve Tasks
      const assignedTasks = dbTasks
        .filter((t: any) => t.assignedCoordinatorId === coord.id)
        .map((rec: any) => ({
          id: rec.id,
          organizationId: rec.organizationId,
          projectId: rec.projectId || null,
          campaignId: rec.campaignId,
          objectiveId: rec.objectiveId || null,
          assignedCoordinatorId: rec.assignedCoordinatorId || null,
          title: rec.title || "Tarefa sem título",
          description: rec.description || null,
          status: rec.status || "PENDING",
          priority: rec.priority || "MEDIUM",
          dueDate: rec.dueDate || null,
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: rec.updatedAt || new Date().toISOString()
        }));

      // 2. Resolve Territories
      const assignedTerritories = territories.filter(t => {
        if (coord.assignedTerritory === t.id) return true;
        
        // Or has RESPONSIBLE_FOR_TERRITORY relationship
        const hasRelation = relations.some(r => 
          r.sourceId === coord.id && 
          r.targetId === t.id && 
          (r.relationshipType === "RESPONSIBLE_FOR_TERRITORY" || r.relationshipType === "RESPONSIBLE_FOR")
        );
        return hasRelation;
      });

      // 3. Resolve Objectives (Directly assigned via RELATION, or linked through tasks assigned to him)
      const objectiveIdsFromTasks = new Set(assignedTasks.map(t => t.objectiveId).filter(Boolean) as string[]);
      
      const assignedObjectives = dbObjectives
        .filter((obj: any) => {
          if (objectiveIdsFromTasks.has(obj.id)) return true;

          // KG relation check
          const hasRelation = relations.some(r => 
            r.sourceId === coord.id && 
            r.targetId === obj.id && 
            r.relationshipType === "RESPONSIBLE_FOR_OBJECTIVE"
          );
          return hasRelation;
        })
        .map((rec: any) => ({
          id: rec.id,
          organizationId: rec.organizationId,
          projectId: rec.projectId || null,
          campaignId: rec.campaignId,
          title: rec.title || "Meta sem título",
          description: rec.description || null,
          priority: rec.priority || "MEDIUM",
          status: rec.status || "PENDING",
          dueDate: rec.dueDate || null,
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: rec.updatedAt || new Date().toISOString()
        }));

      return {
        ...coord,
        responsibilities: {
          objectives: assignedObjectives,
          tasks: assignedTasks,
          territories: assignedTerritories
        }
      };
    });
  }
}

