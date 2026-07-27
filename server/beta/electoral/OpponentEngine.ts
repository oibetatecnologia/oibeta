import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface Opponent {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  party: string | null;
  position: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MONITORED' | 'ARCHIVED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export class OpponentEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getOpponents(organizationId: string): Promise<Opponent[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for opponent operations");
    }
    const list = await this.dbAdapter.getElectoralOpponents(organizationId);
    return list.map(this.mapRecord);
  }

  public async getOpponentById(organizationId: string, id: string): Promise<Opponent | null> {
    if (!id) return null;
    const item = await this.dbAdapter.getElectoralOpponentById(organizationId, id);
    return item ? this.mapRecord(item) : null;
  }

  public async createOpponent(
    organizationId: string,
    projectId: string | null,
    opponent: Partial<Opponent>
  ): Promise<Opponent> {
    if (!organizationId) {
      throw new Error("organizationId is required to create an opponent");
    }
    if (!opponent.name) {
      throw new Error("Opponent name is required");
    }
    const id = opponent.id || "opp_" + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const data = {
      id,
      organizationId,
      projectId,
      name: opponent.name,
      party: opponent.party || null,
      position: opponent.position || null,
      status: opponent.status || "MONITORED",
      notes: opponent.notes || null,
      createdAt,
      updatedAt: createdAt
    };

    // Keep Knowledge Graph in sync
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "OPPONENT",
      data.name,
      data.notes || "",
      id,
      {
        party: data.party,
        position: data.position,
        status: data.status,
        createdAt,
        updatedAt: createdAt
      }
    );

    const record = await this.dbAdapter.createElectoralOpponent(data);
    return this.mapRecord(record);
  }

  public async updateOpponent(
    id: string,
    data: Partial<Opponent>
  ): Promise<Opponent> {
    const updatedAt = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt
    };
    const record = await this.dbAdapter.updateElectoralOpponent(id, updateData);
    
    // KG update
    if (record) {
      await this.kgEngine.ensureNode(
        record.organizationId,
        record.projectId,
        "OPPONENT",
        record.name,
        record.notes || "",
        record.id,
        {
          party: record.party,
          position: record.position,
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }
      );
    }
    return this.mapRecord(record);
  }

  public async deleteOpponent(id: string): Promise<void> {
    await this.dbAdapter.deleteElectoralOpponent(id);
  }

  private mapRecord(r: any): Opponent {
    return {
      id: r.id,
      organizationId: r.organizationId,
      projectId: r.projectId || null,
      name: r.name,
      party: r.party || null,
      position: r.position || null,
      status: r.status || "MONITORED",
      notes: r.notes || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}
