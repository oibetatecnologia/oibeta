import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { GovernmentDomainEngine } from "./GovernmentDomainEngine";

export class GovernmentMemoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: GovernmentDomainEngine,
  ) {}

  public async synthesizeGovernmentMemory(
    organizationId: string,
    entities: any[],
    contracts: any[],
    programs: any[],
    indicators: any[],
    risks: any,
  ): Promise<any> {
    const snaps = await this.dbAdapter.getGovernmentSnapshots(organizationId);
    const lastSnap = snaps.length > 0 ? snaps[0] : null;

    return {
      lastSyncCount: lastSnap ? lastSnap.entities.length : 0,
      currentEntitiesCount: entities.length,
      contractsCount: contracts.length,
      programsCount: programs.length,
      indicatorsCount: indicators.length,
      risksCount: risks.items.length,
      memoryValid: true,
    };
  }
}
