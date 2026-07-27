import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentDocumentVersion,
  GovernmentDocumentClassification,
  GovernmentDocumentRetention,
  GovernmentDocumentArchive,
  GovernmentDocumentMovement,
  GovernmentDocumentAudit,
  GovernmentDocumentLifecycleSummary,
  GovernmentDocumentLifecycleHealth
} from "../core/types";

export class GovernmentDocumentLifecycleEngine {
  private dbAdapter: DatabaseAdapter;
  private memoryOS: MemoryOS;
  private knowledgeGraph: KnowledgeGraphEngine;

  constructor(
    dbAdapter: DatabaseAdapter,
    knowledgeGraph: KnowledgeGraphEngine,
    memoryOS: MemoryOS
  ) {
    this.dbAdapter = dbAdapter;
    this.knowledgeGraph = knowledgeGraph;
    this.memoryOS = memoryOS;
  }

  // --- 1. DOCUMENT VERSIONS ---
  public async getDocumentVersions(organizationId: string, workspaceId: string): Promise<GovernmentDocumentVersion[]> {
    return this.dbAdapter.getDocumentVersions(organizationId, workspaceId);
  }

  public async createDocumentVersion(data: GovernmentDocumentVersion): Promise<GovernmentDocumentVersion> {
    const item = await this.dbAdapter.createDocumentVersion(data);

    // kg relation: GovernmentDocumentRecord -> HAS_VERSION -> GovernmentDocumentVersion
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const versionNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentVersion",
      `Document Version ${item.id}`,
      `Version status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, versionNode.id, "HAS_VERSION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentVersionCreated",
      entityType: "GovernmentDocumentVersion",
      entityId: item.id!,
      description: `Document version created with status: ${item.status}`
    });

    return item;
  }

  // --- 2. DOCUMENT CLASSIFICATIONS ---
  public async getDocumentClassifications(organizationId: string, workspaceId: string): Promise<GovernmentDocumentClassification[]> {
    return this.dbAdapter.getDocumentClassifications(organizationId, workspaceId);
  }

  public async createDocumentClassification(data: GovernmentDocumentClassification): Promise<GovernmentDocumentClassification> {
    const item = await this.dbAdapter.createDocumentClassification(data);

    // kg relation: GovernmentDocumentRecord -> HAS_CLASSIFICATION -> GovernmentDocumentClassification
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const classificationNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentClassification",
      `Classification ${item.id}`,
      `Classification status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, classificationNode.id, "HAS_CLASSIFICATION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentClassificationCreated",
      entityType: "GovernmentDocumentClassification",
      entityId: item.id!,
      description: `Document classification registered. Status: ${item.status}`
    });

    return item;
  }

  // --- 3. DOCUMENT RETENTIONS ---
  public async getDocumentRetentions(organizationId: string, workspaceId: string): Promise<GovernmentDocumentRetention[]> {
    return this.dbAdapter.getDocumentRetentions(organizationId, workspaceId);
  }

  public async createDocumentRetention(data: GovernmentDocumentRetention): Promise<GovernmentDocumentRetention> {
    const item = await this.dbAdapter.createDocumentRetention(data);

    // kg relation: GovernmentDocumentRecord -> HAS_RETENTION -> GovernmentDocumentRetention
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const retentionNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRetention",
      `Retention ${item.id}`,
      `Retention status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, retentionNode.id, "HAS_RETENTION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentRetentionCreated",
      entityType: "GovernmentDocumentRetention",
      entityId: item.id!,
      description: `Document retention established. Status: ${item.status}`
    });

    return item;
  }

  // --- 4. DOCUMENT ARCHIVES ---
  public async getDocumentArchives(organizationId: string, workspaceId: string): Promise<GovernmentDocumentArchive[]> {
    return this.dbAdapter.getDocumentArchives(organizationId, workspaceId);
  }

  public async createDocumentArchive(data: GovernmentDocumentArchive): Promise<GovernmentDocumentArchive> {
    const item = await this.dbAdapter.createDocumentArchive(data);

    // kg relation: GovernmentDocumentRecord -> HAS_ARCHIVE -> GovernmentDocumentArchive
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const archiveNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentArchive",
      `Archive ${item.id}`,
      `Archive status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, archiveNode.id, "HAS_ARCHIVE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentArchiveCreated",
      entityType: "GovernmentDocumentArchive",
      entityId: item.id!,
      description: `Document archiving registered under status: ${item.status}`
    });

    return item;
  }

  // --- 5. DOCUMENT MOVEMENTS ---
  public async getDocumentMovements(organizationId: string, workspaceId: string): Promise<GovernmentDocumentMovement[]> {
    return this.dbAdapter.getDocumentMovements(organizationId, workspaceId);
  }

  public async createDocumentMovement(data: GovernmentDocumentMovement): Promise<GovernmentDocumentMovement> {
    const item = await this.dbAdapter.createDocumentMovement(data);

    // kg relation: GovernmentDocumentRecord -> HAS_MOVEMENT -> GovernmentDocumentMovement
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const movementNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentMovement",
      `Document Movement ${item.id}`,
      `Movement status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, movementNode.id, "HAS_MOVEMENT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentMovementCreated",
      entityType: "GovernmentDocumentMovement",
      entityId: item.id!,
      description: `Document movement tracked under status: ${item.status}`
    });

    return item;
  }

  // --- 6. DOCUMENT AUDITS ---
  public async getDocumentAudits(organizationId: string, workspaceId: string): Promise<GovernmentDocumentAudit[]> {
    return this.dbAdapter.getDocumentAudits(organizationId, workspaceId);
  }

  public async createDocumentAudit(data: GovernmentDocumentAudit): Promise<GovernmentDocumentAudit> {
    const item = await this.dbAdapter.createDocumentAudit(data);

    // kg relation: GovernmentDocumentRecord -> HAS_AUDIT -> GovernmentDocumentAudit
    const docNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentRecord",
      "Document Context",
      "Document Record Node Reference",
      data.metadataJson?.documentRecordId || "unknown_document"
    );

    const auditNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentDocumentAudit",
      `Document Audit ${item.id}`,
      `Audit status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, docNode.id, auditNode.id, "HAS_AUDIT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentDocumentAuditCreated",
      entityType: "GovernmentDocumentAudit",
      entityId: item.id!,
      description: `Document audit log successfully written. Status: ${item.status}`
    });

    return item;
  }

  // --- 7. SUMMARY ---
  public async getLifecycleSummary(organizationId: string, workspaceId: string): Promise<GovernmentDocumentLifecycleSummary> {
    const [versions, classifications, retentions, archives, movements, audits] = await Promise.all([
      this.getDocumentVersions(organizationId, workspaceId),
      this.getDocumentClassifications(organizationId, workspaceId),
      this.getDocumentRetentions(organizationId, workspaceId),
      this.getDocumentArchives(organizationId, workspaceId),
      this.getDocumentMovements(organizationId, workspaceId),
      this.getDocumentAudits(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    const totalCount =
      versions.length +
      classifications.length +
      retentions.length +
      archives.length +
      movements.length +
      audits.length;

    if (totalCount > 0) {
      if (
        versions.length > 0 &&
        classifications.length > 0 &&
        retentions.length > 0 &&
        archives.length > 0 &&
        movements.length > 0 &&
        audits.length > 0
      ) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalDocumentVersions: versions.length,
      totalDocumentClassifications: classifications.length,
      totalDocumentRetentions: retentions.length,
      totalDocumentArchives: archives.length,
      totalDocumentMovements: movements.length,
      totalDocumentAudits: audits.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 8. HEALTH ---
  public async getLifecycleHealth(organizationId: string, workspaceId: string): Promise<GovernmentDocumentLifecycleHealth> {
    try {
      const summary = await this.getLifecycleSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentDocumentLifecycleHealthComputed",
        entityType: "GovernmentDocumentRecord",
        entityId: workspaceId,
        description: `Computed Document Lifecycle health status: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Document versions, classifications, retentions, archives, movements, and audits are fully operational." :
                   summary.status === "PARTIAL_DATA" ? "Partial lifecycle records mapped. Define all document classifications, retentions, archive storage pathways, and track audit logs." :
                   "No document lifecycle records or operational states populated yet.",
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          message: "Error computing health: " + (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
