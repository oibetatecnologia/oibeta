import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Attachment, CreateAttachmentInput, validateAndBuildFilter } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class AttachmentEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getAttachments(organizationId: string, query: any = {}): Promise<Attachment[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch attachments.");
    }
    const filter = validateAndBuildFilter(organizationId, query);
    return this.db.getAttachments(organizationId, filter);
  }

  public async createAttachment(organizationId: string, data: CreateAttachmentInput): Promise<Attachment> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create an attachment.");
    }
    if (!data.fileName || !data.storagePath) {
      throw new Error("Validation Error: fileName and storagePath are required.");
    }

    const attachment: CreateAttachmentInput = {
      ...data,
      organizationId,
      metadataJson: data.metadataJson || {}
    };
    const saved = await this.db.createAttachment(attachment) as Attachment;

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const node = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Attachment: ${saved.fileName}`,
          saved.mimeType || saved.fileType || "",
          saved.id,
          { sizeBytes: saved.sizeBytes }
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
        console.warn("AttachmentEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "AttachmentUploaded", `File attached: ${saved.fileName}`);
          }
       } catch (e) {}
    }

    return saved;
  }
}
