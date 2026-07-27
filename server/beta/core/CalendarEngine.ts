import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { CalendarEvent, CreateCalendarEventInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CalendarEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getEvents(organizationId: string, query: any = {}): Promise<CalendarEvent[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch calendar events.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getCalendarEvents(organizationId, filter);
  }

  public async createEvent(organizationId: string, data: CreateCalendarEventInput): Promise<CalendarEvent> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a calendar event.");
    }
    if (!data.title) {
      throw new Error("Validation Error: Title is required.");
    }
    if (!data.startAt || !data.endAt) {
      throw new Error("Validation Error: startAt and endAt are required dates.");
    }

    const event: CreateCalendarEventInput = {
      ...data,
      organizationId,
      status: data.status || 'SCHEDULED',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createCalendarEvent(event) as CalendarEvent;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Calendar Event: ${saved.title}`,
          saved.description || "",
          saved.id,
          { location: saved.location, startAt: saved.startAt }
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
        console.warn("CalendarEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
           await (this.memoryOS as any).registerEvent(organizationId, "CalendarEventCreated", `Event scheduled: ${saved.title}`);
        }
      } catch (e) {
        console.warn("CalendarEngine: MemoryOS integration failed", e);
      }
    }

    return saved;
  }
}
