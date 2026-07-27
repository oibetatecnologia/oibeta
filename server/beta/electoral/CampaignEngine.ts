import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface Campaign {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string | null;
  candidateName: string | null;
  party: string | null;
  office: string | null;
  electionYear: number | null;
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CampaignEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  public async getCampaigns(organizationId: string, workspaceId?: string): Promise<Campaign[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign operations");
    }

    const actualWorkspaceId = workspaceId || "default-workspace";
    const dbCampaigns = await this.dbAdapter.getElectoralCampaigns(organizationId, actualWorkspaceId);
    return dbCampaigns.map((c: any) => this.mapRecord(c));
  }

  public async getCampaignById(organizationId: string, campaignId: string, workspaceId?: string): Promise<Campaign | null> {
    if (!campaignId) return null;
    const campaigns = await this.getCampaigns(organizationId, workspaceId);
    return campaigns.find((c) => c.id === campaignId) || null;
  }

  public async createCampaign(
    organizationId: string,
    projectId: string | null,
    campaign: Partial<Campaign>,
    workspaceId?: string
  ): Promise<Campaign> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign operations");
    }

    const wsId = workspaceId || "default-workspace";
    const id = campaign.id || "camp_" + Math.random().toString(36).substr(2, 9);
    const name = campaign.name || null;
    const status = campaign.status || "PLANNING";
    const startDate = campaign.startDate || null;
    const endDate = campaign.endDate || null;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const meta = {
      candidateName: campaign.candidateName || null,
      party: campaign.party || null,
      office: campaign.office || null,
      electionYear: campaign.electionYear !== undefined && campaign.electionYear !== null ? Number(campaign.electionYear) : null,
      status,
      startDate,
      endDate,
      createdAt,
      updatedAt,
    };

    // Keep Knowledge Graph in sync
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "CAMPAIGN",
      name || "",
      campaign.description || "",
      id,
      meta,
      wsId
    );

    const dbRecord = await this.dbAdapter.createElectoralCampaign({
      id,
      organizationId,
      projectId,
      name,
      candidateName: meta.candidateName,
      party: meta.party,
      office: meta.office,
      electionYear: meta.electionYear,
      status,
      description: campaign.description || null,
      startDate,
      endDate,
      createdAt,
      updatedAt,
      workspaceId: wsId
    });

    return this.mapRecord(dbRecord);
  }

  public async updateCampaign(
    organizationId: string,
    campaignId: string,
    updateData: Partial<Campaign>,
    workspaceId?: string
  ): Promise<Campaign> {
    if (!organizationId || !campaignId) {
      throw new Error("organizationId and campaignId are required for updating campaign");
    }

    const wsId = workspaceId || "default-workspace";
    const existing = await this.getCampaignById(organizationId, campaignId, wsId);
    if (!existing) {
      throw new Error("Campaign not found");
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
      "CAMPAIGN",
      merged.name || "",
      merged.description || "",
      campaignId,
      {
        candidateName: merged.candidateName,
        party: merged.party,
        office: merged.office,
        electionYear: merged.electionYear,
        status: merged.status,
        startDate: merged.startDate,
        endDate: merged.endDate,
        createdAt: merged.createdAt,
        updatedAt: merged.updatedAt,
      },
      wsId
    );

    const dbRecord = await this.dbAdapter.updateElectoralCampaign(campaignId, {
      name: merged.name,
      candidateName: merged.candidateName,
      party: merged.party,
      office: merged.office,
      electionYear: merged.electionYear,
      status: merged.status,
      description: merged.description,
      startDate: merged.startDate,
      endDate: merged.endDate,
      updatedAt: merged.updatedAt,
      workspaceId: wsId
    });

    return this.mapRecord(dbRecord);
  }

  public async archiveCampaign(organizationId: string, campaignId: string, workspaceId?: string): Promise<Campaign> {
    return this.updateCampaign(organizationId, campaignId, { status: "ARCHIVED" }, workspaceId);
  }

  private mapRecord(rec: any): Campaign {
    return {
      id: rec.id,
      organizationId: rec.organizationId,
      projectId: rec.projectId || null,
      name: rec.name || null,
      candidateName: rec.candidateName || null,
      party: rec.party || null,
      office: rec.office || null,
      electionYear: rec.electionYear !== undefined && rec.electionYear !== null ? Number(rec.electionYear) : null,
      status: rec.status || "PLANNING",
      description: rec.description || null,
      startDate: rec.startDate || null,
      endDate: rec.endDate || null,
      createdAt: rec.createdAt || new Date().toISOString(),
      updatedAt: rec.updatedAt || new Date().toISOString()
    };
  }
}
