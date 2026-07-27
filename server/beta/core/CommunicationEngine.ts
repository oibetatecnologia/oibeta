import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import {
  CommunicationThread,
  CommunicationParticipant,
  CommunicationMessage
} from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CommunicationEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required is mandatory for Communication operations.");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is mandatory for Communication operations.");
    }
  }

  public async getThreads(organizationId: string, workspaceId: string): Promise<CommunicationThread[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getCommunicationThreads(organizationId, workspaceId);
  }

  public async createThread(
    organizationId: string,
    workspaceId: string,
    data: {
      threadType: string; // direct, group, campaign, coordination, administrative
      title: string;
      status?: string;
      metadataJson?: Record<string, any>;
      campaignId?: string | null;
    }
  ): Promise<CommunicationThread> {
    this.validateTenant(organizationId, workspaceId);
    if (!data.title) {
      throw new Error("Validation Error: title is required to create a communication thread.");
    }

    const thread = await this.db.createCommunicationThread({
      organizationId,
      workspaceId,
      threadType: data.threadType || "group",
      title: data.title,
      status: data.status || "ACTIVE",
      metadataJson: {
        ...(data.metadataJson || {}),
        campaignId: data.campaignId || null
      }
    });

    // Knowledge Graph integration
    if (this.kgEngine) {
      try {
        const threadNode = await this.kgEngine.ensureNode(organizationId, null, "THREAD", thread.title, `Type: ${thread.threadType}`, thread.id);
        
        if (data.campaignId) {
          const campNode = await this.kgEngine.ensureNode(organizationId, null, "CAMPAIGN", `Campaign: ${data.campaignId}`, "", data.campaignId);
          await this.kgEngine.createRelationship(organizationId, campNode.id, threadNode.id, "HAS_THREAD");
        }
      } catch (e) {
        console.warn("CommunicationEngine KG creation failed on thread:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CommunicationThreadCreated",
            `Communication thread '${thread.title}' (${thread.threadType}) created in workspace ${workspaceId}.`
          );
        }
      } catch (e) {}
    }

    // Register log
    try {
      const log = await this.db.createCommunicationLog({
        organizationId,
        workspaceId,
        eventType: "THREAD_CREATED",
        entityType: "THREAD",
        entityId: thread.id,
        description: `Thread '${thread.title}' of type '${thread.threadType}' was successfully created.`
      });
      if (this.memoryOS && typeof (this.memoryOS as any).registerEvent === "function") {
         await (this.memoryOS as any).registerEvent(organizationId, "CommunicationLogCreated", `Log entry created for ${log.eventType}`);
      }
    } catch (e) {}

    return thread;
  }

  public async getMessages(organizationId: string, workspaceId: string, threadId: string): Promise<CommunicationMessage[]> {
    this.validateTenant(organizationId, workspaceId);
    if (!threadId) {
      throw new Error("Validation Error: threadId is required to fetch messages.");
    }
    return this.db.getCommunicationMessages(organizationId, workspaceId, threadId);
  }

  public async sendMessage(
    organizationId: string,
    workspaceId: string,
    threadId: string,
    data: {
      senderUserId: string;
      messageType?: string; // message, request, notification, system
      content: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CommunicationMessage> {
    this.validateTenant(organizationId, workspaceId);
    if (!threadId) {
      throw new Error("Validation Error: threadId is required to send message.");
    }
    if (!data.senderUserId || !data.content) {
      throw new Error("Validation Error: senderUserId and content are required to send message.");
    }

    const message = await this.db.sendCommunicationMessage({
      organizationId,
      workspaceId,
      threadId,
      senderUserId: data.senderUserId,
      messageType: data.messageType || "message",
      content: data.content,
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph integration
    if (this.kgEngine) {
      try {
        const msgNode = await this.kgEngine.ensureNode(organizationId, null, "MESSAGE", message.content.substring(0, 50), message.content, message.id);
        const userNode = await this.kgEngine.ensureNode(organizationId, null, "USER", `User: ${data.senderUserId}`, "", data.senderUserId);
        await this.kgEngine.createRelationship(organizationId, userNode.id, msgNode.id, "SENT");
      } catch (e) {
        console.warn("CommunicationEngine KG update failed on sendMessage:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CommunicationMessageSent",
            `User ${data.senderUserId} sent a message in thread ${threadId}: ${data.content.substring(0, 30)}.`
          );
        }
      } catch (e) {}
    }

    // Register log
    try {
      const log = await this.db.createCommunicationLog({
        organizationId,
        workspaceId,
        eventType: "MESSAGE_SENT",
        entityType: "MESSAGE",
        entityId: message.id,
        description: `Message sent by user '${data.senderUserId}' in thread '${threadId}'.`
      });
      if (this.memoryOS && typeof (this.memoryOS as any).registerEvent === "function") {
         await (this.memoryOS as any).registerEvent(organizationId, "CommunicationLogCreated", `Log entry created for ${log.eventType}`);
      }
    } catch (e) {}

    return message;
  }

  public async addParticipant(
    organizationId: string,
    workspaceId: string,
    threadId: string,
    data: {
      userId: string;
      participantRole?: string; // member, admin, moderator, read_only
      status?: string;
    }
  ): Promise<CommunicationParticipant> {
    this.validateTenant(organizationId, workspaceId);
    if (!threadId || !data.userId) {
      throw new Error("Validation Error: threadId and userId are required to add a participant.");
    }

    const participant = await this.db.addCommunicationParticipant({
      organizationId,
      workspaceId,
      threadId,
      userId: data.userId,
      participantRole: data.participantRole || "member",
      status: data.status || "ACTIVE"
    });

    // Knowledge Graph integration
    if (this.kgEngine) {
      try {
        const userNode = await this.kgEngine.ensureNode(organizationId, null, "USER", `User: ${data.userId}`, "", data.userId);
        const threadNode = await this.kgEngine.ensureNode(organizationId, null, "THREAD", `Thread: ${threadId}`, "", threadId);
        await this.kgEngine.createRelationship(organizationId, userNode.id, threadNode.id, "PARTICIPATES_IN");
      } catch (e) {
        console.warn("CommunicationEngine KG update failed on addParticipant:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CommunicationParticipantAdded",
            `User ${data.userId} added to thread ${threadId} as ${data.participantRole || "member"}.`
          );
        }
      } catch (e) {}
    }

    // Register log
    try {
      const log = await this.db.createCommunicationLog({
        organizationId,
        workspaceId,
        eventType: "PARTICIPANT_ADDED",
        entityType: "PARTICIPANT",
        entityId: participant.id,
        description: `User '${data.userId}' added as participant in thread '${threadId}'.`
      });
      if (this.memoryOS && typeof (this.memoryOS as any).registerEvent === "function") {
         await (this.memoryOS as any).registerEvent(organizationId, "CommunicationLogCreated", `Log entry created for ${log.eventType}`);
      }
    } catch (e) {}

    return participant;
  }

  public async getParticipants(
    organizationId: string,
    workspaceId: string,
    threadId: string
  ): Promise<CommunicationParticipant[]> {
    this.validateTenant(organizationId, workspaceId);
    if (!threadId) {
      throw new Error("Validation Error: threadId is required to fetch participants.");
    }
    return this.db.getCommunicationParticipants(organizationId, workspaceId, threadId);
  }

  public async getLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getCommunicationLogs(organizationId, workspaceId);
  }
}
