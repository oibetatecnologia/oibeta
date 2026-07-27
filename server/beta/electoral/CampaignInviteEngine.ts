import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { InviteAuditEngine } from "./InviteAuditEngine";
import { InviteValidationEngine } from "./InviteValidationEngine";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";

export interface CampaignInvite {
  id: string;
  organizationId: string;
  projectId: string | null;
  campaignId: string;
  email: string | null;
  phone: string | null;
  inviteLink: string;
  role: 'GENERAL' | 'REGIONAL' | 'MUNICIPAL' | 'DISTRICT' | 'VOTING_LOCATION' | 'SUPPORTER';
  level: string | null;
  assignedTerritoryId: string | null;
  territoryId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
  invitedByUserId: string;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  revokedAt?: string | null;
}

export class CampaignInviteEngine {
  private auditEngine: InviteAuditEngine;
  private validationEngine: InviteValidationEngine;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine
  ) {
    this.auditEngine = new InviteAuditEngine(dbAdapter);
    this.validationEngine = new InviteValidationEngine(domainEngine);
  }

  /**
   * Generates a new invitation. Logs a CREATE event.
   */
  public async generateInvite(
    organizationId: string,
    projectId: string | null,
    data: {
      campaignId: string;
      email?: string | null;
      phone?: string | null;
      role: 'GENERAL' | 'REGIONAL' | 'MUNICIPAL' | 'DISTRICT' | 'VOTING_LOCATION' | 'SUPPORTER';
      assignedTerritoryId?: string | null;
      invitedByUserId: string;
    }
  ): Promise<CampaignInvite> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign invite operations");
    }

    const inviteId = "inv_" + Math.random().toString(36).substr(2, 9);
    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      "http://localhost:3000";

    const inviteLink = `${baseUrl}/electoral/invite/${inviteId}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const inviteMeta = {
      campaignId: data.campaignId,
      email: data.email || null,
      phone: data.phone || null,
      inviteLink,
      role: data.role,
      level: data.role,
      assignedTerritoryId: data.assignedTerritoryId || null,
      territoryId: data.assignedTerritoryId || null,
      status: "PENDING" as const,
      invitedByUserId: data.invitedByUserId,
      invitedBy: data.invitedByUserId,
      createdAt,
      expiresAt
    };

    // Store inside the KnowledgeGraph
    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "KNOWLEDGE",
      `Invite: ${data.email || data.phone || inviteId}`,
      `Invitation for role ${data.role} to campaign ${data.campaignId}`,
      inviteId,
      { ...inviteMeta, isElectoralInvite: true }
    );

    // Persist to custom table
    await this.dbAdapter.createElectoralCampaignInvite({
      id: inviteId,
      organizationId,
      projectId,
      ...inviteMeta
    });

    // Log the action Audit Trail
    await this.auditEngine.logAction(
      organizationId,
      projectId,
      inviteId,
      "CREATE",
      data.invitedByUserId,
      { role: data.role, target: data.email || data.phone || "unspecified" }
    );

    return {
      id: inviteId,
      organizationId,
      projectId,
      ...inviteMeta
    } as any;
  }

  /**
   * Retrieves all invitations.
   */
  public async getInvites(organizationId: string, workspaceId?: string): Promise<CampaignInvite[]> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign invite operations");
    }

    const dbInvites = await this.dbAdapter.getElectoralCampaignInvites(organizationId, workspaceId || "default-workspace");
    if (dbInvites && dbInvites.length > 0) {
      return dbInvites.map(i => ({
        id: i.id,
        organizationId: i.organizationId,
        projectId: i.projectId || null,
        campaignId: i.campaignId,
        email: i.email || null,
        phone: i.phone || null,
        inviteLink: i.inviteLink,
        role: i.role,
        level: i.level || i.role,
        assignedTerritoryId: i.assignedTerritoryId || i.territoryId || null,
        territoryId: i.territoryId || i.assignedTerritoryId || null,
        status: i.status || "PENDING",
        invitedByUserId: i.invitedByUserId || i.invitedBy || "system",
        invitedBy: i.invitedBy || i.invitedByUserId || "system",
        createdAt: i.createdAt || new Date().toISOString(),
        expiresAt: i.expiresAt || new Date().toISOString(),
        acceptedAt: i.acceptedAt || null,
        declinedAt: i.declinedAt || null,
        revokedAt: i.revokedAt || null,
      } as any));
    }

    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    return nodes
      .filter(n => n.nodeType === "KNOWLEDGE" && n.metadata?.isElectoralInvite === true)
      .map(n => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          organizationId: n.organizationId,
          projectId: n.projectId || null,
          campaignId: meta.campaignId,
          email: meta.email || null,
          phone: meta.phone || null,
          inviteLink: meta.inviteLinkStr || meta.inviteLink,
          role: meta.role,
          level: meta.level || meta.role,
          assignedTerritoryId: meta.assignedTerritoryId || meta.territoryId || null,
          territoryId: meta.territoryId || meta.assignedTerritoryId || null,
          status: meta.status || "PENDING",
          invitedByUserId: meta.invitedByUserId || meta.invitedBy || "system",
          invitedBy: meta.invitedBy || meta.invitedByUserId || "system",
          createdAt: meta.createdAt || n.created_at,
          expiresAt: meta.expiresAt,
          acceptedAt: meta.acceptedAt || null,
          declinedAt: meta.declinedAt || null,
          revokedAt: meta.revokedAt || null,
        } as any;
      });
  }

  /**
   * Accepts an invitation, creating a new coordinator node and database record.
   */
  public async acceptInvite(
    organizationId: string,
    inviteId: string,
    userId: string,
    providedName?: string | null,
    providedPhone?: string | null,
    workspaceId?: string
  ): Promise<any> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign invite operations");
    }

    const invites = await this.getInvites(organizationId, workspaceId);
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) {
      throw new Error("Convite não encontrado.");
    }

    // Run custom validation engine
    const valResult = await this.validationEngine.validateInvite(organizationId, invite);
    if (!valResult.valid) {
      throw new Error(valResult.error || "Este convite é inválido.");
    }

    const acceptedAt = new Date().toISOString();

    // Update database record
    await this.dbAdapter.updateElectoralCampaignInvite(inviteId, {
      status: "ACCEPTED",
      acceptedAt,
      updatedAt: acceptedAt
    });

    // Update KG representation
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const node = nodes.find(n => n.id === inviteId);
    if (node) {
      const meta = node.metadata || {};
      meta.status = "ACCEPTED";
      meta.acceptedByUserId = userId;
      meta.acceptedAt = acceptedAt;
      await this.kgEngine.ensureNode(organizationId, node.projectId, "KNOWLEDGE", node.title, node.description, node.id, meta);
    }

    // Connect user to the campaign
    await this.kgEngine.createRelationship(organizationId, userId, invite.campaignId, "BELONGS_TO");

    const rootProjectId = invite.projectId || (node?.projectId) || null;

    // Handle Coordinator creation if not merely a Supporter
    if (invite.role !== 'SUPPORTER') {
      const coordId = "coord_" + Math.random().toString(36).substr(2, 9);
      const name = providedName || invite.email?.split("@")[0] || "Novo Coordenador";
      const phone = providedPhone || invite.phone || null;
      const email = invite.email || null;
      const level = invite.role;
      const status = "ACTIVE";
      const assignedTerritory = invite.assignedTerritoryId || null;

      await this.domainEngine.registerCoordinator(organizationId, rootProjectId, {
        id: coordId,
        name,
        email,
        phone,
        level,
        status,
        assignedTerritory,
        campaignId: invite.campaignId
      });
    }

    // Log the acceptance
    await this.auditEngine.logAction(
      organizationId,
      rootProjectId,
      inviteId,
      "ACCEPT",
      userId,
      { acceptedAt, userId }
    );

    return { success: true, message: "Convite aceito com sucesso." };
  }

  /**
   * Refuses / declines an invitation.
   */
  public async declineInvite(
    organizationId: string,
    inviteId: string,
    userId: string,
    workspaceId?: string
  ): Promise<any> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign invite operations");
    }

    const invites = await this.getInvites(organizationId, workspaceId);
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) {
      throw new Error("Convite não encontrado.");
    }

    if (invite.status !== "PENDING") {
      throw new Error(`Este convite não está pendente (status atual: ${invite.status}).`);
    }

    const declinedAt = new Date().toISOString();

    // Update in Database
    await this.dbAdapter.updateElectoralCampaignInvite(inviteId, {
      status: "DECLINED",
      declinedAt,
      updatedAt: declinedAt
    });

    // Update KG
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const node = nodes.find(n => n.id === inviteId);
    if (node) {
      const meta = node.metadata || {};
      meta.status = "DECLINED";
      meta.declinedAt = declinedAt;
      await this.kgEngine.ensureNode(organizationId, node.projectId, "KNOWLEDGE", node.title, node.description, node.id, meta);
    }

    // Log the declines
    await this.auditEngine.logAction(
      organizationId,
      invite.projectId,
      inviteId,
      "DECLINE",
      userId,
      { declinedAt, userId }
    );

    return { success: true, message: "Convite recusado com sucesso." };
  }

  /**
   * Revokes a pending coordinator invitation.
   */
  public async revokeInvite(
    organizationId: string,
    inviteId: string,
    revokedByUserId: string,
    workspaceId?: string
  ): Promise<any> {
    if (!organizationId) {
      throw new Error("organizationId is required for campaign invite operations");
    }

    const invites = await this.getInvites(organizationId, workspaceId);
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) {
      throw new Error("Convite não encontrado.");
    }

    if (invite.status !== "PENDING") {
      throw new Error(`Apenas convites pendentes podem ser revogados.`);
    }

    const revokedAt = new Date().toISOString();

    // Update Database
    await this.dbAdapter.updateElectoralCampaignInvite(inviteId, {
      status: "REVOKED",
      revokedAt,
      updatedAt: revokedAt
    });

    // Update KG
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const node = nodes.find(n => n.id === inviteId);
    if (node) {
      const meta = node.metadata || {};
      meta.status = "REVOKED";
      meta.revokedAt = revokedAt;
      await this.kgEngine.ensureNode(organizationId, node.projectId, "KNOWLEDGE", node.title, node.description, node.id, meta);
    }

    // Log revoked action
    await this.auditEngine.logAction(
      organizationId,
      invite.projectId,
      inviteId,
      "REVOKE",
      revokedByUserId,
      { revokedAt, revokedByUserId }
    );

    return { success: true, message: "Convite revogado com sucesso." };
  }
}
