import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ObjectiveIntelligence {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async analyzeObjective(
    objective: any,
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
    const decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);

    // Simplistic analysis based on Knowledge Graph relations
    const relations =
      await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);

    // Find things related to this objective
    const relatedLinks = relations.filter(
      (r) => r.sourceId === objective.id || r.targetId === objective.id,
    );

    const relatedTaskIds = relatedLinks.map((r) =>
      r.sourceId === objective.id ? r.targetId : r.sourceId,
    );
    const relatedTasks = tasks.filter((t) => relatedTaskIds.includes(t.id));

    const completedTasks = relatedTasks.filter(
      (t) => t.status === "done",
    ).length;
    const totalTasks = relatedTasks.length;
    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const relatedDecisionIds = relatedLinks.map((r) =>
      r.sourceId === objective.id ? r.targetId : r.sourceId,
    );
    const relatedDecisionItems = decisions.filter((d) =>
      relatedDecisionIds.includes(d.id),
    );

    return {
      ...objective,
      intelligence: {
        progress,
        relatedTasksCount: totalTasks,
        relatedDecisionsCount: relatedDecisionItems.length,
        isBlocked: relatedTasks.some((t) => t.status === "blocked"),
        dependencies: [], // We could calculate inter-objective dependencies here
      },
    };
  }

  public async analyzeAll(
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any[]> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const objectives = await this.dbAdapter.getObjectives(projectId, actualWorkspaceId);
    const activeObjectives = objectives.filter((o) => o.status !== "archived");
    return Promise.all(
      activeObjectives.map((o) =>
        this.analyzeObjective(o, projectId, organizationId, actualWorkspaceId),
      ),
    );
  }
}
