import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ImpactAnalysisEngine {
  constructor(private dbAdapter: DatabaseAdapter, private kgEngine: KnowledgeGraphEngine) {}

  public async analyzeImpact(itemId: string, organizationId: string, workspaceId?: string): Promise<any> {
      const actualWorkspaceId = workspaceId || "default-workspace";
      const relations = await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);
      const affected = relations.filter(r => r.sourceNodeId === itemId && ['AFFECTS', 'BLOCKS', 'CRITICAL_FOR'].includes(r.relationType));
      
      return {
         affectedCount: affected.length,
         affectedNodes: affected.map(a => a.targetNodeId),
         summary: `Este item impacta diretamente ${affected.length} outros itens no Workspace.`
      };
  }
}
