import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentPublicPortal,
  GovernmentPublicCatalog,
  GovernmentPublicDataset,
  GovernmentPublicPublication,
  GovernmentPublicQuery,
  GovernmentPublicAccessLog,
  GovernmentPublicPortalSummary,
  GovernmentPublicPortalHealth
} from "../core/types";

export class GovernmentPublicPortalEngine {
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

  // --- 1. PORTALS ---
  public async getPublicPortals(organizationId: string, workspaceId: string): Promise<GovernmentPublicPortal[]> {
    return this.dbAdapter.getPublicPortals(organizationId, workspaceId);
  }

  public async createPublicPortal(data: GovernmentPublicPortal): Promise<GovernmentPublicPortal> {
    const item = await this.dbAdapter.createPublicPortal(data);

    // kg relation: GovernmentWorkspace -> HAS_PUBLIC_PORTAL -> GovernmentPublicPortal
    const workspaceNode = await this.knowledgeGraph.ensureNode(
      data.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace Node",
      item.workspaceId
    );

    const portalNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPortal",
      `Portal ${item.id}`,
      `Portal ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, portalNode.id, "HAS_PUBLIC_PORTAL");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicPortalCreated",
      entityType: "GovernmentPublicPortal",
      entityId: item.id!,
      description: `Public Portal created with status: ${item.status}`
    });

    return item;
  }

  // --- 2. CATALOGS ---
  public async getPublicCatalogs(organizationId: string, workspaceId: string): Promise<GovernmentPublicCatalog[]> {
    return this.dbAdapter.getPublicCatalogs(organizationId, workspaceId);
  }

  public async createPublicCatalog(data: GovernmentPublicCatalog): Promise<GovernmentPublicCatalog> {
    const item = await this.dbAdapter.createPublicCatalog(data);

    // portalNode -> HAS_PUBLIC_CATALOG -> catalogNode
    const portalNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPortal",
      "Portal Context",
      "Portal Node",
      data.metadataJson?.portalId || "unknown_portal"
    );

    const catalogNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicCatalog",
      `Catalog ${item.id}`,
      `Catalog ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, portalNode.id, catalogNode.id, "HAS_PUBLIC_CATALOG");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicCatalogCreated",
      entityType: "GovernmentPublicCatalog",
      entityId: item.id!,
      description: `Public Catalog created with status: ${item.status}`
    });

    return item;
  }

  // --- 3. DATASETS ---
  public async getPublicDatasets(organizationId: string, workspaceId: string): Promise<GovernmentPublicDataset[]> {
    return this.dbAdapter.getPublicDatasets(organizationId, workspaceId);
  }

  public async createPublicDataset(data: GovernmentPublicDataset): Promise<GovernmentPublicDataset> {
    const item = await this.dbAdapter.createPublicDataset(data);

    // catalogNode -> HAS_PUBLIC_DATASET -> datasetNode
    const catalogNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicCatalog",
      "Catalog Context",
      "Catalog Node",
      data.metadataJson?.catalogId || "unknown_catalog"
    );

    const datasetNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicDataset",
      `Dataset ${item.id}`,
      `Dataset ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, catalogNode.id, datasetNode.id, "HAS_PUBLIC_DATASET");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicDatasetCreated",
      entityType: "GovernmentPublicDataset",
      entityId: item.id!,
      description: `Public Dataset created with status: ${item.status}`
    });

    return item;
  }

  // --- 4. PUBLICATIONS ---
  public async getPublicPublications(organizationId: string, workspaceId: string): Promise<GovernmentPublicPublication[]> {
    return this.dbAdapter.getPublicPublications(organizationId, workspaceId);
  }

  public async createPublicPublication(data: GovernmentPublicPublication): Promise<GovernmentPublicPublication> {
    const item = await this.dbAdapter.createPublicPublication(data);

    // portalNode -> HAS_PUBLIC_PUBLICATION -> pubNode
    const portalNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPortal",
      "Portal Context",
      "Portal Node",
      data.metadataJson?.portalId || "unknown_portal"
    );

    const pubNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPublication",
      `Publication ${item.id}`,
      `Publication ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, portalNode.id, pubNode.id, "HAS_PUBLIC_PUBLICATION");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicPublicationCreated",
      entityType: "GovernmentPublicPublication",
      entityId: item.id!,
      description: `Public Publication created with status: ${item.status}`
    });

    return item;
  }

  // --- 5. QUERIES ---
  public async getPublicQueries(organizationId: string, workspaceId: string): Promise<GovernmentPublicQuery[]> {
    return this.dbAdapter.getPublicQueries(organizationId, workspaceId);
  }

  public async createPublicQuery(data: GovernmentPublicQuery): Promise<GovernmentPublicQuery> {
    const item = await this.dbAdapter.createPublicQuery(data);

    // portalNode -> HAS_PUBLIC_QUERY -> queryNode
    const portalNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPortal",
      "Portal Context",
      "Portal Node",
      data.metadataJson?.portalId || "unknown_portal"
    );

    const queryNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicQuery",
      `Query ${item.id}`,
      `Query ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, portalNode.id, queryNode.id, "HAS_PUBLIC_QUERY");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicQueryCreated",
      entityType: "GovernmentPublicQuery",
      entityId: item.id!,
      description: `Public Query created with status: ${item.status}`
    });

    return item;
  }

  // --- 6. ACCESS LOGS ---
  public async getPublicAccessLogs(organizationId: string, workspaceId: string): Promise<GovernmentPublicAccessLog[]> {
    return this.dbAdapter.getPublicAccessLogs(organizationId, workspaceId);
  }

  public async createPublicAccessLog(data: GovernmentPublicAccessLog): Promise<GovernmentPublicAccessLog> {
    const item = await this.dbAdapter.createPublicAccessLog(data);

    // portalNode -> HAS_ACCESS_LOG -> logNode
    const portalNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicPortal",
      "Portal Context",
      "Portal Node",
      data.metadataJson?.portalId || "unknown_portal"
    );

    const logNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentPublicAccessLog",
      `AccessLog ${item.id}`,
      `AccessLog ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, portalNode.id, logNode.id, "HAS_ACCESS_LOG");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentPublicAccessLogCreated",
      entityType: "GovernmentPublicAccessLog",
      entityId: item.id!,
      description: `Public Access Log created with status: ${item.status}`
    });

    return item;
  }

  // --- 7. SUMMARY ---
  public async getPublicPortalSummary(organizationId: string, workspaceId: string): Promise<GovernmentPublicPortalSummary> {
    const [portals, catalogs, datasets, publications, queries, accessLogs] = await Promise.all([
      this.getPublicPortals(organizationId, workspaceId),
      this.getPublicCatalogs(organizationId, workspaceId),
      this.getPublicDatasets(organizationId, workspaceId),
      this.getPublicPublications(organizationId, workspaceId),
      this.getPublicQueries(organizationId, workspaceId),
      this.getPublicAccessLogs(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    if (portals.length > 0) {
      if (catalogs.length > 0 && datasets.length > 0 && publications.length > 0) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalPortals: portals.length,
      totalCatalogs: catalogs.length,
      totalDatasets: datasets.length,
      totalPublications: publications.length,
      totalQueries: queries.length,
      totalAccessLogs: accessLogs.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 8. HEALTH ---
  public async getPublicPortalHealth(organizationId: string, workspaceId: string): Promise<GovernmentPublicPortalHealth> {
    try {
      const summary = await this.getPublicPortalSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentPublicPortalHealthComputed",
        entityType: "GovernmentPublicPortal",
        entityId: workspaceId,
        description: `Computed health: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Public Portal module fully operational." :
                   summary.status === "PARTIAL_DATA" ? "Partial data available. Missing catalogs, datasets, or publications." :
                   "No portal data found.",
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
