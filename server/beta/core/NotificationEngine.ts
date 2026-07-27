import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Notification, CreateNotificationInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class NotificationEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getNotifications(organizationId: string, query: any = {}): Promise<Notification[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch notifications.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getNotifications(organizationId, filter);
  }

  public async createNotification(organizationId: string, data: CreateNotificationInput): Promise<Notification> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a notification.");
    }
    if (!data.userId || !data.title) {
      throw new Error("Validation Error: userId and title are required.");
    }

    const notification: CreateNotificationInput = {
      ...data,
      organizationId,
      status: data.status || 'UNREAD',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createNotification(notification) as Notification;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Notification: ${saved.title}`,
          saved.message || "",
          saved.id,
          { notificationType: saved.notificationType }
        );
        const userNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "USER",
          `User: ${saved.userId}`,
          "",
          saved.userId
        );
        await this.kgEngine.createRelationship(organizationId, node.id, userNode.id, "RELATED_TO");
      } catch (e) {
        console.warn("NotificationEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "NotificationCreated", `Notification: ${saved.title}`);
          }
       } catch (e) {}
    }

    return saved;
  }
}
