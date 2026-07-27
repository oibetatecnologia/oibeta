import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Coordinator, Territory } from "./ElectoralDomainEngine";
import { TerritoryHierarchyEngine } from "./TerritoryHierarchyEngine";

export type CoverageStatus = "UNCOVERED" | "PARTIAL" | "COVERED";

export interface TerritoryCoverageResult {
  territoryId: string;
  name: string | null;
  type: string;
  status: CoverageStatus;
  directCoordinators: Coordinator[];
  coveredDescendantsCount: number;
  totalDescendantsCount: number;
}

export class TerritoryCoverageEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private hierarchyEngine: TerritoryHierarchyEngine
  ) {}

  public async calculateCoverageForTerritory(
    organizationId: string,
    territoryId: string,
    allTerritories: Territory[],
    allCoordinators: Coordinator[]
  ): Promise<TerritoryCoverageResult> {
    const territory = allTerritories.find((t) => t.id === territoryId);
    if (!territory) {
      throw new Error(`Territory with ID ${territoryId} not found`);
    }

    const descendants = await this.hierarchyEngine.getDescendants(organizationId, territoryId);
    const directCoordinators = allCoordinators.filter(
      (c) => (c.territoryId === territoryId || c.assignedTerritory === territoryId) && c.status === "ACTIVE"
    );

    const hasDirect = directCoordinators.length > 0;
    const totalDescendantsCount = descendants.length;

    let coveredDescendantsCount = 0;
    descendants.forEach((d) => {
      const hasCoord = allCoordinators.some(
        (c) => (c.territoryId === d.id || c.assignedTerritory === d.id) && c.status === "ACTIVE"
      );
      if (hasCoord) {
        coveredDescendantsCount++;
      }
    });

    let status: CoverageStatus = "UNCOVERED";
    if (totalDescendantsCount === 0) {
      status = hasDirect ? "COVERED" : "UNCOVERED";
    } else {
      if (hasDirect && coveredDescendantsCount === totalDescendantsCount) {
        status = "COVERED";
      } else if (!hasDirect && coveredDescendantsCount === 0) {
        status = "UNCOVERED";
      } else {
        status = "PARTIAL";
      }
    }

    return {
      territoryId: territory.id,
      name: territory.name,
      type: territory.type,
      status,
      directCoordinators,
      coveredDescendantsCount,
      totalDescendantsCount
    };
  }

  public async getCoverage(organizationId: string): Promise<TerritoryCoverageResult[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    const results: TerritoryCoverageResult[] = [];
    for (const t of territories) {
      const res = await this.calculateCoverageForTerritory(organizationId, t.id, territories, coordinators);
      results.push(res);
    }

    return results;
  }
}
