import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory, Coordinator } from "./ElectoralDomainEngine";
import { TerritoryHierarchyEngine } from "./TerritoryHierarchyEngine";

export interface TerritoryConflict {
  type: "ORPHAN_TERRITORY" | "MULTIPLE_COORDINATORS" | "HIERARCHICAL_MISMATCH" | "OVERLAPPING_RESPONSIBILITIES";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  territoryId: string;
  territoryName: string | null;
  description: string;
  details?: any;
}

export class TerritoryConflictEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private hierarchyEngine: TerritoryHierarchyEngine
  ) {}

  public async detectConflicts(organizationId: string): Promise<TerritoryConflict[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    const conflicts: TerritoryConflict[] = [];

    // Map coordinators by territory for easy lookup
    const coordByTerritory = new Map<string, Coordinator[]>();
    coordinators.forEach((c) => {
      const tId = c.territoryId || c.assignedTerritory;
      if (tId && c.status === "ACTIVE") {
        if (!coordByTerritory.has(tId)) {
          coordByTerritory.set(tId, []);
        }
        coordByTerritory.get(tId)!.push(c);
      }
    });

    for (const t of territories) {
      const activeCoords = coordByTerritory.get(t.id) || [];

      // 1. Orphan Territories
      if (t.type !== "STATE" && !t.parentTerritoryId && !t.parentId) {
        conflicts.push({
          type: "ORPHAN_TERRITORY",
          severity: "MEDIUM",
          territoryId: t.id,
          territoryName: t.name,
          description: `O território "${t.name}" (${t.type}) está órfão, pois não tem um território pai (parent_territory_id) definido.`
        });
      }

      // 2. Multiple active coordinators at conflicting levels on the same territory
      const generals = activeCoords.filter((c) => c.level === "GENERAL");
      if (generals.length > 1) {
        conflicts.push({
          type: "MULTIPLE_COORDINATORS",
          severity: "HIGH",
          territoryId: t.id,
          territoryName: t.name,
          description: `O território "${t.name}" possui múltiplos coordenadores gerais (${generals.map(g => g.name).join(", ")}) ativos simultaneamente.`,
          details: { coordinatorIds: generals.map((g) => g.id) }
        });
      }

      // 3. Overlapping responsibilities: same level coordinators assigned directly to the same area
      const levels: ("REGIONAL" | "MUNICIPAL" | "DISTRICT" | "VOTING_LOCATION")[] = [
        "REGIONAL",
        "MUNICIPAL",
        "DISTRICT",
        "VOTING_LOCATION"
      ];
      for (const lvl of levels) {
        const lvlCoords = activeCoords.filter((c) => c.level === lvl);
        if (lvlCoords.length > 1) {
          conflicts.push({
            type: "OVERLAPPING_RESPONSIBILITIES",
            severity: "MEDIUM",
            territoryId: t.id,
            territoryName: t.name,
            description: `O território "${t.name}" possui sobreposição de responsabilidades com múltiplos coordenadores de nível ${lvl} (${lvlCoords.map(c => c.name).join(", ")}).`,
            details: { coordinators: lvlCoords.map((c) => ({ id: c.id, name: c.name })) }
          });
        }
      }

      // 4. Hierarchical Mismatches
      // If territory A has a parent B, the coordinator of A should historically report to B's coordinator
      const pId = t.parentTerritoryId || t.parentId;
      if (pId) {
        const parentTerritory = territories.find((pt) => pt.id === pId);
        if (parentTerritory) {
          const parentCoords = coordByTerritory.get(pId) || [];
          if (activeCoords.length > 0 && parentCoords.length > 0) {
            // Check if any child coordinator does NOT report to any of the parent coordinators (hierarchy breach)
            for (const childCoord of activeCoords) {
              if (childCoord.parentCoordinatorId) {
                const reportsToParentCoord = parentCoords.some((pc) => pc.id === childCoord.parentCoordinatorId);
                // Also check indirect reporting
                if (!reportsToParentCoord) {
                  conflicts.push({
                    type: "HIERARCHICAL_MISMATCH",
                    severity: "LOW",
                    territoryId: t.id,
                    territoryName: t.name,
                    description: `Falta de alinhamento hierárquico: o coordenador "${childCoord.name}" atua em "${t.name}" (filho de "${parentTerritory.name}"), mas seu supervisor direto não é o coordenador do território pai.`,
                    details: {
                      coordinatorId: childCoord.id,
                      parentTerritoryId: pId,
                      expectedSupervisorIds: parentCoords.map((pc) => pc.id)
                    }
                  });
                }
              }
            }
          }
        }
      }
    }

    return conflicts;
  }
}
