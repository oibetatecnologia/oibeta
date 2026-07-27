import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class IndicatorCorrelationEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async correlateIndicators(
    indicators: any[],
    organizationId: string,
    workspaceId?: string,
  ): Promise<any[]> {
    const relations =
      await this.dbAdapter.getKnowledgeRelations(organizationId, workspaceId || "default-workspace");

    return indicators.map((ind) => {
      const mapped = relations.filter(
        (r) => r.sourceNodeId === ind.id || r.targetNodeId === ind.id,
      );
      return {
        ...ind,
        correlationsCount: mapped.length,
        status:
          mapped.length > 2
            ? "HEALTHY"
            : mapped.length > 0
              ? "WARNING"
              : "CRITICAL",
      };
    });
  }
}
