import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class GovernmentContextEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async rebuildContext(
    organizationId: string,
    entities: any[],
    contracts: any[],
    programs: any[],
    workspaceId?: string,
  ): Promise<any> {
    const relations =
      await this.dbAdapter.getKnowledgeRelations(organizationId, workspaceId || "default-workspace");
    // Identify context layers based on relationships and actual entities
    const institutional =
      relations.filter((r) =>
        ["REPORTS_TO", "SUPERVISES"].includes(r.relationType),
      ).length + entities.length;
    const administrative =
      relations.filter((r) => ["MANAGES", "EXECUTES"].includes(r.relationType))
        .length + programs.length;
    const contractual =
      relations.filter((r) => ["CONTRACTS"].includes(r.relationType)).length +
      contracts.length;

    return {
      institutionalMetrics: institutional,
      administrativeMetrics: administrative,
      contractualMetrics: contractual,
      status: "ENRICHED",
    };
  }
}
