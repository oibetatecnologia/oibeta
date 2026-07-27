import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export type ProjectState =
  | "PLANNING"
  | "ACTIVE"
  | "BLOCKED"
  | "REVIEW"
  | "COMPLETED";

export class ProjectStateEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async determineState(projectId: string, workspaceId?: string): Promise<ProjectState> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
    const objectives = await this.dbAdapter.getObjectives(projectId, actualWorkspaceId);

    if (objectives.length === 0 && tasks.length === 0) return "PLANNING";

    const allTasksCompleted =
      tasks.length > 0 && tasks.every((t) => t.status === "done");
    const allObjectivesCompleted =
      objectives.length > 0 &&
      objectives.every((o) => o.status === "archived" || o.status === "done");

    if (tasks.length > 0 && allTasksCompleted) return "COMPLETED";
    if (objectives.length > 0 && allObjectivesCompleted && tasks.length === 0)
      return "COMPLETED";

    if (tasks.some((t) => t.status === "blocked")) return "BLOCKED";

    if (
      tasks.some((t) => t.status === "in-progress" || t.status === "review")
    ) {
      if (
        tasks.every(
          (t) =>
            t.status === "review" ||
            t.status === "done" ||
            t.status === "archived",
        )
      )
        return "REVIEW";
      return "ACTIVE";
    }

    if (tasks.some((t) => t.status === "todo")) return "ACTIVE";

    return "PLANNING";
  }
}
