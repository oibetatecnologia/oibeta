import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface CampaignObjective {
  id: string;
  organizationId: string;
  projectId: string | null;
  campaignId: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CampaignObjectiveEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getObjectives(organizationId: string, campaignId?: string): Promise<CampaignObjective[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign objectives");
    }
    const dbObjs = await this.dbAdapter.getElectoralCampaignObjectives(organizationId, campaignId);
    return dbObjs.map((o: any) => this.mapRecord(o));
  }

  public async getObjectiveById(organizationId: string, objectiveId: string): Promise<CampaignObjective | null> {
    if (!objectiveId) return null;
    const all = await this.getObjectives(organizationId);
    return all.find((o) => o.id === objectiveId) || null;
  }

  public async createObjective(
    organizationId: string,
    projectId: string | null,
    campaignId: string,
    obj: Partial<CampaignObjective>
  ): Promise<CampaignObjective> {
    if (!organizationId || !campaignId) {
      throw new Error("organizationId and campaignId are required to create campaign objective");
    }

    const id = obj.id || "obj_" + Math.random().toString(36).substr(2, 9);
    const title = obj.title || "Meta da Campanha";
    const description = obj.description || null;
    const priority = obj.priority || "MEDIUM";
    const status = obj.status || "PENDING";
    const dueDate = obj.dueDate || null;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Persist in Knowledge Graph (Sync node representation)
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "CAMPAIGN_OBJECTIVE",
      title,
      description || "",
      id,
      {
        campaignId,
        priority,
        status,
        dueDate,
        createdAt,
        updatedAt
      }
    );

    // Link Campaign block to Objective block
    await this.kgEngine.createRelationship(organizationId, id, campaignId, "OBJECTIVE_OF_CAMPAIGN");

    const dbRecord = await this.dbAdapter.createElectoralCampaignObjective({
      id,
      organizationId,
      projectId,
      campaignId,
      title,
      description,
      priority,
      status,
      dueDate,
      createdAt,
      updatedAt
    });

    return this.mapRecord(dbRecord);
  }

  public async updateObjective(
    organizationId: string,
    objectiveId: string,
    updateData: Partial<CampaignObjective>
  ): Promise<CampaignObjective> {
    if (!organizationId || !objectiveId) {
      throw new Error("organizationId and objectiveId are required for updating campaign objective");
    }

    const existing = await this.getObjectiveById(organizationId, objectiveId);
    if (!existing) {
      throw new Error("Campaign objective not found");
    }

    const merged = {
      ...existing,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Sync Knowledge Graph
    await this.kgEngine.ensureNode(
      organizationId,
      existing.projectId,
      "CAMPAIGN_OBJECTIVE",
      merged.title,
      merged.description || "",
      objectiveId,
      {
        campaignId: merged.campaignId,
        priority: merged.priority,
        status: merged.status,
        dueDate: merged.dueDate,
        createdAt: merged.createdAt,
        updatedAt: merged.updatedAt
      }
    );

    const dbRecord = await this.dbAdapter.updateElectoralCampaignObjective(objectiveId, {
      title: merged.title,
      description: merged.description,
      priority: merged.priority,
      status: merged.status,
      dueDate: merged.dueDate,
      updatedAt: merged.updatedAt
    });

    return this.mapRecord(dbRecord);
  }

  private mapRecord(rec: any): CampaignObjective {
    return {
      id: rec.id,
      organizationId: rec.organizationId,
      projectId: rec.projectId || null,
      campaignId: rec.campaignId,
      title: rec.title || "Meta sem título",
      description: rec.description || null,
      priority: rec.priority || "MEDIUM",
      status: rec.status || "PENDING",
      dueDate: rec.dueDate || null,
      createdAt: rec.createdAt || new Date().toISOString(),
      updatedAt: rec.updatedAt || new Date().toISOString()
    };
  }
}
