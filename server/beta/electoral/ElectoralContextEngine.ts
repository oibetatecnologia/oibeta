import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";

export class ElectoralContextEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine
  ) {}

  public async compileElectoralContext(organizationId: string, projectId?: string | null): Promise<any> {
    const campaigns = await this.domainEngine.getCampaigns(organizationId);
    const territories = await this.domainEngine.getTerritories(organizationId);
    const coordinators = await this.domainEngine.getCoordinators(organizationId);
    const analyses = await this.domainEngine.getAnalyses(organizationId);

    // Derive metrics and check parameters safely
    const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE");
    const planningCampaigns = campaigns.filter(c => c.status === "PLANNING");
    
    // Check for territories without assigned coordinators
    const assignedTerritoryIds = new Set(
      coordinators.map(c => c.assignedTerritory).filter(Boolean)
    );
    const territoriesWithoutResponsible = territories.filter(
      t => !assignedTerritoryIds.has(t.id) && !assignedTerritoryIds.has(t.name)
    );

    return {
      campaigns,
      territories,
      coordinators,
      analyses,
      metrics: {
        totalCampaigns: campaigns.length,
        activeCampaignsCount: activeCampaigns.length,
        planningCampaignsCount: planningCampaigns.length,
        totalTerritories: territories.length,
        totalCoordinators: coordinators.length,
        totalAnalyses: analyses.length,
        unassignedTerritoriesCount: territoriesWithoutResponsible.length
      },
      unassignedTerritories: territoriesWithoutResponsible,
      timestamp: new Date().toISOString()
    };
  }
}
