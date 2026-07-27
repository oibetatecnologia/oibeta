import { CampaignObjective } from "./CampaignObjectiveEngine";
import { CampaignTask } from "./CampaignTaskEngine";
import { Territory, Coordinator } from "./ElectoralDomainEngine";

export interface CampaignProgress {
  progressPercentage: number;
  metrics: {
    totalObjectives: number;
    completedObjectives: number;
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    totalTerritories: number;
    assignedTerritoriesCount: number;
    territorialCoveragePercentage: number;
  };
}

export class CampaignProgressEngine {
  public calculateProgress(
    objectives: CampaignObjective[],
    tasks: CampaignTask[],
    territories: Territory[],
    coordinators: Coordinator[]
  ): CampaignProgress {
    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter(o => o.status === 'COMPLETED').length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;

    // Territorial Coverage (territories that have at least one coordinator assigned or registered)
    const totalTerritories = territories.length;
    const assignedTerritoryIds = new Set<string>();
    for (const c of coordinators) {
      if (c.assignedTerritory) {
        assignedTerritoryIds.add(c.assignedTerritory);
      }
    }
    const assignedTerritoriesCount = territories.filter(t => assignedTerritoryIds.has(t.id)).length;
    const territorialCoveragePercentage = totalTerritories > 0 
      ? Math.round((assignedTerritoriesCount / totalTerritories) * 100)
      : 0;

    // Calculate main progress percentage
    // Let's use a standard completion metric of objectives and tasks
    let progressPercentage = 0;
    const totalItems = totalObjectives + totalTasks;
    if (totalItems > 0) {
      const completedItems = completedObjectives + completedTasks;
      progressPercentage = Math.round((completedItems / totalItems) * 100);
    }

    // Keep between 0 and 100
    progressPercentage = Math.max(0, Math.min(100, progressPercentage));

    return {
      progressPercentage,
      metrics: {
        totalObjectives,
        completedObjectives,
        totalTasks,
        completedTasks,
        blockedTasks,
        totalTerritories,
        assignedTerritoriesCount,
        territorialCoveragePercentage
      }
    };
  }
}
