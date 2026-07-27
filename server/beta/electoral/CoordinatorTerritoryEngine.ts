import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Coordinator, Territory } from "./ElectoralDomainEngine";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CoordinatorTerritoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  /**
   * Assigns a territory to a coordinator, updating database records and creating KG connections.
   */
  public async assignTerritory(organizationId: string, coordinatorId: string, territoryId: string): Promise<any> {
    const coordinators = await this.domainEngine.getCoordinators(organizationId);
    const coord = coordinators.find(c => c.id === coordinatorId);
    if (!coord) throw new Error("Coordinator not found");

    const territories = await this.domainEngine.getTerritories(organizationId);
    const terr = territories.find(t => t.id === territoryId);
    if (!terr) throw new Error("Territory not found");

    const updated = await this.dbAdapter.updateElectoralCoordinator(coordinatorId, {
      territoryId,
      assignedTerritory: territoryId
    });

    await this.kgEngine.createRelationship(organizationId, coordinatorId, territoryId, "COVERS_TERRITORY");
    await this.kgEngine.createRelationship(organizationId, coordinatorId, territoryId, "ASSIGNED_TO_TERRITORY");

    return updated;
  }

  /**
   * Clears a coordinator's territory assignment.
   */
  public async removeTerritory(organizationId: string, coordinatorId: string): Promise<any> {
    const coordinators = await this.domainEngine.getCoordinators(organizationId);
    const coord = coordinators.find(c => c.id === coordinatorId);
    if (!coord) throw new Error("Coordinator not found");

    const updated = await this.dbAdapter.updateElectoralCoordinator(coordinatorId, {
      territoryId: null,
      assignedTerritory: null
    });

    return updated;
  }

  /**
   * Inspects territory assignment status across all territories.
   */
  public async getTerritoryCoverage(organizationId: string): Promise<any[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    return territories.map(t => {
      const activeCoords = coordinators.filter(c => (c.territoryId === t.id || c.assignedTerritory === t.id) && c.status === "ACTIVE");
      return {
        territory: t,
        coordinators: activeCoords,
        covered: activeCoords.length > 0
      };
    });
  }

  /**
   * Detects assignment conflicts, such as multiple GENERAL or same-level coordinators in the same area.
   */
  public async detectConflicts(organizationId: string): Promise<any[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);

    const conflicts: any[] = [];

    territories.forEach(t => {
      const activeCoords = coordinators.filter(c => (c.territoryId === t.id || c.assignedTerritory === t.id) && c.status === "ACTIVE");
      
      const generals = activeCoords.filter(c => c.level === "GENERAL");
      if (generals.length > 1) {
        conflicts.push({
          type: "MULTIPLE_GENERAL_COORDINATORS",
          territoryId: t.id,
          territoryName: t.name,
          coordinators: generals.map(g => ({ id: g.id, name: g.name })),
          description: `O território "${t.name || t.id}" possui mais de um coordenador geral ativo (${generals.map(g => g.name).join(", ")}).`
        });
      }

      const levels = ["GENERAL", "REGIONAL", "MUNICIPAL", "DISTRICT", "VOTING_LOCATION"];
      levels.forEach(level => {
        const sameLevelCoords = activeCoords.filter(c => c.level === level);
        if (sameLevelCoords.length > 1 && level !== "GENERAL") {
          conflicts.push({
            type: "MULTIPLE_COORDINATORS_SAME_LEVEL",
            territoryId: t.id,
            territoryName: t.name,
            level,
            coordinators: sameLevelCoords.map(c => ({ id: c.id, name: c.name })),
            description: `O território "${t.name || t.id}" possui múltiplos coordenadores do nível "${level}" (${sameLevelCoords.map(c => c.name).join(", ")}).`
          });
        }
      });
    });

    return conflicts;
  }
}
