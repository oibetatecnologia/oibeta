import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Contact, CreateContactInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ContactEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getContacts(organizationId: string, query: any = {}): Promise<Contact[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch contacts.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getContacts(organizationId, filter);
  }

  public async createContact(organizationId: string, data: CreateContactInput): Promise<Contact> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a contact.");
    }
    if (!data.name) {
      throw new Error("Validation Error: Name is required.");
    }

    const contact: CreateContactInput = {
      ...data,
      organizationId,
      status: data.status || 'ACTIVE',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createContact(contact) as Contact;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Contact: ${saved.name}`,
          saved.notes || `Type: ${saved.type || "Generic"}`,
          saved.id,
          { email: saved.email, phone: saved.phone }
        );
        const orgNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "ORGANIZATION",
          `Organization: ${organizationId}`,
          "",
          organizationId
        );
        await this.kgEngine.createRelationship(organizationId, node.id, orgNode.id, "BELONGS_TO");
      } catch (e) {
        console.warn("ContactEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "ContactCreated", `Contact created: ${saved.name}`);
          }
       } catch (e) {
          console.warn("ContactEngine: MemoryOS integration failed", e);
       }
    }

    return saved;
  }
}
