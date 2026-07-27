import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentDepartment,
  GovernmentProtocolQueue,
  GovernmentProcessAssignment,
  GovernmentProcessMovement,
  GovernmentProcessResponsible,
  GovernmentProcessSector,
  GovernmentProcessManagementSummary,
  GovernmentProcessManagementHealth
} from "../core/types";

export class GovernmentProcessManagementEngine {
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

  // --- 1. DEPARTMENTS ---
  public async getDepartments(organizationId: string, workspaceId: string): Promise<GovernmentDepartment[]> {
    return this.dbAdapter.getDepartments(organizationId, workspaceId);
  }

  public async createDepartment(data: GovernmentDepartment): Promise<GovernmentDepartment> {
    const item = await this.dbAdapter.createDepartment(data);

    // kg relation: GovernmentWorkspace -> HAS_DEPARTMENT -> GovernmentDepartment
    const workspaceNode = await this.knowledgeGraph.ensureNode(
      data.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace Node",
      item.workspaceId
    );

    const departmentNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDepartment",
      `Department ${item.id}`,
      `Department status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, departmentNode.id, "HAS_DEPARTMENT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDepartmentCreated",
      entityType: "GovernmentDepartment",
      entityId: item.id!,
      description: `Department registered under status: ${item.status}`
    });

    return item;
  }

  // --- 2. PROTOCOL QUEUES ---
  public async getProtocolQueues(organizationId: string, workspaceId: string): Promise<GovernmentProtocolQueue[]> {
    return this.dbAdapter.getProtocolQueues(organizationId, workspaceId);
  }

  public async createProtocolQueue(data: GovernmentProtocolQueue): Promise<GovernmentProtocolQueue> {
    const item = await this.dbAdapter.createProtocolQueue(data);

    // kg relation: GovernmentDepartment -> HAS_PROTOCOL_QUEUE -> GovernmentProtocolQueue
    const departmentNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDepartment",
      "Department Context",
      "Department Node Reference",
      data.metadataJson?.departmentId || "unknown_department"
    );

    const queueNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProtocolQueue",
      `Protocol Queue ${item.id}`,
      `Queue status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, departmentNode.id, queueNode.id, "HAS_PROTOCOL_QUEUE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProtocolQueueCreated",
      entityType: "GovernmentProtocolQueue",
      entityId: item.id!,
      description: `Protocol queue established with status: ${item.status}`
    });

    return item;
  }

  // --- 3. PROCESS ASSIGNMENTS ---
  public async getProcessAssignments(organizationId: string, workspaceId: string): Promise<GovernmentProcessAssignment[]> {
    return this.dbAdapter.getProcessAssignments(organizationId, workspaceId);
  }

  public async createProcessAssignment(data: GovernmentProcessAssignment): Promise<GovernmentProcessAssignment> {
    const item = await this.dbAdapter.createProcessAssignment(data);

    // kg relation: GovernmentProcess -> HAS_ASSIGNMENT -> GovernmentProcessAssignment
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const assignmentNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessAssignment",
      `Assignment ${item.id}`,
      `Assignment status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, assignmentNode.id, "HAS_ASSIGNMENT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessAssignmentCreated",
      entityType: "GovernmentProcessAssignment",
      entityId: item.id!,
      description: `Process assignment recorded with status: ${item.status}`
    });

    return item;
  }

  // --- 4. PROCESS MOVEMENTS ---
  public async getProcessMovements(organizationId: string, workspaceId: string): Promise<GovernmentProcessMovement[]> {
    return this.dbAdapter.getProcessMovements(organizationId, workspaceId);
  }

  public async createProcessMovement(data: GovernmentProcessMovement): Promise<GovernmentProcessMovement> {
    const item = await this.dbAdapter.createProcessMovement(data);

    // kg relation: GovernmentProcess -> HAS_MOVEMENT -> GovernmentProcessMovement
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const movementNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessMovement",
      `Movement ${item.id}`,
      `Movement status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, movementNode.id, "HAS_MOVEMENT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessMovementCreated",
      entityType: "GovernmentProcessMovement",
      entityId: item.id!,
      description: `Process movement tracked under status: ${item.status}`
    });

    return item;
  }

  // --- 5. PROCESS RESPONSIBLES ---
  public async getProcessResponsibles(organizationId: string, workspaceId: string): Promise<GovernmentProcessResponsible[]> {
    return this.dbAdapter.getProcessResponsibles(organizationId, workspaceId);
  }

  public async createProcessResponsible(data: GovernmentProcessResponsible): Promise<GovernmentProcessResponsible> {
    const item = await this.dbAdapter.createProcessResponsible(data);

    // kg relation: GovernmentProcess -> HAS_RESPONSIBLE -> GovernmentProcessResponsible
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const responsibleNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessResponsible",
      `Responsible ${item.id}`,
      `Responsible status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, responsibleNode.id, "HAS_RESPONSIBLE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessResponsibleCreated",
      entityType: "GovernmentProcessResponsible",
      entityId: item.id!,
      description: `Process responsible mapped under status: ${item.status}`
    });

    return item;
  }

  // --- 6. PROCESS SECTORS ---
  public async getProcessSectors(organizationId: string, workspaceId: string): Promise<GovernmentProcessSector[]> {
    return this.dbAdapter.getProcessSectors(organizationId, workspaceId);
  }

  public async createProcessSector(data: GovernmentProcessSector): Promise<GovernmentProcessSector> {
    const item = await this.dbAdapter.createProcessSector(data);

    // kg relation: GovernmentProcess -> HAS_SECTOR -> GovernmentProcessSector
    const processNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcess",
      "Process Context",
      "Process Node Reference",
      data.metadataJson?.processId || "unknown_process"
    );

    const sectorNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentProcessSector",
      `Sector ${item.id}`,
      `Sector status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, processNode.id, sectorNode.id, "HAS_SECTOR");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentProcessSectorCreated",
      entityType: "GovernmentProcessSector",
      entityId: item.id!,
      description: `Process sector mapped under status: ${item.status}`
    });

    return item;
  }

  // --- 7. SUMMARY ---
  public async getProcessManagementSummary(organizationId: string, workspaceId: string): Promise<GovernmentProcessManagementSummary> {
    const [departments, protocolQueues, processAssignments, processMovements, processResponsibles, processSectors] = await Promise.all([
      this.getDepartments(organizationId, workspaceId),
      this.getProtocolQueues(organizationId, workspaceId),
      this.getProcessAssignments(organizationId, workspaceId),
      this.getProcessMovements(organizationId, workspaceId),
      this.getProcessResponsibles(organizationId, workspaceId),
      this.getProcessSectors(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    const totalCount =
      departments.length +
      protocolQueues.length +
      processAssignments.length +
      processMovements.length +
      processResponsibles.length +
      processSectors.length;

    if (totalCount > 0) {
      if (
        departments.length > 0 &&
        protocolQueues.length > 0 &&
        processAssignments.length > 0 &&
        processMovements.length > 0 &&
        processResponsibles.length > 0 &&
        processSectors.length > 0
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
      totalDepartments: departments.length,
      totalProtocolQueues: protocolQueues.length,
      totalProcessAssignments: processAssignments.length,
      totalProcessMovements: processMovements.length,
      totalProcessResponsibles: processResponsibles.length,
      totalProcessSectors: processSectors.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 8. HEALTH ---
  public async getProcessManagementHealth(organizationId: string, workspaceId: string): Promise<GovernmentProcessManagementHealth> {
    try {
      const summary = await this.getProcessManagementSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentProcessManagementHealthComputed",
        entityType: "GovernmentProcess",
        entityId: workspaceId,
        description: `Computed Process Management health status: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Process operational queues, sectors, and responsibility trees are fully healthy." :
                   summary.status === "PARTIAL_DATA" ? "Partial process assignment structure recorded. Register all routing sectors, responsibles, and movements." :
                   "No process operational management records tracked yet.",
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
