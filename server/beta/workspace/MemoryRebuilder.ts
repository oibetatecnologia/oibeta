import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { WorkspaceIntelligenceEngine } from "./WorkspaceIntelligenceEngine";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class MemoryRebuilder {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private workspaceIntelligence: WorkspaceIntelligenceEngine,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async rebuildMemoryContext(
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any> {
    // Ensure Knowledge Graph basic connections are mapped
    await this.syncKnowledgeGraph(projectId, organizationId, workspaceId);

    // Run full workspace intelligence and store standard snapshot
    const analysis = await this.workspaceIntelligence.analyzeWorkspace(
      projectId,
      organizationId,
      workspaceId || "default-workspace",
    );
    return analysis;
  }

  private async syncKnowledgeGraph(projectId: string, organizationId: string, workspaceId?: string) {
    const wsId = workspaceId || "default-workspace";
    const project = await this.dbAdapter.getProjectById(
      projectId,
      "system",
      organizationId,
      wsId,
    );
    if (!project) return;

    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "PROJECT",
      project.name,
      project.description,
      project.id,
      {},
      wsId,
    );

    const objectives = await this.dbAdapter.getObjectives(projectId, wsId);
    const tasks = await this.dbAdapter.getTasks(projectId, wsId);
    const decisions = await this.dbAdapter.getDecisions(projectId, wsId);
    const documents = await this.dbAdapter.getDocuments(projectId, wsId);

    for (const obj of objectives) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "OBJECTIVE",
        obj.title,
        obj.description,
        obj.id,
        { status: obj.status },
        wsId,
      );
      await this.kgEngine.createRelationship(
        organizationId,
        project.id,
        obj.id,
        "PART_OF",
        wsId,
      ); // Project -> Objective
    }

    for (const tsk of tasks) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "TASK",
        tsk.title,
        tsk.description,
        tsk.id,
        { status: tsk.status },
        wsId,
      );
      await this.kgEngine.createRelationship(
        organizationId,
        project.id,
        tsk.id,
        "PART_OF",
        wsId,
      ); // Project -> Task
    }

    for (const dec of decisions) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "DECISION",
        dec.title,
        dec.description,
        dec.id,
        { status: dec.status },
        wsId,
      );
      await this.kgEngine.createRelationship(
        organizationId,
        project.id,
        dec.id,
        "PART_OF",
        wsId,
      ); // Project -> Decision
    }

    for (const doc of documents) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "DOCUMENT",
        doc.filename || doc.name || "Document",
        "Uploaded Document",
        doc.id,
        { type: doc.fileType },
        wsId,
      );
      await this.kgEngine.createRelationship(
        organizationId,
        project.id,
        doc.id,
        "PART_OF",
        wsId,
      ); // Project -> Document
    }
  }
}
