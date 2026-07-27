import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Coordinator } from "./ElectoralDomainEngine";

export interface CoordinatorResponsibilities {
  coordinator: Coordinator;
  campaigns: any[];
  objectives: any[];
  tasks: any[];
  territories: any[];
}

export class CoordinatorResponsibilityEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine
  ) {}

  /**
   * Aggregates all responsibilities allocated to a specific coordinator.
   */
  public async getResponsibilities(organizationId: string, coordinatorId: string): Promise<CoordinatorResponsibilities> {
    const coords = await this.domainEngine.getCoordinators(organizationId);
    const coord = coords.find(c => c.id === coordinatorId);
    if (!coord) {
      throw new Error("Coordinator not found");
    }

    // Associated campaigns
    const campaigns = await this.domainEngine.getCampaigns(organizationId);
    const assignedCampaigns = campaigns.filter(camp => camp.id === coord.campaignId);

    // Objectives under responsibility
    let objectives: any[] = [];
    try {
      objectives = await this.dbAdapter.getElectoralCampaignObjectives(organizationId);
    } catch (e) {
      console.warn("Could not fetch electoral campaign objectives inside ResponsibilityEngine:", e);
    }
    const assignedObjectives = objectives.filter((o: any) => o.responsibleCoordinatorId === coordinatorId);

    // Tasks under responsibility
    let tasks: any[] = [];
    try {
      tasks = await this.dbAdapter.getElectoralCampaignTasks(organizationId);
    } catch (e) {
      console.warn("Could not fetch electoral campaign tasks inside ResponsibilityEngine:", e);
    }
    const assignedTasks = tasks.filter((t: any) => t.responsibleCoordinatorId === coordinatorId);

    // Territories managed
    const territories = await this.domainEngine.getTerritories(organizationId);
    const assignedTerritories = territories.filter(t => t.id === coord.territoryId || t.id === coord.assignedTerritory);

    return {
      coordinator: coord,
      campaigns: assignedCampaigns,
      objectives: assignedObjectives,
      tasks: assignedTasks,
      territories: assignedTerritories
    };
  }

  /**
   * Performance-optimized bulk responsibilities retrieval across all coordinators in the network.
   */
  public async getBulkResponsibilities(organizationId: string): Promise<CoordinatorResponsibilities[]> {
    const coords = await this.domainEngine.getCoordinators(organizationId);
    const campaigns = await this.domainEngine.getCampaigns(organizationId);
    
    let objectives: any[] = [];
    try {
      objectives = await this.dbAdapter.getElectoralCampaignObjectives(organizationId);
    } catch (e) {
      console.warn("Could not fetch campaign objectives:", e);
    }

    let tasks: any[] = [];
    try {
      tasks = await this.dbAdapter.getElectoralCampaignTasks(organizationId);
    } catch (e) {
      console.warn("Could not fetch campaign tasks:", e);
    }

    const territories = await this.domainEngine.getTerritories(organizationId);

    return coords.map(c => {
      const assignedCampaigns = campaigns.filter(camp => camp.id === c.campaignId);
      const assignedObjectives = objectives.filter((o: any) => o.responsibleCoordinatorId === c.id);
      const assignedTasks = tasks.filter((t: any) => t.responsibleCoordinatorId === c.id);
      const assignedTerritories = territories.filter(t => t.id === c.territoryId || t.id === c.assignedTerritory);

      return {
        coordinator: c,
        campaigns: assignedCampaigns,
        objectives: assignedObjectives,
        tasks: assignedTasks,
        territories: assignedTerritories
      };
    });
  }
}
