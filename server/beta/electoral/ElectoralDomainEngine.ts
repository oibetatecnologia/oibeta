import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine, NodeType, RelationType } from "../KnowledgeGraphEngine";

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
  createdAt: string;
  updatedAt: string;
}

export interface Territory {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string | null;
  type: 'STATE' | 'REGION' | 'MUNICIPALITY' | 'ZONE' | 'VOTING_LOCATION';
  parentId: string | null;
  parentTerritoryId: string | null;
  coverageStatus: 'UNCOVERED' | 'PARTIAL' | 'COVERED' | null;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  code?: string | null;
}

export interface Coordinator {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  level: 'GENERAL' | 'REGIONAL' | 'MUNICIPAL' | 'DISTRICT' | 'VOTING_LOCATION';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  assignedTerritory: string | null; // e.g. territory ID or name
  campaignId: string | null;
  parentCoordinatorId: string | null;
  territoryId: string | null;
}

export interface ElectoralAnalysis {
  id: string;
  organizationId: string;
  projectId: string | null;
  title: string | null;
  type: 'HISTORICAL' | 'OPPONENT' | 'TERRITORIAL' | 'STRATEGIC' | 'PRIORITY';
  summary: string | null;
  metadata: any;
  createdAt: string;
}

export class ElectoralDomainEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  // CAMPAIGNS
  public async getCampaigns(organizationId: string, workspaceId?: string): Promise<Campaign[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    // Try custom electoral table first
    const dbCampaigns = await this.dbAdapter.getElectoralCampaigns(organizationId, workspaceId || "default-workspace");
    if (dbCampaigns && dbCampaigns.length > 0) {
      return dbCampaigns.map((c: any) => ({
        id: c.id,
        organizationId: c.organizationId,
        projectId: c.projectId || null,
        name: c.name || null,
        candidateName: c.candidateName || null,
        party: c.party || null,
        office: c.office || null,
        electionYear: c.electionYear !== undefined && c.electionYear !== null ? Number(c.electionYear) : null,
        status: c.status || "PLANNING",
        description: c.description || null,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString()
      }));
    }

    // Fallback to Knowledge Graph
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    return nodes
      .filter((n) => n.nodeType === "CAMPAIGN")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          organizationId: n.organizationId,
          projectId: n.projectId || null,
          name: n.title || null,
          candidateName: meta.candidateName || null,
          party: meta.party || null,
          office: meta.office || null,
          electionYear: meta.electionYear !== undefined && meta.electionYear !== null ? Number(meta.electionYear) : null,
          status: meta.status || "PLANNING",
          description: n.description || null,
          createdAt: meta.createdAt || n.created_at || new Date().toISOString(),
          updatedAt: meta.updatedAt || n.updated_at || new Date().toISOString(),
        };
      });
  }

  public async registerCampaign(organizationId: string, projectId: string | null, campaign: Partial<Campaign>): Promise<Campaign> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const id = campaign.id || "camp_" + Math.random().toString(36).substr(2, 9);
    const name = campaign.name || null;
    const meta = {
      candidateName: campaign.candidateName || null,
      party: campaign.party || null,
      office: campaign.office || null,
      electionYear: campaign.electionYear !== undefined && campaign.electionYear !== null ? Number(campaign.electionYear) : null,
      status: campaign.status || "PLANNING",
      createdAt: campaign.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const node = await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "CAMPAIGN",
      name || "",
      campaign.description || "",
      id,
      meta
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
      status: meta.status,
      description: campaign.description || null,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt
    });

    return {
      id: dbRecord.id || id,
      organizationId,
      projectId,
      name: dbRecord.name || null,
      candidateName: dbRecord.candidateName || null,
      party: dbRecord.party || null,
      office: dbRecord.office || null,
      electionYear: dbRecord.electionYear !== undefined && dbRecord.electionYear !== null ? Number(dbRecord.electionYear) : null,
      status: dbRecord.status,
      description: dbRecord.description || null,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
    } as any;
  }

  // TERRITORIES
  public async getTerritories(organizationId: string, workspaceId?: string): Promise<Territory[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const dbTerritories = await this.dbAdapter.getElectoralTerritories(organizationId, workspaceId || "default-workspace");
    if (dbTerritories && dbTerritories.length > 0) {
      return dbTerritories.map((t: any) => ({
        id: t.id,
        organizationId: t.organizationId,
        projectId: t.projectId || null,
        name: t.name || null,
        type: t.type || "MUNICIPALITY",
        parentId: t.parentId || t.parentTerritoryId || null,
        parentTerritoryId: t.parentTerritoryId || t.parentId || null,
        coverageStatus: t.coverageStatus || null,
        priorityLevel: t.priorityLevel || null,
        code: t.code || null,
      }));
    }

    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    return nodes
      .filter((n) => n.nodeType === "TERRITORY" || n.nodeType === "VOTING_LOCATION")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          organizationId: n.organizationId,
          projectId: n.projectId || null,
          name: n.title || null,
          type: meta.type || (n.nodeType === "VOTING_LOCATION" ? "VOTING_LOCATION" : "MUNICIPALITY"),
          parentId: meta.parentId || meta.parentTerritoryId || null,
          parentTerritoryId: meta.parentTerritoryId || meta.parentId || null,
          coverageStatus: meta.coverageStatus || null,
          priorityLevel: meta.priorityLevel || null,
          code: meta.code || null,
        };
      });
  }

  public async registerTerritory(organizationId: string, projectId: string | null, territory: Partial<Territory>): Promise<Territory> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const id = territory.id || "terr_" + Math.random().toString(36).substr(2, 9);
    const name = territory.name || null;
    const type = territory.type || "MUNICIPALITY";
    const parentVal = territory.parentTerritoryId || territory.parentId || null;
    const coverageVal = territory.coverageStatus || null;
    const priorityVal = territory.priorityLevel || null;

    const tNode = await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      type === "VOTING_LOCATION" ? "VOTING_LOCATION" : "TERRITORY",
      name || "",
      "",
      id,
      {
        type,
        parentId: parentVal,
        parentTerritoryId: parentVal,
        coverageStatus: coverageVal,
        priorityLevel: priorityVal,
        code: territory.code || null,
      }
    );

    if (parentVal) {
      await this.kgEngine.createRelationship(organizationId, id, parentVal, "BELONGS_TO");
    }

    const dbRecord = await this.dbAdapter.createElectoralTerritory({
      id,
      organizationId,
      projectId,
      name,
      type,
      parentId: parentVal,
      parentTerritoryId: parentVal,
      coverageStatus: coverageVal,
      priorityLevel: priorityVal,
      code: territory.code || null
    });

    return {
      id: dbRecord.id || id,
      organizationId,
      projectId,
      name: dbRecord.name || null,
      type: dbRecord.type,
      parentId: dbRecord.parentId || dbRecord.parentTerritoryId || null,
      parentTerritoryId: dbRecord.parentTerritoryId || dbRecord.parentId || null,
      coverageStatus: dbRecord.coverageStatus || null,
      priorityLevel: dbRecord.priorityLevel || null,
      code: dbRecord.code || null,
    };
  }

  // COORDINATORS
  public async getCoordinators(organizationId: string, workspaceId?: string): Promise<Coordinator[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const dbCoordinators = await this.dbAdapter.getElectoralCoordinators(organizationId, workspaceId || "default-workspace");
    if (dbCoordinators && dbCoordinators.length > 0) {
      return dbCoordinators.map((c: any) => ({
        id: c.id,
        organizationId: c.organizationId,
        projectId: c.projectId || null,
        name: c.name || null,
        email: c.email || null,
        phone: c.phone || null,
        level: c.level || "GENERAL",
        status: c.status || "ACTIVE",
        assignedTerritory: c.assignedTerritory || c.territoryId || null,
        campaignId: c.campaignId || null,
        parentCoordinatorId: c.parentCoordinatorId || null,
        territoryId: c.territoryId || c.assignedTerritory || null,
      }));
    }

    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    return nodes
      .filter((n) => n.nodeType === "COORDINATOR")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          organizationId: n.organizationId,
          projectId: n.projectId || null,
          name: n.title || null,
          email: meta.email || null,
          phone: meta.phone || null,
          level: meta.level || "GENERAL",
          status: meta.status || "ACTIVE",
          assignedTerritory: meta.assignedTerritory || meta.territoryId || null,
          campaignId: meta.campaignId || null,
          parentCoordinatorId: meta.parentCoordinatorId || null,
          territoryId: meta.territoryId || meta.assignedTerritory || null,
        };
      });
  }

  public async registerCoordinator(
    organizationId: string,
    projectId: string | null,
    coord: Partial<Coordinator>,
    workspaceId?: string
  ): Promise<Coordinator> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const wsId = workspaceId || "default-workspace";
    const id = coord.id || "coord_" + Math.random().toString(36).substr(2, 9);
    const name = coord.name || null;
    const meta = {
      email: coord.email || null,
      phone: coord.phone || null,
      level: coord.level || "GENERAL",
      status: coord.status || "ACTIVE",
      assignedTerritory: coord.assignedTerritory || coord.territoryId || null,
      campaignId: coord.campaignId || null,
      parentCoordinatorId: coord.parentCoordinatorId || null,
      territoryId: coord.territoryId || coord.assignedTerritory || null,
    };

    const node = await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "COORDINATOR",
      name || "",
      coord.phone || "",
      id,
      meta,
      wsId
    );

    if (coord.campaignId) {
      await this.kgEngine.createRelationship(organizationId, id, coord.campaignId, "PART_OF_CAMPAIGN", wsId);
      await this.kgEngine.createRelationship(organizationId, id, coord.campaignId, "ASSIGNED_TO_CAMPAIGN", wsId);
    }

    const terrToUse = coord.territoryId || coord.assignedTerritory;
    if (terrToUse) {
      await this.kgEngine.createRelationship(organizationId, id, terrToUse, "COVERS_TERRITORY", wsId);
      await this.kgEngine.createRelationship(organizationId, id, terrToUse, "ASSIGNED_TO_TERRITORY", wsId);
    }

    if (coord.parentCoordinatorId) {
      await this.kgEngine.createRelationship(organizationId, id, coord.parentCoordinatorId, "REPORTS_TO", wsId);
      await this.kgEngine.createRelationship(organizationId, coord.parentCoordinatorId, id, "SUPERVISES", wsId);
    }

    const dbRecord = await this.dbAdapter.createElectoralCoordinator({
      id,
      organizationId,
      projectId,
      name,
      email: meta.email,
      phone: meta.phone,
      level: meta.level,
      status: meta.status,
      assignedTerritory: meta.assignedTerritory,
      campaignId: meta.campaignId,
      parentCoordinatorId: meta.parentCoordinatorId,
      territoryId: meta.territoryId,
      workspaceId: wsId
    });

    return {
      id: dbRecord.id || id,
      organizationId,
      projectId,
      name: dbRecord.name || null,
      email: dbRecord.email || null,
      phone: dbRecord.phone || null,
      level: dbRecord.level,
      status: dbRecord.status,
      assignedTerritory: dbRecord.assignedTerritory || dbRecord.territoryId || null,
      campaignId: dbRecord.campaignId || null,
      parentCoordinatorId: dbRecord.parentCoordinatorId || null,
      territoryId: dbRecord.territoryId || dbRecord.assignedTerritory || null,
    };
  }

  // ANALYSES
  public async getAnalyses(organizationId: string, workspaceId?: string): Promise<ElectoralAnalysis[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const dbAnalyses = await this.dbAdapter.getElectoralAnalyses(organizationId, workspaceId || "default-workspace");
    if (dbAnalyses && dbAnalyses.length > 0) {
      return dbAnalyses.map((a: any) => ({
        id: a.id,
        organizationId: a.organizationId,
        projectId: a.projectId || null,
        title: a.title || null,
        type: a.type || "STRATEGIC",
        summary: a.summary || null,
        metadata: a.metadata || {},
        createdAt: a.createdAt || new Date().toISOString(),
      }));
    }

    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    return nodes
      .filter((n) => n.nodeType === "ELECTORAL_ANALYSIS")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          organizationId: n.organizationId,
          projectId: n.projectId || null,
          title: n.title || null,
          type: meta.type || "STRATEGIC",
          summary: n.description || null,
          metadata: meta.details || {},
          createdAt: meta.createdAt || n.created_at || new Date().toISOString(),
        };
      });
  }

  public async registerAnalysis(organizationId: string, projectId: string | null, analysis: Partial<ElectoralAnalysis>): Promise<ElectoralAnalysis> {
    if (!organizationId) {
      throw new Error("organizationId is required for electoral operations");
    }

    const id = analysis.id || "anal_" + Math.random().toString(36).substr(2, 9);
    const title = analysis.title || null;
    const meta = {
      type: analysis.type || "STRATEGIC",
      details: analysis.metadata || {},
      createdAt: analysis.createdAt || new Date().toISOString(),
    };

    const node = await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "ELECTORAL_ANALYSIS",
      title || "",
      analysis.summary || "",
      id,
      meta
    );

    const dbRecord = await this.dbAdapter.createElectoralAnalysis({
      id,
      organizationId,
      projectId,
      title,
      type: meta.type,
      summary: analysis.summary || null,
      metadata: meta.details,
      createdAt: meta.createdAt
    });

    return {
      id: dbRecord.id || id,
      organizationId,
      projectId,
      title: dbRecord.title || null,
      type: dbRecord.type,
      summary: dbRecord.summary || null,
      metadata: dbRecord.metadata,
      createdAt: dbRecord.createdAt,
    };
  }
}
