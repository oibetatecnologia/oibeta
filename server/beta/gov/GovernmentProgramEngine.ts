import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { GovernmentKnowledgeQueryService } from "./GovernmentKnowledgeQueryService";

export class GovernmentProgramEngine {
  private queryService: GovernmentKnowledgeQueryService;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {
    this.queryService = new GovernmentKnowledgeQueryService(dbAdapter);
  }

  public async getPrograms(organizationId: string): Promise<any[]> {
    const programs = await this.queryService.getPrograms(organizationId);
    
    // If no programs exist in KG, return empty array
    if (!programs || programs.length === 0) {
      return [];
    }

    return programs;
  }
}
