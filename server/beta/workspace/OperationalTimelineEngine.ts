import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class OperationalTimelineEngine {
    constructor(private dbAdapter: DatabaseAdapter) {}

    public async generateTimeline(projectId: string, workspaceId?: string): Promise<any> {
        const actualWorkspaceId = workspaceId || "default-workspace";
        const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
        const decs = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);

        const events: any[] = [];
        
        tasks.forEach(t => {
            events.push({ date: t.createdAt, type: 'TASK_CREATED', title: t.title, id: t.id });
            if (t.status === 'done') {
                events.push({ date: t.updatedAt, type: 'TASK_COMPLETED', title: t.title, id: t.id });
            }
        });
        
        decs.forEach(d => {
            events.push({ date: d.createdAt, type: 'DECISION_PROPOSED', title: d.title, id: d.id });
            if (d.status === 'accepted') {
                events.push({ date: d.updatedAt, type: 'DECISION_ACCEPTED', title: d.title, id: d.id });
            }
        });

        // sort by date desc
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
           events,
           summary: `O projeto possui ${events.length} grandes eventos operacionais registrados na timeline.`
        };
    }
}
