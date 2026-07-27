import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { UserPresence, UserSession, UserActivityLog } from "./types";

export class UserPresenceEngine {
  private db: DatabaseAdapter;
  private memoryOS?: any;
  private kg?: KnowledgeGraphEngine;

  constructor(db: DatabaseAdapter, memoryOS?: any, kg?: KnowledgeGraphEngine) {
    this.db = db;
    this.memoryOS = memoryOS;
    this.kg = kg;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId)
      throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  public async getPresence(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserPresence[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getUserPresence(organizationId, workspaceId, userId);
  }

  public async updatePresence(
    organizationId: string,
    workspaceId: string,
    userId: string,
    status: string,
    metadataJson?: any,
  ): Promise<UserPresence> {
    this.validateTenant(organizationId, workspaceId);
    if (!userId) throw new Error("Validation Error: userId is required.");
    if (!status) throw new Error("Validation Error: status is required.");

    const data = {
      organizationId,
      workspaceId,
      userId,
      presenceStatus: status,
      lastSeenAt: new Date().toISOString(),
      metadataJson,
      updatedAt: new Date().toISOString(),
    };

    const presence = await this.db.updateUserPresence(data);

    // Memory OS
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      let eventType = "UserOnline";
      if (status === "offline") eventType = "UserOffline";
      else if (status === "away") eventType = "UserAway";
      else if (status === "busy") eventType = "UserBusy";

      try {
        await this.memoryOS.registerEvent(
          organizationId,
          eventType,
          `User ${userId} presence changed to ${status}.`,
        );
      } catch (e) {}
    }

    // KG Integration
    if (this.kg) {
      try {
        const presNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "PRESENCE",
          `Presence ${status} for ${userId}`,
          "",
          `presence_${presence.id}`,
          { status },
        );
        const userNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "USER",
          `User ${userId}`,
          "",
          userId,
        );
        await this.kg.createRelationship(
          organizationId,
          userNode.id,
          presNode.id,
          "HAS_PRESENCE",
        );
      } catch (e) {}
    }

    return presence;
  }

  public async markOnline(
    organizationId: string,
    workspaceId: string,
    userId: string,
    metadataJson?: any,
  ) {
    return this.updatePresence(
      organizationId,
      workspaceId,
      userId,
      "online",
      metadataJson,
    );
  }

  public async markOffline(
    organizationId: string,
    workspaceId: string,
    userId: string,
    metadataJson?: any,
  ) {
    return this.updatePresence(
      organizationId,
      workspaceId,
      userId,
      "offline",
      metadataJson,
    );
  }

  public async markAway(
    organizationId: string,
    workspaceId: string,
    userId: string,
    metadataJson?: any,
  ) {
    return this.updatePresence(
      organizationId,
      workspaceId,
      userId,
      "away",
      metadataJson,
    );
  }

  public async markBusy(
    organizationId: string,
    workspaceId: string,
    userId: string,
    metadataJson?: any,
  ) {
    return this.updatePresence(
      organizationId,
      workspaceId,
      userId,
      "busy",
      metadataJson,
    );
  }

  public async getSessions(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserSession[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getUserSessions(organizationId, workspaceId, userId);
  }

  public async createSession(
    organizationId: string,
    workspaceId: string,
    data: { userId: string; sessionToken?: string; metadataJson?: any },
  ): Promise<UserSession> {
    this.validateTenant(organizationId, workspaceId);
    if (!data.userId) throw new Error("Validation Error: userId is required.");

    const session = await this.db.createUserSession({
      organizationId,
      workspaceId,
      userId: data.userId,
      sessionToken: data.sessionToken,
      status: "active",
      metadataJson: data.metadataJson,
      startedAt: new Date().toISOString(),
    });

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      try {
        await this.memoryOS.registerEvent(
          organizationId,
          "UserSessionCreated",
          `Session created for user ${data.userId}`,
        );
      } catch (e) {}
    }

    if (this.kg) {
      try {
        const sessionNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "SESSION",
          `Session for ${data.userId}`,
          "",
          `session_${session.id}`,
        );
        const userNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "USER",
          `User ${data.userId}`,
          "",
          data.userId,
        );
        await this.kg.createRelationship(
          organizationId,
          userNode.id,
          sessionNode.id,
          "HAS_SESSION",
        );
      } catch (e) {}
    }

    return session;
  }

  public async closeSession(
    organizationId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<UserSession> {
    this.validateTenant(organizationId, workspaceId);
    const session = await this.db.closeUserSession(
      organizationId,
      workspaceId,
      sessionId,
    );

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      try {
        await this.memoryOS.registerEvent(
          organizationId,
          "UserSessionClosed",
          `Session ${sessionId} closed.`,
        );
      } catch (e) {}
    }

    return session;
  }

  public async getActivityLog(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserActivityLog[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getUserActivityLog(organizationId, workspaceId, userId);
  }

  public async recordActivity(
    organizationId: string,
    workspaceId: string,
    data: {
      userId: string;
      activityType: string;
      entityType?: string;
      entityId?: string;
      description: string;
    },
  ): Promise<UserActivityLog> {
    this.validateTenant(organizationId, workspaceId);
    if (!data.userId || !data.activityType || !data.description) {
      throw new Error(
        "Validation Error: userId, activityType, and description are required.",
      );
    }

    const activity = await this.db.createUserActivity({
      organizationId,
      workspaceId,
      userId: data.userId,
      activityType: data.activityType,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      createdAt: new Date().toISOString(),
    });

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      try {
        await this.memoryOS.registerEvent(
          organizationId,
          "UserActivityRecorded",
          `Activity ${data.activityType} recorded for ${data.userId}.`,
        );
      } catch (e) {}
    }

    if (this.kg) {
      try {
        const actNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "ACTIVITY",
          `Activity ${data.activityType}`,
          data.description,
          `activity_${activity.id}`,
          { description: data.description },
        );
        const userNode = await this.kg.ensureNode(
          organizationId,
          workspaceId,
          "USER",
          `User ${data.userId}`,
          "",
          data.userId,
        );
        await this.kg.createRelationship(
          organizationId,
          userNode.id,
          actNode.id,
          "PERFORMED",
        );
      } catch (e) {}
    }

    // Also update presence lastActivityAt
    try {
      await this.db.updateUserPresence({
        organizationId,
        workspaceId,
        userId: data.userId,
        lastActivityAt: new Date().toISOString(),
      });
    } catch (e) {}

    return activity;
  }

  public async getOrganizationPresenceSummary(
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    this.validateTenant(organizationId, workspaceId);
    const presences = await this.db.getUserPresence(
      organizationId,
      workspaceId,
    );

    let online = 0;
    let offline = 0;
    let away = 0;
    let busy = 0;
    let active24h = 0;
    let inactive = 0;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const p of presences) {
      if (p.presenceStatus === "online") online++;
      else if (p.presenceStatus === "offline") offline++;
      else if (p.presenceStatus === "away") away++;
      else if (p.presenceStatus === "busy") busy++;

      if (p.lastActivityAt && new Date(p.lastActivityAt) >= oneDayAgo) {
        active24h++;
      } else {
        inactive++;
      }
    }

    return {
      totalUsersWithPresence: presences.length,
      online,
      offline,
      away,
      busy,
      activeLast24h: active24h,
      inactive,
    };
  }
}
