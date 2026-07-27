import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { PoliticalRelationshipEngine } from "./PoliticalRelationshipEngine";

export class OpponentTerritoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private relationshipEngine: PoliticalRelationshipEngine
  ) {}

  // Quais adversários atuam nesta região?
  public async getOpponentsInTerritory(organizationId: string, territoryId: string): Promise<any[]> {
    const rels = await this.relationshipEngine.getRelationships(organizationId);
    
    const opponentIds = rels
      .filter(r => r.sourceType === "OPPONENT" && 
                   r.targetType === "TERRITORY" && 
                   r.targetId === territoryId && 
                   (r.type === "INFLUENCES" || r.type === "ACTIVE_IN_TERRITORY" || r.type === "WORKS_WITH"))
      .map(r => r.sourceId);

    if (opponentIds.length === 0) return [];

    const allOpponents = await this.dbAdapter.getElectoralOpponents(organizationId);
    return allOpponents.filter(o => opponentIds.includes(o.id));
  }

  // Quais lideranças existem neste território?
  public async getLeadershipsInTerritory(organizationId: string, territoryId: string): Promise<any[]> {
    const rels = await this.relationshipEngine.getRelationships(organizationId);
    
    const leadershipIds = rels
      .filter(r => r.sourceType === "LEADERSHIP" && 
                   r.targetType === "TERRITORY" && 
                   r.targetId === territoryId && 
                   (r.type === "INFLUENCES" || r.type === "ACTIVE_IN_TERRITORY" || r.type === "WORKS_WITH" || r.type === "BELONGS_TO_GROUP"))
      .map(r => r.sourceId);

    if (leadershipIds.length === 0) return [];

    const allLeaderships = await this.dbAdapter.getElectoralLeaderships(organizationId);
    return allLeaderships.filter(l => leadershipIds.includes(l.id));
  }

  // Quais grupos políticos atuam aqui?
  public async getPoliticalGroupsInTerritory(organizationId: string, territoryId: string): Promise<any[]> {
    const rels = await this.relationshipEngine.getRelationships(organizationId);
    
    const groupIds = new Set<string>();

    // Direct
    rels.forEach(r => {
      if (r.sourceType === "POLITICAL_GROUP" && r.targetType === "TERRITORY" && r.targetId === territoryId) {
        groupIds.add(r.sourceId);
      }
    });

    // Indirect
    const membersInTerritory = rels.filter(r => 
      r.targetType === "TERRITORY" && r.targetId === territoryId &&
      (r.sourceType === "OPPONENT" || r.sourceType === "LEADERSHIP")
    );

    const memberIds = membersInTerritory.map(m => m.sourceId);

    rels.forEach(r => {
      if (r.type === "BELONGS_TO_GROUP" && memberIds.includes(r.sourceId) && r.targetType === "POLITICAL_GROUP") {
        groupIds.add(r.targetId);
      }
      if (r.type === "LEADS_GROUP" && memberIds.includes(r.sourceId) && r.targetType === "POLITICAL_GROUP") {
        groupIds.add(r.targetId);
      }
    });

    if (groupIds.size === 0) return [];

    const allGroups = await this.dbAdapter.getElectoralPoliticalGroups(organizationId);
    return allGroups.filter(g => groupIds.has(g.id));
  }
}
