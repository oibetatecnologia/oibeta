import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory, Coordinator } from "./ElectoralDomainEngine";
import { TerritoryHierarchyEngine } from "./TerritoryHierarchyEngine";
import { CampaignTask } from "./CampaignTaskEngine";
import { CampaignObjective } from "./CampaignObjectiveEngine";

export interface TerritoryResponsibilityResult {
  territoryId: string;
  name: string | null;
  type: string;
  primaryResponsible: Coordinator | null;
  responsibleSource: "DIRECT" | "ANCESTOR" | "NONE";
  coordinatorsCount: number;
  allCoordinators: Coordinator[];
  directCoordinators: Coordinator[];
  tasks: CampaignTask[];
  objectives: CampaignObjective[];
}

export class TerritoryResponsibilityEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private hierarchyEngine: TerritoryHierarchyEngine
  ) {}

  public async getResponsibilities(organizationId: string, territoryId: string): Promise<TerritoryResponsibilityResult> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    const territory = territories.find((t) => t.id === territoryId);
    if (!territory) {
      throw new Error(`Territory with ID ${territoryId} not found`);
    }

    // 1. Direct and descendants actors
    const directCoordinators = coordinators.filter(
      (c) => (c.territoryId === territoryId || c.assignedTerritory === territoryId) && c.status === "ACTIVE"
    );

    const descendants = await this.hierarchyEngine.getDescendants(organizationId, territoryId);
    const descendentIds = new Set(descendants.map((d) => d.id));
    const descendentCoordinators = coordinators.filter(
      (c) => {
        const tId = c.territoryId || c.assignedTerritory;
        return tId && descendentIds.has(tId) && c.status === "ACTIVE";
      }
    );

    const allActCoordsMap = new Map<string, Coordinator>();
    directCoordinators.forEach((c) => allActCoordsMap.set(c.id, c));
    descendentCoordinators.forEach((c) => allActCoordsMap.set(c.id, c));
    const allCoordinatorsInTerritory = Array.from(allActCoordsMap.values());

    // 2. Primary Responsible (Direct, otherwise traverse Ancestors)
    let primaryResponsible: Coordinator | null = null;
    let responsibleSource: "DIRECT" | "ANCESTOR" | "NONE" = "NONE";

    if (directCoordinators.length > 0) {
      primaryResponsible = directCoordinators[0];
      responsibleSource = "DIRECT";
    } else {
      const ancestors = await this.hierarchyEngine.getAncestors(organizationId, territoryId);
      for (const ancestor of ancestors) {
        const ancestorCoords = coordinators.filter(
          (c) => (c.territoryId === ancestor.id || c.assignedTerritory === ancestor.id) && c.status === "ACTIVE"
        );
        if (ancestorCoords.length > 0) {
          primaryResponsible = ancestorCoords[0];
          responsibleSource = "ANCESTOR";
          break;
        }
      }
    }

    // 3. Tasks & Objectives
    const allCampaigns = await this.domainEngine.getCampaigns(organizationId);
    const mainCampaignId = allCampaigns.length > 0 ? allCampaigns[0].id : undefined;

    const allTasks: CampaignTask[] = mainCampaignId
      ? await this.dbAdapter.getElectoralCampaignTasks(organizationId, mainCampaignId)
      : [];
    const allObjectives: CampaignObjective[] = mainCampaignId
      ? await this.dbAdapter.getElectoralCampaignObjectives(organizationId, mainCampaignId)
      : [];

    const actorIdsInTerritory = new Set(allCoordinatorsInTerritory.map((c) => c.id));
    
    // Tasks are linked if they are assigned to any coordinator acting in this territory/descendants
    const relevantTasks = allTasks.filter(
      (t) => t.assignedCoordinatorId && actorIdsInTerritory.has(t.assignedCoordinatorId)
    );

    // Objectives linked to these tasks
    const linkedObjectiveIds = new Set(relevantTasks.map((t) => t.objectiveId).filter(Boolean));
    const relevantObjectives = allObjectives.filter((obj) => linkedObjectiveIds.has(obj.id));

    return {
      territoryId,
      name: territory.name,
      type: territory.type,
      primaryResponsible,
      responsibleSource,
      coordinatorsCount: allCoordinatorsInTerritory.length,
      allCoordinators: allCoordinatorsInTerritory,
      directCoordinators,
      tasks: relevantTasks,
      objectives: relevantObjectives
    };
  }
}
