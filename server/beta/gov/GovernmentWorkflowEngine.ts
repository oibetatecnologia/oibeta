import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentWorkflow,
  GovernmentWorkflowStage,
  GovernmentWorkflowTransition,
  GovernmentWorkflowQueue,
  GovernmentWorkflowExecution,
  GovernmentWorkflowRoute,
  GovernmentWorkflowSummary,
  GovernmentWorkflowHealth
} from "../core/types";

export class GovernmentWorkflowEngine {
  private dbAdapter: DatabaseAdapter;
  private memoryOS: MemoryOS;
  private knowledgeGraph: KnowledgeGraphEngine;

  constructor(
    dbAdapter: DatabaseAdapter,
    knowledgeGraph: KnowledgeGraphEngine,
    memoryOS: MemoryOS
  ) {
    this.dbAdapter = dbAdapter;
    this.knowledgeGraph = knowledgeGraph;
    this.memoryOS = memoryOS;
  }

  // --- 1. WORKFLOWS ---
  public async getWorkflows(organizationId: string, workspaceId: string): Promise<GovernmentWorkflow[]> {
    return this.dbAdapter.getWorkflows(organizationId, workspaceId);
  }

  public async createWorkflow(data: GovernmentWorkflow): Promise<GovernmentWorkflow> {
    const item = await this.dbAdapter.createWorkflow(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      data.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace Node",
      item.workspaceId
    );

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      `Workflow ${item.id}`,
      `Workflow status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, workflowNode.id, "HAS_WORKFLOW");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowCreated",
      entityType: "GovernmentWorkflow",
      entityId: item.id!,
      description: `Workflow registered under status: ${item.status}`
    });

    return item;
  }

  // --- 2. WORKFLOW STAGES ---
  public async getWorkflowStages(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowStage[]> {
    return this.dbAdapter.getWorkflowStages(organizationId, workspaceId);
  }

  public async createWorkflowStage(data: GovernmentWorkflowStage): Promise<GovernmentWorkflowStage> {
    const item = await this.dbAdapter.createWorkflowStage(data);

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      "Workflow Context",
      "Workflow Node Reference",
      data.metadataJson?.workflowId || "unknown_workflow"
    );

    const stageNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflowStage",
      `Workflow Stage ${item.id}`,
      `Stage status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workflowNode.id, stageNode.id, "HAS_STAGE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowStageCreated",
      entityType: "GovernmentWorkflowStage",
      entityId: item.id!,
      description: `Workflow stage established with status: ${item.status}`
    });

    return item;
  }

  // --- 3. WORKFLOW TRANSITIONS ---
  public async getWorkflowTransitions(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowTransition[]> {
    return this.dbAdapter.getWorkflowTransitions(organizationId, workspaceId);
  }

  public async createWorkflowTransition(data: GovernmentWorkflowTransition): Promise<GovernmentWorkflowTransition> {
    const item = await this.dbAdapter.createWorkflowTransition(data);

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      "Workflow Context",
      "Workflow Node Reference",
      data.metadataJson?.workflowId || "unknown_workflow"
    );

    const transitionNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflowTransition",
      `Transition ${item.id}`,
      `Transition status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workflowNode.id, transitionNode.id, "HAS_TRANSITION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowTransitionCreated",
      entityType: "GovernmentWorkflowTransition",
      entityId: item.id!,
      description: `Workflow transition recorded with status: ${item.status}`
    });

    return item;
  }

  // --- 4. WORKFLOW QUEUES ---
  public async getWorkflowQueues(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowQueue[]> {
    return this.dbAdapter.getWorkflowQueues(organizationId, workspaceId);
  }

  public async createWorkflowQueue(data: GovernmentWorkflowQueue): Promise<GovernmentWorkflowQueue> {
    const item = await this.dbAdapter.createWorkflowQueue(data);

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      "Workflow Context",
      "Workflow Node Reference",
      data.metadataJson?.workflowId || "unknown_workflow"
    );

    const queueNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflowQueue",
      `Queue ${item.id}`,
      `Queue status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workflowNode.id, queueNode.id, "HAS_QUEUE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowQueueCreated",
      entityType: "GovernmentWorkflowQueue",
      entityId: item.id!,
      description: `Workflow queue listed under status: ${item.status}`
    });

    return item;
  }

  // --- 5. WORKFLOW EXECUTIONS ---
  public async getWorkflowExecutions(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowExecution[]> {
    return this.dbAdapter.getWorkflowExecutions(organizationId, workspaceId);
  }

  public async createWorkflowExecution(data: GovernmentWorkflowExecution): Promise<GovernmentWorkflowExecution> {
    const item = await this.dbAdapter.createWorkflowExecution(data);

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      "Workflow Context",
      "Workflow Node Reference",
      data.metadataJson?.workflowId || "unknown_workflow"
    );

    const executionNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflowExecution",
      `Execution ${item.id}`,
      `Execution status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workflowNode.id, executionNode.id, "HAS_EXECUTION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowExecutionCreated",
      entityType: "GovernmentWorkflowExecution",
      entityId: item.id!,
      description: `Workflow execution tracked under status: ${item.status}`
    });

    return item;
  }

  // --- 6. WORKFLOW ROUTES ---
  public async getWorkflowRoutes(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowRoute[]> {
    return this.dbAdapter.getWorkflowRoutes(organizationId, workspaceId);
  }

  public async createWorkflowRoute(data: GovernmentWorkflowRoute): Promise<GovernmentWorkflowRoute> {
    const item = await this.dbAdapter.createWorkflowRoute(data);

    const workflowNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflow",
      "Workflow Context",
      "Workflow Node Reference",
      data.metadataJson?.workflowId || "unknown_workflow"
    );

    const routeNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkflowRoute",
      `Route ${item.id}`,
      `Route status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workflowNode.id, routeNode.id, "HAS_ROUTE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentWorkflowRouteCreated",
      entityType: "GovernmentWorkflowRoute",
      entityId: item.id!,
      description: `Workflow route mapped under status: ${item.status}`
    });

    return item;
  }

  // --- 7. SUMMARY ---
  public async getWorkflowSummary(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowSummary> {
    const [workflows, stages, transitions, queues, executions, routes] = await Promise.all([
      this.getWorkflows(organizationId, workspaceId),
      this.getWorkflowStages(organizationId, workspaceId),
      this.getWorkflowTransitions(organizationId, workspaceId),
      this.getWorkflowQueues(organizationId, workspaceId),
      this.getWorkflowExecutions(organizationId, workspaceId),
      this.getWorkflowRoutes(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    const totalCount =
      workflows.length +
      stages.length +
      transitions.length +
      queues.length +
      executions.length +
      routes.length;

    if (totalCount > 0) {
      if (
        workflows.length > 0 &&
        stages.length > 0 &&
        transitions.length > 0 &&
        queues.length > 0 &&
        executions.length > 0 &&
        routes.length > 0
      ) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalWorkflows: workflows.length,
      totalWorkflowStages: stages.length,
      totalWorkflowTransitions: transitions.length,
      totalWorkflowQueues: queues.length,
      totalWorkflowExecutions: executions.length,
      totalWorkflowRoutes: routes.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 8. HEALTH ---
  public async getWorkflowHealth(organizationId: string, workspaceId: string): Promise<GovernmentWorkflowHealth> {
    try {
      const summary = await this.getWorkflowSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentWorkflowHealthComputed",
        entityType: "GovernmentWorkflow",
        entityId: workspaceId,
        description: `Computed Workflow health status: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Workflow stages, routes, and transitions are fully configured and ready." :
                   summary.status === "PARTIAL_DATA" ? "Partial workflow configuration registered. Setup all stages, transitions, queues and routes." :
                   "No workflow structures or execution states tracked yet.",
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          message: "Error computing health: " + (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
