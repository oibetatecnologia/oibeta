import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class GovernmentDomainEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async extractEntities(organizationId: string, workspaceId?: string): Promise<any[]> {
    const relations =
      await this.dbAdapter.getKnowledgeRelations(organizationId, workspaceId || "default-workspace");

    // Em um sistema real, buscaria nodes do tipo GOVERNMENT_ENTITY
    // Aqui inferimos das relacoes guardadas
    const entitiesSet = new Set<string>();

    for (const rel of relations) {
      if (
        [
          "MANAGES",
          "EXECUTES",
          "FUNDS",
          "SUPERVISES",
          "CONTRACTS",
          "IMPLEMENTS",
          "REPORTS_TO",
          "ASSOCIATED_WITH",
        ].includes(rel.relationType)
      ) {
        entitiesSet.add(rel.sourceNodeId);
        entitiesSet.add(rel.targetNodeId);
      }
    }

    return Array.from(entitiesSet).map((id) => ({
      id,
      name: id,
      type: "GOVERNMENT_ENTITY",
    }));
  }
}
