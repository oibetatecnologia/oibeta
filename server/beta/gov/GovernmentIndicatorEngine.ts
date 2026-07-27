import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { GovernmentKnowledgeQueryService } from "./GovernmentKnowledgeQueryService";

export class GovernmentIndicatorEngine {
  private queryService: GovernmentKnowledgeQueryService;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {
    this.queryService = new GovernmentKnowledgeQueryService(dbAdapter);
  }

  public async getIndicators(organizationId: string): Promise<any[]> {
    const indicators = await this.queryService.getIndicators(organizationId);
    
    // If no indicators exist, return empty array
    if (!indicators || indicators.length === 0) {
      return [];
    }

    return indicators;
  }
}
