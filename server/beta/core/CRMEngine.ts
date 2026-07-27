import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { CRMInteraction, CreateCRMInteractionInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CRMEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getInteractions(organizationId: string, query: any = {}): Promise<CRMInteraction[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch CRM interactions.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getCRMInteractions(organizationId, filter);
  }

  public async createInteraction(organizationId: string, data: CreateCRMInteractionInput): Promise<CRMInteraction> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create a CRM interaction.");
    }
    if (!data.title) {
      throw new Error("Validation Error: Title is required.");
    }

    const interaction: CreateCRMInteractionInput = {
      ...data,
      organizationId,
      status: data.status || 'COMPLETED',
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createCRMInteraction(interaction) as CRMInteraction;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `CRM Interaction: ${saved.title}`,
          saved.description || "",
          saved.id,
          { interactionType: saved.interactionType }
        );
        if (saved.contactId) {
          const contactNode = await this.kgEngine.ensureNode(
            organizationId,
            null,
            "KNOWLEDGE",
            `Contact: ${saved.contactId}`,
            "",
            saved.contactId
          );
          await this.kgEngine.createRelationship(organizationId, node.id, contactNode.id, "RELATED_TO");
        }
      } catch (e) {
        console.warn("CRMEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
           await (this.memoryOS as any).registerEvent(organizationId, "CRMInteractionCreated", `Interaction recorded: ${saved.title}`);
        }
      } catch (e) {
        console.warn("CRMEngine: MemoryOS integration failed", e);
      }
    }

    return saved;
  }
}
