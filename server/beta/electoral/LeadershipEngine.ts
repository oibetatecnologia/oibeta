import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface Leadership {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  role: string | null;
  phone: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MONITORED';
  createdAt: string;
  updatedAt: string;
}

export class LeadershipEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getLeaderships(organizationId: string): Promise<Leadership[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for leadership operations");
    }
    const list = await this.dbAdapter.getElectoralLeaderships(organizationId);
    return list.map(this.mapRecord);
  }

  public async getLeadershipById(organizationId: string, id: string): Promise<Leadership | null> {
    if (!id) return null;
    const item = await this.dbAdapter.getElectoralLeadershipById(organizationId, id);
    return item ? this.mapRecord(item) : null;
  }

  public async createLeadership(
    organizationId: string,
    projectId: string | null,
    leadership: Partial<Leadership>
  ): Promise<Leadership> {
    if (!organizationId) {
      throw new Error("organizationId is required to create a leadership");
    }
    if (!leadership.name) {
      throw new Error("Leadership name is required");
    }
    const id = leadership.id || "ldr_" + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    const data = {
      id,
      organizationId,
      projectId,
      name: leadership.name,
      role: leadership.role || null,
      phone: leadership.phone || null,
      notes: leadership.notes || null,
      status: leadership.status || "ACTIVE",
      createdAt,
      updatedAt: createdAt
    };

    // Keep Knowledge Graph in sync
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "LEADERSHIP",
      data.name,
      data.notes || "",
      id,
      {
        role: data.role,
        phone: data.phone,
        status: data.status,
        createdAt,
        updatedAt: createdAt
      }
    );

    const record = await this.dbAdapter.createElectoralLeadership(data);
    return this.mapRecord(record);
  }

  public async updateLeadership(
    id: string,
    data: Partial<Leadership>
  ): Promise<Leadership> {
    const updatedAt = new Date().toISOString();
    const updateData = {
      ...data,
      updatedAt
    };
    const record = await this.dbAdapter.updateElectoralLeadership(id, updateData);
    
    // KG update
    if (record) {
      await this.kgEngine.ensureNode(
        record.organizationId,
        record.projectId,
        "LEADERSHIP",
        record.name,
        record.notes || "",
        record.id,
        {
          role: record.role,
          phone: record.phone,
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }
      );
    }
    return this.mapRecord(record);
  }

  public async deleteLeadership(id: string): Promise<void> {
    await this.dbAdapter.deleteElectoralLeadership(id);
  }

  private mapRecord(r: any): Leadership {
    return {
      id: r.id,
      organizationId: r.organizationId,
      projectId: r.projectId || null,
      name: r.name,
      role: r.role || null,
      phone: r.phone || null,
      notes: r.notes || null,
      status: r.status || "ACTIVE",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }
}
