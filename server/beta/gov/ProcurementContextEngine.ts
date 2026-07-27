import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProcurementContextEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async rebuildContext(
    organizationId: string,
    bids: any[],
    suppliers: any[],
    proposals: any[],
    lots: any[],
    workspaceId?: string,
  ): Promise<any> {
    const relations = await this.dbAdapter.getKnowledgeRelations(organizationId, workspaceId || "default-workspace");

    const publishings = relations.filter((r) => r.relationType === "PUBLISHED_BY").length;
    const participations = relations.filter((r) => r.relationType === "PARTICIPATES_IN" || r.relationType === "SUBMITTED_BY").length;
    const itemsContained = relations.filter((r) => r.relationType === "CONTAINS").length;
    const awardsCount = relations.filter((r) => r.relationType === "AWARDED_TO" || r.relationType === "HOMOLOGATED_BY").length;

    return {
      bidsCount: bids.length,
      suppliersCount: suppliers.length,
      proposalsCount: proposals.length,
      lotsCount: lots.length,
      publishings,
      participations,
      itemsContained,
      awardsCount,
      status: bids.length > 0 ? "RECONSTRUCTED" : "NO_DATA",
    };
  }
}
