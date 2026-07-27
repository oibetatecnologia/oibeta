import { DatabaseAdapter } from "../database/DatabaseAdapter";
import { DataPreviewEngine } from "./DataPreviewEngine";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";

export class DocumentIntelligenceEngine {
  constructor(private dbAdapter: DatabaseAdapter, private dataPreviewEngine: DataPreviewEngine, private kgEngine: KnowledgeGraphEngine) {}

  public async processUpload(fileProps: any): Promise<any> {
    const { organizationId, projectId, uploadedBy, filename, fileType, fileSize, storagePath, metadata } = fileProps;
    
    // 1. Create document record
    const document = await this.dbAdapter.createDocument({
      organizationId,
      projectId,
      uploadedBy,
      filename,
      fileType,
      fileSize,
      storagePath,
      metadata,
      status: "uploaded"
    });

    await this.dbAdapter.createDocumentAuditLog({
       organizationId,
       documentId: document.id,
       action: "UPLOAD",
       details: { filename, fileSize }
    });

    // 2. Add to Knowledge Graph
    if (projectId) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "DOCUMENT",
        filename,
        "Document file uploaded",
        document.id,
        { fileSize }
      );
    }

    // 3. Inspect using DataPreviewEngine
    const preview = await this.dataPreviewEngine.generatePreview({ ...fileProps, documentId: document.id });
    
    await this.dbAdapter.createDocumentAuditLog({
       organizationId,
       documentId: document.id,
       action: "PREVIEW",
       details: { type: preview.type }
    });

    if (preview.fullText) {
      let chunkType = "text";
      if (fileType === "application/pdf") chunkType = "pdf";
      else if (fileType === "text/html") chunkType = "html";
      else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") chunkType = "docx";

      await this.createTextChunks(document.id, preview.fullText, organizationId, chunkType, projectId);
      delete preview.fullText; // do not store or send full text in metadata/payload
    }

    // Update doc metadata with preview info
    await this.dbAdapter.updateDocument(document.id, {
      metadata: {
        ...metadata,
        preview
      },
      status: "preview_ready"
    });

    return { document, preview };
  }

  // Smarter chunking logic
  public async createTextChunks(documentId: string, content: string, organizationId: string, docType: string, projectId?: string): Promise<void> {
    let chunks: string[] = [];

    // Intelligent splitting depending on type
    if (docType === "pdf" || docType === "docx") {
      // Split by double newlines or pages (which might be Form Feed characters)
      chunks = content.split(/(?:\f|\n{2,})/).filter(c => c.trim().length > 50);
    } else if (docType === "html") {
      // Split by common block tags (very roughly without DOM parser here, simple approach)
      chunks = content.split(/\n{2,}/).filter(c => c.trim().length > 50);
    } else {
      // txt or unknown - standard length split but try to split by sentence
      let lastIndex = 0;
      while (lastIndex < content.length) {
        let nextIndex = lastIndex + 4000;
        if (nextIndex < content.length) {
            // Find nearest period to avoid breaking words
            const pt = content.lastIndexOf('.', nextIndex);
            if (pt > lastIndex + 2000) {
               nextIndex = pt + 1;
            }
        }
        chunks.push(content.substring(lastIndex, nextIndex));
        lastIndex = nextIndex;
      }
    }

    // Fallback if chunks are too huge
    let finalChunks: string[] = [];
    for (const c of chunks) {
       if (c.length > 8000) {
          for (let i = 0; i < c.length; i += 4000) {
             finalChunks.push(c.substring(i, i + 4000));
          }
       } else {
          finalChunks.push(c);
       }
    }

    let chunkIndex = 0;
    for (const chunkContext of finalChunks.filter(c => c.trim().length > 10)) {
      const estimatedTokens = Math.ceil(chunkContext.length / 4);

      const chunkNode = await this.dbAdapter.createDocumentChunk({
        organizationId,
        documentId,
        chunkIndex,
        content: chunkContext,
        tokenEstimate: estimatedTokens,
        metadata: {
            length: chunkContext.length
        }
      });

      if (projectId) {
          await this.kgEngine.ensureNode(
              organizationId,
              projectId,
              "GENERATED_CHUNK",
              `Chunk ${chunkIndex}`,
              "Chunk de conteúdo",
              chunkNode.id,
              { chunkContext: chunkContext.substring(0, 50) } // meta
          );
          await this.kgEngine.createRelationship(
              organizationId,
              documentId,
              chunkNode.id,
              "GENERATED_CHUNK"
          );
      }

      chunkIndex++;
    }
  }
}
