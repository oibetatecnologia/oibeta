import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Task, CreateTaskInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class TaskEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getTasks(organizationId: string, query: any = {}): Promise<Task[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch tasks.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getCoreTasks(organizationId, filter);
  }

  public async createTask(organizationId: string, data: CreateTaskInput): Promise<Task> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a task.");
    }
    if (!data.title) {
      throw new Error("Validation Error: Title is required.");
    }

    const task: CreateTaskInput = {
      ...data,
      organizationId,
      status: data.status || 'PENDING',
      priority: data.priority || 'MEDIUM',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createCoreTask(task) as Task;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "TASK",
          `Task: ${saved.title}`,
          saved.description || "",
          saved.id,
          { priority: saved.priority, dueDate: saved.dueDate }
        );
        if (saved.assignedTo) {
          const userNode = await this.kgEngine.ensureNode(
            organizationId,
            null,
            "USER",
            `User: ${saved.assignedTo}`,
            "",
            saved.assignedTo
          );
          await this.kgEngine.createRelationship(organizationId, node.id, userNode.id, "RELATED_TO");
        }
      } catch (e) {
        console.warn("TaskEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
           const eventName = saved.status === 'COMPLETED' ? "TaskCompleted" : "TaskCreated";
           await (this.memoryOS as any).registerEvent(organizationId, eventName, `Task event: ${saved.title}`);
        }
      } catch (e) {
        console.warn("TaskEngine: MemoryOS integration failed", e);
      }
    }

    return saved;
  }
}
