import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface CampaignTask {
  id: string;
  organizationId: string;
  projectId: string | null;
  campaignId: string;
  objectiveId: string | null;
  assignedCoordinatorId: string | null;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CampaignTaskEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getTasks(organizationId: string, campaignId?: string): Promise<CampaignTask[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign tasks");
    }
    const dbTasks = await this.dbAdapter.getElectoralCampaignTasks(organizationId, campaignId);
    return dbTasks.map((t: any) => this.mapRecord(t));
  }

  public async getTaskById(organizationId: string, taskId: string): Promise<CampaignTask | null> {
    if (!taskId) return null;
    const all = await this.getTasks(organizationId);
    return all.find((t) => t.id === taskId) || null;
  }

  public async createTask(
    organizationId: string,
    projectId: string | null,
    campaignId: string,
    task: Partial<CampaignTask>
  ): Promise<CampaignTask> {
    if (!organizationId || !campaignId) {
      throw new Error("organizationId and campaignId are required to create campaign task");
    }

    const id = task.id || "task_" + Math.random().toString(36).substr(2, 9);
    const objectiveId = task.objectiveId || null;
    const assignedCoordinatorId = task.assignedCoordinatorId || null;
    const title = task.title || "Tarefa Operacional";
    const description = task.description || null;
    const status = task.status || "PENDING";
    const priority = task.priority || "MEDIUM";
    const dueDate = task.dueDate || null;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const meta = {
      campaignId,
      objectiveId,
      assignedCoordinatorId,
      status,
      priority,
      dueDate,
      createdAt,
      updatedAt
    };

    // Synchronize Knowledge Graph node
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "CAMPAIGN_TASK",
      title,
      description || "",
      id,
      meta
    );

    // Relationships
    await this.kgEngine.createRelationship(organizationId, id, campaignId, "TASK_OF_CAMPAIGN");
    if (objectiveId) {
      await this.kgEngine.createRelationship(organizationId, id, objectiveId, "TASK_BELONGS_TO_OBJECTIVE");
    }
    if (assignedCoordinatorId) {
      // RESPONSIBLE_FOR_TASK relationship from coordinator to task
      await this.kgEngine.createRelationship(organizationId, assignedCoordinatorId, id, "RESPONSIBLE_FOR_TASK");
    }

    const dbRecord = await this.dbAdapter.createElectoralCampaignTask({
      id,
      organizationId,
      projectId,
      campaignId,
      objectiveId,
      assignedCoordinatorId,
      title,
      description,
      status,
      priority,
      dueDate,
      createdAt,
      updatedAt
    });

    return this.mapRecord(dbRecord);
  }

  public async updateTask(
    organizationId: string,
    taskId: string,
    updateData: Partial<CampaignTask>
  ): Promise<CampaignTask> {
    if (!organizationId || !taskId) {
      throw new Error("organizationId and taskId are required for updating campaign task");
    }

    const existing = await this.getTaskById(organizationId, taskId);
    if (!existing) {
      throw new Error("Campaign task not found");
    }

    const merged = {
      ...existing,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Synchronize Knowledge Graph
    await this.kgEngine.ensureNode(
      organizationId,
      existing.projectId,
      "CAMPAIGN_TASK",
      merged.title,
      merged.description || "",
      taskId,
      {
        campaignId: merged.campaignId,
        objectiveId: merged.objectiveId,
        assignedCoordinatorId: merged.assignedCoordinatorId,
        status: merged.status,
        priority: merged.priority,
        dueDate: merged.dueDate,
        createdAt: merged.createdAt,
        updatedAt: merged.updatedAt
      }
    );

    // Sync relationships on assignment change
    if (updateData.assignedCoordinatorId !== undefined && updateData.assignedCoordinatorId !== existing.assignedCoordinatorId) {
      if (updateData.assignedCoordinatorId) {
        await this.kgEngine.createRelationship(organizationId, updateData.assignedCoordinatorId, taskId, "RESPONSIBLE_FOR_TASK");
      }
    }

    const dbRecord = await this.dbAdapter.updateElectoralCampaignTask(taskId, {
      objectiveId: merged.objectiveId,
      assignedCoordinatorId: merged.assignedCoordinatorId,
      title: merged.title,
      description: merged.description,
      status: merged.status,
      priority: merged.priority,
      dueDate: merged.dueDate,
      updatedAt: merged.updatedAt
    });

    return this.mapRecord(dbRecord);
  }

  private mapRecord(rec: any): CampaignTask {
    return {
      id: rec.id,
      organizationId: rec.organizationId,
      projectId: rec.projectId || null,
      campaignId: rec.campaignId,
      objectiveId: rec.objectiveId || null,
      assignedCoordinatorId: rec.assignedCoordinatorId || null,
      title: rec.title || "Tarefa sem título",
      description: rec.description || null,
      status: rec.status || "PENDING",
      priority: rec.priority || "MEDIUM",
      dueDate: rec.dueDate || null,
      createdAt: rec.createdAt || new Date().toISOString(),
      updatedAt: rec.updatedAt || new Date().toISOString()
    };
  }
}
