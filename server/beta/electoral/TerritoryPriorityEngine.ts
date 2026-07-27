import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory, Coordinator } from "./ElectoralDomainEngine";
import { TerritoryCoverageEngine } from "./TerritoryCoverageEngine";
import { CampaignTask } from "./CampaignTaskEngine";
import { CampaignObjective } from "./CampaignObjectiveEngine";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TerritoryPriorityResult {
  territoryId: string;
  name: string | null;
  type: string;
  score: number;
  priorityLevel: PriorityLevel;
  indicators: {
    coverageStatus: string;
    hasCoordinator: boolean;
    taskCount: number;
    objectiveCount: number;
  };
}

export class TerritoryPriorityEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private coverageEngine: TerritoryCoverageEngine
  ) {}

  public async calculatePriority(
    organizationId: string,
    territoryId: string,
    allTerritories: Territory[],
    allCoordinators: Coordinator[],
    allTasks: CampaignTask[],
    allObjectives: CampaignObjective[]
  ): Promise<TerritoryPriorityResult> {
    const territory = allTerritories.find((t) => t.id === territoryId);
    if (!territory) {
      throw new Error(`Territory with ID ${territoryId} not found`);
    }

    // 1. Coverage indicator
    const coverageRes = await this.coverageEngine.calculateCoverageForTerritory(
      organizationId,
      territoryId,
      allTerritories,
      allCoordinators
    );

    let score = 0;
    if (coverageRes.status === "UNCOVERED") {
      score += 3;
    } else if (coverageRes.status === "PARTIAL") {
      score += 2;
    } else {
      score += 1;
    }

    // 2. Direct coordinator indicator
    const hasCoordinator = coverageRes.directCoordinators.length > 0;
    if (!hasCoordinator) {
      score += 2; // Unassigned territory elevates priority
    }

    // 3. Task load for coordinators assigned to this territory
    const territoryCoordIds = new Set(coverageRes.directCoordinators.map((c) => c.id));
    const territoryTasks = allTasks.filter(
      (task) => task.assignedCoordinatorId && territoryCoordIds.has(task.assignedCoordinatorId)
    );
    const taskCount = territoryTasks.length;
    if (taskCount > 3) {
      score += 2;
    } else if (taskCount > 0) {
      score += 1;
    }

    // 4. Objective count mapping
    // We check high priority campaign objectives
    const highPriorityObjectives = allObjectives.filter(
      (obj) => obj.priority === "HIGH" || obj.priority === "CRITICAL"
    );
    const objectiveCount = highPriorityObjectives.length;
    if (objectiveCount > 2) {
      score += 1;
    }

    // Map total score to a priority level
    let priorityLevel: PriorityLevel = "LOW";
    if (score >= 6) {
      priorityLevel = "CRITICAL";
    } else if (score >= 4) {
      priorityLevel = "HIGH";
    } else if (score >= 3) {
      priorityLevel = "MEDIUM";
    } else {
      priorityLevel = "LOW";
    }

    return {
      territoryId,
      name: territory.name,
      type: territory.type,
      score,
      priorityLevel,
      indicators: {
        coverageStatus: coverageRes.status,
        hasCoordinator,
        taskCount,
        objectiveCount
      }
    };
  }

  public async getPriorities(organizationId: string): Promise<TerritoryPriorityResult[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    // Retrieve active tasks & objectives
    const allCampaigns = await this.domainEngine.getCampaigns(organizationId);
    const mainCampaignId = allCampaigns.length > 0 ? allCampaigns[0].id : undefined;

    const allTasks = mainCampaignId ? await this.dbAdapter.getElectoralCampaignTasks(organizationId, mainCampaignId) : [];
    const allObjectives = mainCampaignId ? await this.dbAdapter.getElectoralCampaignObjectives(organizationId, mainCampaignId) : [];

    const results: TerritoryPriorityResult[] = [];
    for (const t of territories) {
      const res = await this.calculatePriority(
        organizationId,
        t.id,
        territories,
        coordinators,
        allTasks,
        allObjectives
      );
      results.push(res);
    }

    return results;
  }
}
