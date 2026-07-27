import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Activity, CreateActivityInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ActivityEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getActivities(organizationId: string, query: any = {}): Promise<Activity[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch activities.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getActivities(organizationId, filter);
  }

  public async createActivity(organizationId: string, data: CreateActivityInput): Promise<Activity> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create an activity.");
    }
    if (!data.title) {
      throw new Error("Validation Error: Title is required.");
    }
    if (!data.activityType) {
      throw new Error("Validation Error: activityType is required.");
    }

    const activity: CreateActivityInput = {
      ...data,
      organizationId,
      status: data.status || 'PENDING',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createActivity(activity) as Activity;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Activity: ${saved.title}`,
          saved.description || "",
          saved.id,
          { activityType: saved.activityType, territoryId: saved.territoryId }
        );
        if (saved.relatedEntityId && saved.relatedEntityType) {
          const targetNode = await this.kgEngine.ensureNode(
            organizationId,
            null,
            "KNOWLEDGE",
            `${saved.relatedEntityType}: ${saved.relatedEntityId}`,
            "",
            saved.relatedEntityId
          );
          await this.kgEngine.createRelationship(organizationId, node.id, targetNode.id, "RELATED_TO");
        }
      } catch (e) {
        console.warn("ActivityEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
           await (this.memoryOS as any).registerEvent(organizationId, "ActivityCreated", `Activity created: ${saved.title}`);
        }
      } catch (e) {
        console.warn("ActivityEngine: MemoryOS integration failed", e);
      }
    }

    return saved;
  }
}
