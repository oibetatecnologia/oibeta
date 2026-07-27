import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class DecisionIntelligence {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async analyzeAll(
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);

    // Categorize
    const pending = decisions.filter((d) => d.status === "proposed");
    const accepted = decisions.filter((d) => d.status === "accepted");
    const rejected = decisions.filter((d) => d.status === "rejected");

    // Analyze impacts using Knowledge Graph
    const relations =
      await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);

    const enrichedAccepted = accepted.map((decision) => {
      const links = relations.filter(
        (r) => r.sourceId === decision.id || r.targetId === decision.id,
      );
      return {
        ...decision,
        intelligence: {
          impactCount: links.length,
        },
      };
    });

    return {
      pending,
      accepted: enrichedAccepted,
      rejected,
      summary: `We have ${accepted.length} accepted decisions defining the architecture/direction, and ${pending.length} decisions pending.`,
    };
  }
}
