import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class DependencyEngine {
  constructor(private dbAdapter: DatabaseAdapter, private kgEngine: KnowledgeGraphEngine) {}

  public async getDependencies(projectId: string, organizationId: string, workspaceId?: string): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const relations = await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);
    
    // Filtramos apenas as relações conceituais de dependência no pool do projeto
    const relevantTypes = ['DEPENDS_ON', 'BLOCKS', 'AFFECTS', 'CRITICAL_FOR'];
    const projectRelations = relations.filter(r => relevantTypes.includes(r.relationType));

    return {
       graph: projectRelations,
       summary: `Mapeadas ${projectRelations.length} dependências operacionais transversais.`
    };
  }
}
