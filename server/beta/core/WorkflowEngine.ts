import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { WorkflowInstance, CreateWorkflowInstanceInput, WorkflowStep, CreateWorkflowStepInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class WorkflowEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getWorkflowInstances(organizationId: string, query: any = {}): Promise<WorkflowInstance[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch workflow instances.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getWorkflowInstances(organizationId, filter);
  }

  public async createWorkflowInstance(organizationId: string, data: CreateWorkflowInstanceInput): Promise<WorkflowInstance> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a workflow instance.");
    }
    if (!data.title || !data.workflowType) {
      throw new Error("Validation Error: title and workflowType are required.");
    }

    const instance: CreateWorkflowInstanceInput = {
      ...data,
      organizationId,
      status: data.status || 'ACTIVE',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createWorkflowInstance(instance) as WorkflowInstance;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Workflow: ${saved.title}`,
          saved.workflowType,
          saved.id,
          { currentStep: saved.currentStep }
        );
        if (saved.relatedEntityId && saved.relatedEntityType) {
          const targetNode = await this.kgEngine.ensureNode(
            organizationId,
            null,
            "KNOWLEDGE",
            `${saved.relatedEntityType}: ${saved.relatedEntityId}`,
            "",
            saved.relatedEntityId
          );
          await this.kgEngine.createRelationship(organizationId, node.id, targetNode.id, "RELATED_TO");
        }
      } catch (e) {
        console.warn("WorkflowEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             const eventName = saved.status === 'COMPLETED' ? "WorkflowCompleted" : "WorkflowStarted";
             await (this.memoryOS as any).registerEvent(organizationId, eventName, `Workflow instance: ${saved.title}`);
          }
       } catch (e) {}
    }

    return saved;
  }

  public async getWorkflowSteps(organizationId: string, instanceId: string): Promise<WorkflowStep[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch workflow steps.");
    }
    if (!instanceId) {
      throw new Error("Validation Error: instanceId is required to fetch workflow steps.");
    }
    return this.db.getWorkflowSteps(organizationId, instanceId);
  }

  public async createWorkflowStep(organizationId: string, data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a workflow step.");
    }
    if (!data.workflowInstanceId || !data.title) {
      throw new Error("Validation Error: workflowInstanceId and title are required.");
    }

    const step: CreateWorkflowStepInput = {
      ...data,
      organizationId,
      status: data.status || 'PENDING',
      metadataJson: data.metadataJson || {}
    };
    return this.db.createWorkflowStep(step);
  }
}
