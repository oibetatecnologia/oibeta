import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory } from "./ElectoralDomainEngine";
import { TerritoryHierarchyEngine } from "./TerritoryHierarchyEngine";
import { TerritoryCoverageEngine } from "./TerritoryCoverageEngine";
import { TerritoryPriorityEngine } from "./TerritoryPriorityEngine";
import { TerritoryConflictEngine } from "./TerritoryConflictEngine";
import { TerritoryResponsibilityEngine } from "./TerritoryResponsibilityEngine";
import { TerritorialHealthEngine } from "./TerritorialHealthEngine";
import { TerritorialBriefGenerator } from "./TerritorialBriefGenerator";

export class TerritorialIntelligenceEngine {
  public hierarchyEngine: TerritoryHierarchyEngine;
  public coverageEngine: TerritoryCoverageEngine;
  public priorityEngine: TerritoryPriorityEngine;
  public conflictEngine: TerritoryConflictEngine;
  public responsibilityEngine: TerritoryResponsibilityEngine;
  public healthEngine: TerritorialHealthEngine;
  public briefGenerator: TerritorialBriefGenerator;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine
  ) {
    this.hierarchyEngine = new TerritoryHierarchyEngine(dbAdapter, domainEngine);
    this.coverageEngine = new TerritoryCoverageEngine(dbAdapter, domainEngine, this.hierarchyEngine);
    this.priorityEngine = new TerritoryPriorityEngine(dbAdapter, domainEngine, this.coverageEngine);
    this.conflictEngine = new TerritoryConflictEngine(dbAdapter, domainEngine, this.hierarchyEngine);
    this.responsibilityEngine = new TerritoryResponsibilityEngine(dbAdapter, domainEngine, this.hierarchyEngine);
    this.healthEngine = new TerritorialHealthEngine(dbAdapter, domainEngine, this.coverageEngine, this.conflictEngine);
    this.briefGenerator = new TerritorialBriefGenerator(dbAdapter, domainEngine, this.coverageEngine);
  }

  public async getConsolidatedSnapshot(organizationId: string): Promise<any> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    if (territories.length === 0) {
      return {
        territoriesCount: 0,
        coverageSummary: [],
        prioritySummary: [],
        conflicts: [],
        health: { state: "NO_DATA", score: 0, diagnostics: "Aguardando dados de territórios." },
        brief: "Ainda não há dados territoriais suficientes cadastrados."
      };
    }

    const coverageSummary = await this.coverageEngine.getCoverage(organizationId);
    const prioritySummary = await this.priorityEngine.getPriorities(organizationId);
    const conflicts = await this.conflictEngine.detectConflicts(organizationId);
    const health = await this.healthEngine.getTerritorialHealth(organizationId);
    const brief = await this.briefGenerator.generateBrief(organizationId);

    return {
      territoriesCount: territories.length,
      coverageSummary,
      prioritySummary,
      conflicts,
      health,
      brief
    };
  }
}
