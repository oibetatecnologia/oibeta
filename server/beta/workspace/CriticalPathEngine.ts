import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { DependencyEngine } from "./DependencyEngine";

export class CriticalPathEngine {
  constructor(private dbAdapter: DatabaseAdapter, private depEngine: DependencyEngine) {}

  public async determineCriticalPath(projectId: string, organizationId: string, workspaceId?: string): Promise<any> {
     const actualWorkspaceId = workspaceId || "default-workspace";
     const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
     const decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);
     
     const blockedTasks = tasks.filter(t => t.status === 'blocked');
     const pendingDecisions = decisions.filter(d => d.status === 'proposed');
     
     const path = [];
     for (const d of pendingDecisions) {
        path.push({ type: 'DECISION', id: d.id, title: d.title, priority: 'HIGH' });
     }
     for (const t of blockedTasks) {
        path.push({ type: 'TASK', id: t.id, title: t.title, priority: 'CRITICAL' });
     }

     return {
        path,
        summary: path.length > 0 ? `Existem ${path.length} itens bloqueantes no caminho crítico.` : "Nenhum bloqueio crítico neste momento."
     };
  }
}
