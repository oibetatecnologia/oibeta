import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ProjectStateEngine } from "./ProjectStateEngine";
import { ObjectiveIntelligence } from "./ObjectiveIntelligence";
import { DecisionIntelligence } from "./DecisionIntelligence";
import { NextActionsEngine } from "./NextActionsEngine";
import { ProjectBriefGenerator } from "./ProjectBriefGenerator";
import { CognitiveWorkspaceEngine } from "./CognitiveWorkspaceEngine";

export class WorkspaceIntelligenceEngine {
  private projectStateEngine: ProjectStateEngine;
  private objectiveIntelligence: ObjectiveIntelligence;
  private decisionIntelligence: DecisionIntelligence;
  private nextActionsEngine: NextActionsEngine;
  private briefGenerator: ProjectBriefGenerator;
  private cognitiveEngine: CognitiveWorkspaceEngine;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {
    this.projectStateEngine = new ProjectStateEngine(dbAdapter);
    this.objectiveIntelligence = new ObjectiveIntelligence(dbAdapter, kgEngine);
    this.decisionIntelligence = new DecisionIntelligence(dbAdapter, kgEngine);
    this.nextActionsEngine = new NextActionsEngine(dbAdapter);
    this.briefGenerator = new ProjectBriefGenerator();
    this.cognitiveEngine = new CognitiveWorkspaceEngine(dbAdapter, kgEngine);
  }

  public getCognitiveEngine(): CognitiveWorkspaceEngine {
      return this.cognitiveEngine;
  }

  public async analyzeWorkspace(
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const state = await this.projectStateEngine.determineState(projectId, actualWorkspaceId);
    const objectives = await this.objectiveIntelligence.analyzeAll(
      projectId,
      organizationId,
      actualWorkspaceId,
    );
    const decisions = await this.decisionIntelligence.analyzeAll(
      projectId,
      organizationId,
      actualWorkspaceId,
    );
    const nextActions =
      await this.nextActionsEngine.determineNextActions(projectId, actualWorkspaceId);

    // Calculate generic progress for cognitive
    let progressSum = 0;
    objectives.forEach((o: any) => { progressSum += (o.intelligence?.progress || 0); });
    const avgProgress = objectives.length > 0 ? Math.round(progressSum / objectives.length) : 0;

    const cognitiveState = await this.cognitiveEngine.analyzeCognitiveState(projectId, organizationId, avgProgress, actualWorkspaceId);

    // recent documents
    const allDocs = await this.dbAdapter.getDocuments(projectId, actualWorkspaceId);
    const recentDocuments = allDocs
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const snapshotData = {
      organizationId,
      projectId,
      summary: cognitiveState.narrative + "\n\n" + this.briefGenerator.generateBriefText(
        state,
        objectives,
        decisions,
        nextActions,
      ),
      activeObjectives: objectives,
      activeTasks: [], 
      pendingDecisions: decisions.pending,
      blockedItems: cognitiveState.criticalPath.path,
      recentDocuments: recentDocuments,
      nextRecommendedActions: nextActions.nextRecommendedActions,
    };

    const snapshot = await this.dbAdapter.createWorkspaceSnapshot(snapshotData);

    return {
      state,
      snapshotId: snapshot.id,
      brief: snapshot.summary,
      objectives,
      decisions,
      nextActions,
      recentDocuments,
      cognitive: cognitiveState
    };
  }

  public getBriefGenerator(): ProjectBriefGenerator {
    return this.briefGenerator;
  }
}
