import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentProtocol,
  GovernmentProcess,
  GovernmentDocumentRecord,
  GovernmentDispatch,
  GovernmentRouting,
  GovernmentProcessStep,
  GovernmentProcessHistory,
  GovernmentZeroPaperSummary,
  GovernmentZeroPaperHealth
} from "../core/types";

export class GovernmentZeroPaperEngine {
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

  // --- 1. PROTOCOLS ---
  public async getProtocols(organizationId: string, workspaceId: string): Promise<GovernmentProtocol[]> {
    return this.dbAdapter.getProtocols(organizationId, workspaceId);
  }

  public async createProtocol(data: GovernmentProtocol): Promise<GovernmentProtocol> {
    const item = await this.dbAdapter.createProtocol(data);

    // kg relation: GovernmentWorkspace -> HAS_PROTOCOL -> GovernmentProtocol
    const workspaceNode = await this.knowledgeGraph.ensureNode(
      data.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace Node",
      item.workspaceId
    );

    const protocolNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProtocol",
      `Protocol ${item.id}`,
      `Protocol status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, protocolNode.id, "HAS_PROTOCOL");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProtocolCreated",
      entityType: "GovernmentProtocol",
      entityId: item.id!,
      description: `Protocol registration event saved. Status: ${item.status}`
    });

    return item;
  }

  // --- 2. PROCESSES ---
  public async getProcesses(organizationId: string, workspaceId: string): Promise<GovernmentProcess[]> {
    return this.dbAdapter.getProcesses(organizationId, workspaceId);
  }

  public async createProcess(data: GovernmentProcess): Promise<GovernmentProcess> {
    const item = await this.dbAdapter.createProcess(data);

    // kg relation: GovernmentProtocol -> HAS_PROCESS -> GovernmentProcess
    const protocolNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProtocol",
      "Protocol Context",
      "Protocol Node Reference",
      data.metadataJson?.protocolId || "unknown_protocol"
    );

    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      `Process ${item.id}`,
      `Process status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, protocolNode.id, processNode.id, "HAS_PROCESS");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessCreated",
      entityType: "GovernmentProcess",
      entityId: item.id!,
      description: `Process created with status: ${item.status}`
    });

    return item;
  }

  // --- 3. DOCUMENT RECORDS ---
  public async getDocumentRecords(organizationId: string, workspaceId: string): Promise<GovernmentDocumentRecord[]> {
    return this.dbAdapter.getDocumentRecords(organizationId, workspaceId);
  }

  public async createDocumentRecord(data: GovernmentDocumentRecord): Promise<GovernmentDocumentRecord> {
    const item = await this.dbAdapter.createDocumentRecord(data);

    // kg relation: GovernmentProcess -> HAS_DOCUMENT -> GovernmentDocumentRecord
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      `Document ${item.id}`,
      `Document status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, docNode.id, "HAS_DOCUMENT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentRecordCreated",
      entityType: "GovernmentDocumentRecord",
      entityId: item.id!,
      description: `Document record stored with status: ${item.status}`
    });

    return item;
  }

  // --- 4. DISPATCHES ---
  public async getDispatches(organizationId: string, workspaceId: string): Promise<GovernmentDispatch[]> {
    return this.dbAdapter.getDispatches(organizationId, workspaceId);
  }

  public async createDispatch(data: GovernmentDispatch): Promise<GovernmentDispatch> {
    const item = await this.dbAdapter.createDispatch(data);

    // kg relation: GovernmentProcess -> HAS_DISPATCH -> GovernmentDispatch
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const dispatchNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDispatch",
      `Dispatch ${item.id}`,
      `Dispatch status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, dispatchNode.id, "HAS_DISPATCH");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDispatchCreated",
      entityType: "GovernmentDispatch",
      entityId: item.id!,
      description: `Process dispatch filed with status: ${item.status}`
    });

    return item;
  }

  // --- 5. ROVTINGS ---
  public async getRoutings(organizationId: string, workspaceId: string): Promise<GovernmentRouting[]> {
    return this.dbAdapter.getRoutings(organizationId, workspaceId);
  }

  public async createRouting(data: GovernmentRouting): Promise<GovernmentRouting> {
    const item = await this.dbAdapter.createRouting(data);

    // kg relation: GovernmentProcess -> HAS_ROUTING -> GovernmentRouting
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const routingNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentRouting",
      `Routing ${item.id}`,
      `Routing status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, routingNode.id, "HAS_ROUTING");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentRoutingCreated",
      entityType: "GovernmentRouting",
      entityId: item.id!,
      description: `Process routing track recorded. Status: ${item.status}`
    });

    return item;
  }

  // --- 6. PROCESS STEPS ---
  public async getProcessSteps(organizationId: string, workspaceId: string): Promise<GovernmentProcessStep[]> {
    return this.dbAdapter.getProcessSteps(organizationId, workspaceId);
  }

  public async createProcessStep(data: GovernmentProcessStep): Promise<GovernmentProcessStep> {
    const item = await this.dbAdapter.createProcessStep(data);

    // kg relation: GovernmentProcess -> HAS_PROCESS_STEP -> GovernmentProcessStep
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const stepNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessStep",
      `Step ${item.id}`,
      `Step status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, stepNode.id, "HAS_PROCESS_STEP");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessStepCreated",
      entityType: "GovernmentProcessStep",
      entityId: item.id!,
      description: `Workflow process step structured with status: ${item.status}`
    });

    return item;
  }

  // --- 7. PROCESS HISTORY ---
  public async getProcessHistories(organizationId: string, workspaceId: string): Promise<GovernmentProcessHistory[]> {
    return this.dbAdapter.getProcessHistories(organizationId, workspaceId);
  }

  public async createProcessHistory(data: GovernmentProcessHistory): Promise<GovernmentProcessHistory> {
    const item = await this.dbAdapter.createProcessHistory(data);

    // kg relation: GovernmentProcess -> HAS_HISTORY -> GovernmentProcessHistory
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const historyNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessHistory",
      `History ${item.id}`,
      `History status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, historyNode.id, "HAS_HISTORY");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessHistoryCreated",
      entityType: "GovernmentProcessHistory",
      entityId: item.id!,
      description: `Audit process history logged with status: ${item.status}`
    });

    return item;
  }

  // --- 8. SUMMARY ---
  public async getZeroPaperSummary(organizationId: string, workspaceId: string): Promise<GovernmentZeroPaperSummary> {
    const [protocols, processes, documentRecords, dispatches, routings, processSteps, processHistories] = await Promise.all([
      this.getProtocols(organizationId, workspaceId),
      this.getProcesses(organizationId, workspaceId),
      this.getDocumentRecords(organizationId, workspaceId),
      this.getDispatches(organizationId, workspaceId),
      this.getRoutings(organizationId, workspaceId),
      this.getProcessSteps(organizationId, workspaceId),
      this.getProcessHistories(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    if (protocols.length > 0) {
      if (processes.length > 0 && documentRecords.length > 0 && dispatches.length > 0 && routings.length > 0) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalProtocols: protocols.length,
      totalProcesses: processes.length,
      totalDocumentRecords: documentRecords.length,
      totalDispatches: dispatches.length,
      totalRoutings: routings.length,
      totalProcessSteps: processSteps.length,
      totalProcessHistories: processHistories.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 9. HEALTH ---
  public async getZeroPaperHealth(organizationId: string, workspaceId: string): Promise<GovernmentZeroPaperHealth> {
    try {
      const summary = await this.getZeroPaperSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentZeroPaperHealthComputed",
        entityType: "GovernmentProcess",
        entityId: workspaceId,
        description: `Computed Zero Paper health status: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Zero Paper base repository operates with high durability." :
                   summary.status === "PARTIAL_DATA" ? "Partial Zero Paper structures recorded. Add protocols, processes and document flows." :
                   "No paperless system records registered yet.",
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
