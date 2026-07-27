import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface PoliticalGroup {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export class PoliticalGroupEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getPoliticalGroups(organizationId: string): Promise<PoliticalGroup[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for political group operations");
    }
    const list = await this.dbAdapter.getElectoralPoliticalGroups(organizationId);
    return list.map(this.mapRecord);
  }

  public async getPoliticalGroupById(organizationId: string, id: string): Promise<PoliticalGroup | null> {
    if (!id) return null;
    const item = await this.dbAdapter.getElectoralPoliticalGroupById(organizationId, id);
    return item ? this.mapRecord(item) : null;
  }

  public async createPoliticalGroup(
    organizationId: string,
    projectId: string | null,
    group: Partial<PoliticalGroup>
  ): Promise<PoliticalGroup> {
    if (!organizationId) {
      throw new Error("organizationId is required to create a political group");
    }
    if (!group.name) {
      throw new Error("Political group name is required");
    }
    const id = group.id || "grp_" + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const data = {
      id,
      organizationId,
      projectId,
      name: group.name,
      description: group.description || null,
      status: group.status || "ACTIVE",
      createdAt,
      updatedAt: createdAt
    };

    // Keep Knowledge Graph in sync
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "POLITICAL_GROUP",
      data.name,
      data.description || "",
      id,
      {
        status: data.status,
        createdAt,
        updatedAt: createdAt
      }
    );

    const record = await this.dbAdapter.createElectoralPoliticalGroup(data);
    return this.mapRecord(record);
  }

  public async updatePoliticalGroup(
    id: string,
    data: Partial<PoliticalGroup>
  ): Promise<PoliticalGroup> {
    const updatedAt = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt
    };
    const record = await this.dbAdapter.updateElectoralPoliticalGroup(id, updateData);
    
    // KG update
    if (record) {
      await this.kgEngine.ensureNode(
        record.organizationId,
        record.projectId,
        "POLITICAL_GROUP",
        record.name,
        record.description || "",
        record.id,
        {
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }
      );
    }
    return this.mapRecord(record);
  }

  public async deletePoliticalGroup(id: string): Promise<void> {
    await this.dbAdapter.deleteElectoralPoliticalGroup(id);
  }

  private mapRecord(r: any): PoliticalGroup {
    return {
      id: r.id,
      organizationId: r.organizationId,
      projectId: r.projectId || null,
      name: r.name,
      description: r.description || null,
      status: r.status || "ACTIVE",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}
