import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { DependencyEngine } from "./DependencyEngine";
import { CriticalPathEngine } from "./CriticalPathEngine";
import { ImpactAnalysisEngine } from "./ImpactAnalysisEngine";
import { ProjectRiskEngine } from "./ProjectRiskEngine";
import { ProjectHealthEngine } from "./ProjectHealthEngine";
import { OperationalMemoryEngine } from "./OperationalMemoryEngine";

export class CognitiveWorkspaceEngine {
    private dependencyEngine: DependencyEngine;
    private criticalPathEngine: CriticalPathEngine;
    private impactEngine: ImpactAnalysisEngine;
    private riskEngine: ProjectRiskEngine;
    private healthEngine: ProjectHealthEngine;
    private operationalMemory: OperationalMemoryEngine; // private or public depends on usage

    constructor(private dbAdapter: DatabaseAdapter, private kgEngine: KnowledgeGraphEngine) {
        this.dependencyEngine = new DependencyEngine(dbAdapter, kgEngine);
        this.criticalPathEngine = new CriticalPathEngine(dbAdapter, this.dependencyEngine);
        this.impactEngine = new ImpactAnalysisEngine(dbAdapter, kgEngine);
        this.riskEngine = new ProjectRiskEngine(dbAdapter);
        this.healthEngine = new ProjectHealthEngine();
        this.operationalMemory = new OperationalMemoryEngine(dbAdapter);
    }

    public async analyzeCognitiveState(projectId: string, organizationId: string, progressPercent: number, workspaceId?: string): Promise<any> {
        const actualWorkspaceId = workspaceId || "default-workspace";
        const dependencies = await this.dependencyEngine.getDependencies(projectId, organizationId, actualWorkspaceId);
        const criticalPath = await this.criticalPathEngine.determineCriticalPath(projectId, organizationId, actualWorkspaceId);
        const risk = await this.riskEngine.evaluateRisks(projectId, actualWorkspaceId);
        const health = this.healthEngine.calculateHealth(risk, progressPercent);

        const memory = await this.operationalMemory.synthesizeOperationalMemory(projectId, risk, health, criticalPath, progressPercent, actualWorkspaceId);

        return {
            health,
            risk,
            criticalPath,
            dependencies,
            narrative: memory.narrative,
            timeline: memory.timeline
        };
    }

    public getImpactAnalysisEngine(): ImpactAnalysisEngine {
        return this.impactEngine;
    }
}
