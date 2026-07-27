import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class NextActionsEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async determineNextActions(projectId: string, workspaceId?: string): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
    const decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);
    const objectives = await this.dbAdapter.getObjectives(projectId, actualWorkspaceId);

    const blockedTasks = tasks.filter((t) => t.status === "blocked");
    const todoTasks = tasks.filter((t) => t.status === "todo");
    const pendingDecisions = decisions.filter((d) => d.status === "proposed");

    const recommendedActions = [];

    if (blockedTasks.length > 0) {
      recommendedActions.push(
        `Unblock ${blockedTasks.length} tasks to resume progress.`,
      );
    }

    if (pendingDecisions.length > 0) {
      recommendedActions.push(
        `Review and resolve ${pendingDecisions.length} pending decisions.`,
      );
    }

    if (
      todoTasks.length === 0 &&
      blockedTasks.length === 0 &&
      pendingDecisions.length === 0
    ) {
      const activeObjectives = objectives.filter((o) => o.status === "active");
      if (activeObjectives.length > 0) {
        recommendedActions.push(
          `Plan new tasks for active objective: ${activeObjectives[0].title}`,
        );
      } else {
        recommendedActions.push(
          `Review project completion. Project might be done.`,
        );
      }
    } else if (todoTasks.length > 0) {
      recommendedActions.push(`Pick up next task: ${todoTasks[0].title}`);
    }

    return {
      blockedTasks: blockedTasks.map((t) => ({ id: t.id, title: t.title })),
      pendingDecisions: pendingDecisions.map((d) => ({
        id: d.id,
        title: d.title,
      })),
      nextRecommendedActions: recommendedActions,
    };
  }
}
