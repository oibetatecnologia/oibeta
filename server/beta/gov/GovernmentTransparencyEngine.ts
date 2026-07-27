import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { 
  GovernmentTransparencyPublication,
  GovernmentTransparencyCategory,
  GovernmentTransparencyDataset,
  GovernmentTransparencyIndicator,
  GovernmentTransparencyDocument,
  GovernmentTransparencyReport,
  GovernmentTransparencySummary,
  GovernmentTransparencyHealth 
} from "../core/types";

export class GovernmentTransparencyEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private memoryOS: MemoryOS
  ) {}

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId || !workspaceId) {
       throw new Error("Multi-Tenant Error: organizationId and workspaceId are required.");
    }
  }

  public async getTransparencyPublications(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyPublication[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyPublications(organizationId, workspaceId);
  }

  public async createTransparencyPublication(data: any): Promise<GovernmentTransparencyPublication> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const publication = await this.dbAdapter.createTransparencyPublication(data);
    
    await this.kgEngine.createNode(
      publication.id as string,
      "GovernmentTransparencyPublication",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Publication",
        ...publication
      }
    );
    
    await this.kgEngine.createRelationship(
      data.organizationId,
      data.workspaceId,
      publication.id as string,
      "HAS_TRANSPARENCY_PUBLICATION"
    );
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: publication.id as string,
        entityType: "GovernmentTransparencyPublication",
        eventType: "GovernmentTransparencyPublicationCreated",
        details: { publicationId: publication.id }
      }
    });

    return publication;
  }

  public async getTransparencyCategories(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyCategory[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyCategories(organizationId, workspaceId);
  }

  public async createTransparencyCategory(data: any): Promise<GovernmentTransparencyCategory> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const category = await this.dbAdapter.createTransparencyCategory(data);
    
    await this.kgEngine.createNode(
      category.id as string,
      "GovernmentTransparencyCategory",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.name || "Category",
        ...category
      }
    );
    
    if (data.publicationId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.publicationId,
        category.id as string,
        "HAS_CATEGORY"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: category.id as string,
        entityType: "GovernmentTransparencyCategory",
        eventType: "GovernmentTransparencyCategoryCreated",
        details: { categoryId: category.id }
      }
    });

    return category;
  }

  public async getTransparencyDatasets(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyDataset[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyDatasets(organizationId, workspaceId);
  }

  public async createTransparencyDataset(data: any): Promise<GovernmentTransparencyDataset> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const dataset = await this.dbAdapter.createTransparencyDataset(data);
    
    await this.kgEngine.createNode(
      dataset.id as string,
      "GovernmentTransparencyDataset",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.name || "Dataset",
        ...dataset
      }
    );
    
    if (data.categoryId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.categoryId,
        dataset.id as string,
        "HAS_DATASET"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: dataset.id as string,
        entityType: "GovernmentTransparencyDataset",
        eventType: "GovernmentTransparencyDatasetCreated",
        details: { datasetId: dataset.id }
      }
    });

    return dataset;
  }

  public async getTransparencyIndicators(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyIndicator[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyIndicators(organizationId, workspaceId);
  }

  public async createTransparencyIndicator(data: any): Promise<GovernmentTransparencyIndicator> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const indicator = await this.dbAdapter.createTransparencyIndicator(data);
    
    await this.kgEngine.createNode(
      indicator.id as string,
      "GovernmentTransparencyIndicator",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.name || "Indicator",
        ...indicator
      }
    );
    
    if (data.datasetId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.datasetId,
        indicator.id as string,
        "HAS_INDICATOR"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: indicator.id as string,
        entityType: "GovernmentTransparencyIndicator",
        eventType: "GovernmentTransparencyIndicatorCreated",
        details: { indicatorId: indicator.id }
      }
    });

    return indicator;
  }

  public async getTransparencyDocuments(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyDocument[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyDocuments(organizationId, workspaceId);
  }

  public async createTransparencyDocument(data: any): Promise<GovernmentTransparencyDocument> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const document = await this.dbAdapter.createTransparencyDocument(data);
    
    await this.kgEngine.createNode(
      document.id as string,
      "GovernmentTransparencyDocument",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Document",
        ...document
      }
    );
    
    if (data.publicationId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.publicationId,
        document.id as string,
        "HAS_DOCUMENT"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: document.id as string,
        entityType: "GovernmentTransparencyDocument",
        eventType: "GovernmentTransparencyDocumentCreated",
        details: { documentId: document.id }
      }
    });

    return document;
  }

  public async getTransparencyReports(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyReport[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getTransparencyReports(organizationId, workspaceId);
  }

  public async createTransparencyReport(data: any): Promise<GovernmentTransparencyReport> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const report = await this.dbAdapter.createTransparencyReport(data);
    
    await this.kgEngine.createNode(
      report.id as string,
      "GovernmentTransparencyReport",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Report",
        ...report
      }
    );
    
    if (data.publicationId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.publicationId,
        report.id as string,
        "HAS_REPORT"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: report.id as string,
        entityType: "GovernmentTransparencyReport",
        eventType: "GovernmentTransparencyReportCreated",
        details: { reportId: report.id }
      }
    });

    return report;
  }

  public async getTransparencySummary(organizationId: string, workspaceId: string): Promise<GovernmentTransparencySummary> {
    this.validateTenant(organizationId, workspaceId);
    const publications = await this.getTransparencyPublications(organizationId, workspaceId);
    const categories = await this.getTransparencyCategories(organizationId, workspaceId);
    
    if (publications.length === 0) {
      return { status: "NO_DATA", summary: {} };
    }

    const summary = {
      totalPublications: publications.length,
      totalCategories: categories.length,
      publishedPublications: publications.filter((p: any) => p.status === "PUBLISHED").length,
    };

    return {
      status: publications.length > 0 ? "READY" : "PARTIAL_DATA",
      summary
    };
  }

  public async getTransparencyHealth(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyHealth> {
    this.validateTenant(organizationId, workspaceId);
    const publications = await this.getTransparencyPublications(organizationId, workspaceId);
    const categories = await this.getTransparencyCategories(organizationId, workspaceId);
    const datasets = await this.getTransparencyDatasets(organizationId, workspaceId);
    const indicators = await this.getTransparencyIndicators(organizationId, workspaceId);
    const documents = await this.getTransparencyDocuments(organizationId, workspaceId);
    const reports = await this.getTransparencyReports(organizationId, workspaceId);
    
    if (publications.length === 0) {
      return { status: "NO_DATA", healthScore: 0, metrics: {} };
    }

    const health: GovernmentTransparencyHealth = {
      status: publications.length > 0 ? "READY" : "PARTIAL_DATA",
      healthScore: publications.length > 0 ? 85 : 0, 
      metrics: {
        publicationsWithCategories: publications.filter(p => categories.some(c => c.publicationId === p.id)).length,
        publicationsWithDocuments: publications.filter(p => documents.some(d => d.publicationId === p.id)).length,
        publicationsWithReports: publications.filter(p => reports.some(r => r.publicationId === p.id)).length,
        categoriesWithDatasets: categories.filter(c => datasets.some(d => d.categoryId === c.id)).length,
        datasetsWithIndicators: datasets.filter(d => indicators.some(i => i.datasetId === d.id)).length,
      }
    };

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: workspaceId,
        entityType: "GovernmentTransparencyHealth",
        eventType: "GovernmentTransparencyHealthComputed",
        details: { health }
      }
    });

    return health;
  }
}
