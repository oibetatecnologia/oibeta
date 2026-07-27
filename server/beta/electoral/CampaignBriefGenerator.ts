import { Campaign } from "./CampaignEngine";
import { CampaignObjective } from "./CampaignObjectiveEngine";
import { CampaignTask } from "./CampaignTaskEngine";
import { Territory, Coordinator } from "./ElectoralDomainEngine";

export class CampaignBriefGenerator {
  public generateBrief(
    campaign: Campaign,
    objectives: CampaignObjective[],
    tasks: CampaignTask[],
    territories: Territory[],
    coordinators: Coordinator[]
  ): string {
    const objCount = objectives.length;
    const taskCount = tasks.length;
    const coordCount = coordinators.length;
    const terrCount = territories.length;

    const assignedTerritoryIds = new Set<string>();
    for (const c of coordinators) {
      if (c.assignedTerritory) {
        assignedTerritoryIds.add(c.assignedTerritory);
      }
    }
    const coveredCount = territories.filter(t => assignedTerritoryIds.has(t.id)).length;

    let coverageMsg = "sem territórios mapeados";
    if (terrCount > 0) {
      if (coveredCount === terrCount) {
        coverageMsg = "cobertura territorial completa";
      } else if (coveredCount > 0) {
        coverageMsg = `cobertura territorial parcial (${coveredCount} de ${terrCount} territórios com coordenadores responsáveis)`;
      } else {
        coverageMsg = "sem cobertura territorial mapeada para coordenadores";
      }
    }

    const campName = campaign.name || "Campanha";

    return `Com os dados atualmente carregados, a campanha "${campName}" possui ${objCount} objetivo(s) cadastrado(s), ${taskCount} tarefa(s), ${coordCount} coordenador(es) e ${coverageMsg}.`;
  }
}
