import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface PoliticalRelationship {
  id: string;
  organizationId: string;
  projectId: string | null;
  sourceId: string;
  sourceType: 'OPPONENT' | 'POLITICAL_GROUP' | 'LEADERSHIP';
  targetId: string;
  targetType: 'OPPONENT' | 'POLITICAL_GROUP' | 'LEADERSHIP' | 'TERRITORY';
  type: 'SUPPORTS' | 'OPPOSES' | 'BELONGS_TO_GROUP' | 'LEADS_GROUP' | 'INFLUENCES' | 'WORKS_WITH' | 'ACTIVE_IN_TERRITORY';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PoliticalRelationshipEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getRelationships(organizationId: string): Promise<PoliticalRelationship[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for relationship operations");
    }
    const list = await this.dbAdapter.getElectoralRelationships(organizationId);
    return list.map(this.mapRecord);
  }

  public async createRelationship(
    organizationId: string,
    projectId: string | null,
    rel: Partial<PoliticalRelationship>
  ): Promise<PoliticalRelationship> {
    if (!organizationId) throw new Error("organizationId is required");
    if (!rel.sourceId || !rel.sourceType || !rel.targetId || !rel.targetType || !rel.type) {
      throw new Error("Missing required fields for political relationship");
    }

    const id = rel.id || "rel_" + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const data = {
      id,
      organizationId,
      projectId,
      sourceId: rel.sourceId,
      sourceType: rel.sourceType,
      targetId: rel.targetId,
      targetType: rel.targetType,
      type: rel.type,
      notes: rel.notes || null,
      createdAt,
      updatedAt: createdAt
    };

    // Keep Knowledge Graph in sync
    await this.kgEngine.createRelationship(organizationId, rel.sourceId, rel.targetId, rel.type);

    const record = await this.dbAdapter.createElectoralRelationship(data);
    return this.mapRecord(record);
  }

  public async updateRelationship(
    id: string,
    data: Partial<PoliticalRelationship>
  ): Promise<PoliticalRelationship> {
    const updatedAt = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt
    };
    const record = await this.dbAdapter.updateElectoralRelationship(id, updateData);
    return this.mapRecord(record);
  }

  public async deleteRelationship(id: string): Promise<void> {
    await this.dbAdapter.deleteElectoralRelationship(id);
  }

  // Answer: Quem apoia quem?
  public async getWhoSupportsWho(organizationId: string): Promise<any[]> {
    const rels = await this.getRelationships(organizationId);
    return rels.filter(r => r.type === "SUPPORTS");
  }

  // Answer: Quem pertence a qual grupo?
  public async getWhoBelongsToGroup(organizationId: string): Promise<any[]> {
    const rels = await this.getRelationships(organizationId);
    return rels.filter(r => r.type === "BELONGS_TO_GROUP");
  }

  // Answer: Quem influencia determinada região?
  public async getWhoInfluencesRegion(organizationId: string): Promise<any[]> {
    const rels = await this.getRelationships(organizationId);
    return rels.filter(r => r.type === "INFLUENCES" && r.targetType === "TERRITORY");
  }

  // Answer: Quais lideranças pertencem ao mesmo grupo?
  public async getLeadershipsInSameGroup(organizationId: string): Promise<any> {
    const rels = await this.getRelationships(organizationId);
    const groupToLeaders: Record<string, string[]> = {};

    rels.forEach(r => {
      if (r.type === "BELONGS_TO_GROUP" && r.sourceType === "LEADERSHIP") {
        const groupId = r.targetId;
        if (!groupToLeaders[groupId]) {
          groupToLeaders[groupId] = [];
        }
        groupToLeaders[groupId].push(r.sourceId);
      }
    });

    return groupToLeaders;
  }

  private mapRecord(r: any): PoliticalRelationship {
    return {
      id: r.id,
      organizationId: r.organizationId,
      projectId: r.projectId || null,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      targetId: r.targetId,
      targetType: r.targetType,
      type: r.type,
      notes: r.notes || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}
