import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Workspace } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class WorkspaceEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getWorkspaces(organizationId: string): Promise<Workspace[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch workspaces.");
    }
    return this.db.getWorkspaces(organizationId);
  }

  public async createWorkspace(organizationId: string, data: { name: string; description?: string; metadataJson?: any }): Promise<Workspace> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a workspace.");
    }
    if (!data.name || data.name.trim() === "") {
      throw new Error("Validation Error: name is required to create a workspace.");
    }

    const payload = {
      organizationId,
      name: data.name,
      description: data.description || null,
      status: "ACTIVE",
      metadataJson: data.metadataJson || {}
    };

    const saved = await this.db.createWorkspace(payload);

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const orgNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "ORGANIZATION",
          `Organization: ${organizationId}`,
          "",
          organizationId
        );
        const wsNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Workspace: ${saved.name}`,
          saved.description || "",
          saved.id,
          { status: saved.status }
        );

        // Links: Organization -> OWNS -> Workspace, Workspace -> BELONGS_TO -> Organization
        await this.kgEngine.createRelationship(organizationId, orgNode.id, wsNode.id, "OWNS" as any);
        await this.kgEngine.createRelationship(organizationId, wsNode.id, orgNode.id, "BELONGS_TO" as any);
      } catch (e) {
        console.warn("WorkspaceEngine: KG integration failed", e);
      }
    }

    // Memory OS Event Logging
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(organizationId, "WorkspaceCreated", `Workspace created: ${saved.name} (${saved.id})`);
        }
      } catch (e) {}
    }

    return saved;
  }

  public async updateWorkspace(organizationId: string, id: string, data: { name?: string; description?: string; status?: string; metadataJson?: any }): Promise<Workspace> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to update a workspace.");
    }
    if (!id) {
      throw new Error("Validation Error: workspace_id is required to update a workspace.");
    }

    const res = await this.db.updateWorkspace(id, organizationId, data);

    // Memory OS Event Logging
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(organizationId, "WorkspaceUpdated", `Workspace updated: ${res.name} (ID: ${id})`);
        }
      } catch (e) {}
    }

    return res;
  }

  public async getWorkspace(organizationId: string, id: string): Promise<Workspace | null> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch details.");
    }
    const wsList = await this.db.getWorkspaces(organizationId);
    return wsList.find(w => w.id === id) || null;
  }
}
