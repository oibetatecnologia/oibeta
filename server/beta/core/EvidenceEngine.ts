import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Evidence, CreateEvidenceInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class EvidenceEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getEvidences(organizationId: string, query: any = {}): Promise<Evidence[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch evidences.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getEvidences(organizationId, filter);
  }

  public async createEvidence(organizationId: string, data: CreateEvidenceInput): Promise<Evidence> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create an evidence.");
    }
    if (!data.title) {
      throw new Error("Validation Error: Title is required.");
    }

    const evidence: CreateEvidenceInput = {
      ...data,
      organizationId,
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createEvidence(evidence) as Evidence;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Evidence: ${saved.title}`,
          saved.description || "",
          saved.id,
          { confidenceLevel: saved.confidenceLevel }
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
          // Standardize "proves" or support connection relation mapping
          await this.kgEngine.createRelationship(organizationId, node.id, targetNode.id, "SUPPORTS");
        }
      } catch (e) {
        console.warn("EvidenceEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "EvidenceCreated", `Evidence attached: ${saved.title}`);
          }
       } catch (e) {}
    }

    return saved;
  }
}
