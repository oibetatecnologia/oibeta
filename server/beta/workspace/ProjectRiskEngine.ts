import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class ProjectRiskEngine {
   constructor(private dbAdapter: DatabaseAdapter) {}

   public async evaluateRisks(projectId: string, workspaceId?: string): Promise<any> {
      const actualWorkspaceId = workspaceId || "default-workspace";
      const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
      const decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);
      
      const now = new Date().getTime();
      let staleTasks = 0;

      tasks.forEach(t => {
         if (t.status !== 'done' && t.status !== 'archived') {
            const updated = new Date(t.updatedAt || t.createdAt).getTime();
            const daysStale = (now - updated) / (1000 * 60 * 60 * 24);
            if (daysStale > 14) staleTasks++;
         }
      });

      const pendingDecisions = decisions.filter(d => d.status === 'proposed').length;
      const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

      let score = 0; // 0 = no risk, 100 = critical
      score += staleTasks * 5;
      score += pendingDecisions * 10;
      score += blockedTasks * 20;

      if (score > 100) score = 100;

      let level = 'LOW';
      if (score >= 25) level = 'MEDIUM';
      if (score >= 50) level = 'HIGH';
      if (score >= 75) level = 'CRITICAL';

      return {
         score,
         level,
         factors: {
             staleTasks,
             pendingDecisions,
             blockedTasks
         },
         summary: `Risco Operacional: ${level} (${score}/100) devido a bloqueios ou latência em itens chave.`
      };
   }
}
