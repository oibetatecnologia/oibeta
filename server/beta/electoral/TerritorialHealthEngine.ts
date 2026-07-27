import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory, Coordinator } from "./ElectoralDomainEngine";
import { TerritoryCoverageEngine } from "./TerritoryCoverageEngine";
import { TerritoryConflictEngine } from "./TerritoryConflictEngine";

export type HealthState = "NO_DATA" | "PARTIAL_DATA" | "READY";

export interface TerritoryHealthResult {
  state: HealthState;
  score: number; // 0 to 100 estimated health score
  indicators: {
    coverageRate: number; // Percentage of covered/partial territories
    conflictCount: number;
    activeCoordinatorsCount: number;
    totalTasksCount: number;
    totalObjectivesCount: number;
  };
  diagnostics: string;
}

export class TerritorialHealthEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private coverageEngine: TerritoryCoverageEngine,
    private conflictEngine: TerritoryConflictEngine
  ) {}

  public async getTerritorialHealth(organizationId: string): Promise<TerritoryHealthResult> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    // Retrieve active campaigns triggers
    const allCampaigns = await this.domainEngine.getCampaigns(organizationId);
    const mainCampaignId = allCampaigns.length > 0 ? allCampaigns[0].id : undefined;

    const allTasks = mainCampaignId ? await this.dbAdapter.getElectoralCampaignTasks(organizationId, mainCampaignId) : [];
    const allObjectives = mainCampaignId ? await this.dbAdapter.getElectoralCampaignObjectives(organizationId, mainCampaignId) : [];

    const activeCoordinators = coordinators.filter((c) => c.status === "ACTIVE");

    if (territories.length === 0) {
      return {
        state: "NO_DATA",
        score: 0,
        indicators: {
          coverageRate: 0,
          conflictCount: 0,
          activeCoordinatorsCount: 0,
          totalTasksCount: 0,
          totalObjectivesCount: 0
        },
        diagnostics: "No momento, estima-se que não existam dados territoriais cadastrados no sistema para análise."
      };
    }

    // Calculate coverage rate
    const coverageResults = await this.coverageEngine.getCoverage(organizationId);
    const coveredOrPartialCount = coverageResults.filter((r) => r.status === "COVERED" || r.status === "PARTIAL").length;
    const coverageRate = Math.round((coveredOrPartialCount / territories.length) * 100);

    // Get conflict count
    const conflicts = await this.conflictEngine.detectConflicts(organizationId);
    const conflictCount = conflicts.length;

    // Evaluate health state
    let state: HealthState = "READY";
    if (activeCoordinators.length === 0 || allTasks.length === 0) {
      state = "PARTIAL_DATA";
    }

    // Estimate total health score
    let score = 100;
    
    // Deduct for uncovered proportion
    score -= (100 - coverageRate) * 0.4;
    
    // Deduct for conflicts
    score -= conflictCount * 12;

    // Normalize score
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Generate balanced, tentative diagnosis (using non-absolute wording)
    let diagnostics = `Com base nos parâmetros correntes, a cobertura operacional estimada é de aproximadamente ${coverageRate}%. `;
    if (conflictCount > 0) {
      diagnostics += `Foram detectados indícios de inconsistência ou conflitos em cerca de ${conflictCount} pontos da estrutura, sugerindo atenção técnica. `;
    } else {
      diagnostics += "Não foram identificados graves indícios de conflitos territoriais na estrutura carregada. ";
    }

    if (state === "PARTIAL_DATA") {
      diagnostics += "O cenário sugere dados parciais, aguardando o registro de novos coordenadores ou de tarefas para consolidar a análise.";
    } else {
      diagnostics += "A estrutura apresenta-se com maturidade de preenchimento considerada consistente.";
    }

    return {
      state,
      score,
      indicators: {
        coverageRate,
        conflictCount,
        activeCoordinatorsCount: activeCoordinators.length,
        totalTasksCount: allTasks.length,
        totalObjectivesCount: allObjectives.length
      },
      diagnostics
    };
  }
}
