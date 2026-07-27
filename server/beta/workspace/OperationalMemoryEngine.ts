import { OperationalTimelineEngine } from "./OperationalTimelineEngine";
import { ProjectNarrativeEngine } from "./ProjectNarrativeEngine";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class OperationalMemoryEngine {
    private timelineEngine: OperationalTimelineEngine;
    private narrativeEngine: ProjectNarrativeEngine;

    constructor(private dbAdapter: DatabaseAdapter) {
        this.timelineEngine = new OperationalTimelineEngine(dbAdapter);
        this.narrativeEngine = new ProjectNarrativeEngine();
    }

    public async synthesizeOperationalMemory(projectId: string, risk: any, health: any, criticalPath: any, progressPercent: number, workspaceId?: string): Promise<any> {
        const actualWorkspaceId = workspaceId || "default-workspace";
        const timeline = await this.timelineEngine.generateTimeline(projectId, actualWorkspaceId);
        const narrativeText = this.narrativeEngine.generateNarrative(timeline, risk, health, criticalPath, progressPercent);

        return {
            timeline,
            narrative: narrativeText
        };
    }
}
