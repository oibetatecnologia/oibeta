import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ImportJob, ImportJobLog, ImportJobError } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ImportCenterEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async createImportJob(
    organizationId: string,
    workspaceId: string,
    moduleCode: string,
    jobType: string,
    metadataJson: any = {}
  ): Promise<ImportJob> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to create an import job.");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspace_id is required. Workspaces are mandatory for import jobs.");
    }
    if (!moduleCode) {
      throw new Error("Validation Error: module_code is required to create an import job.");
    }
    if (!jobType) {
      throw new Error("Validation Error: job_type is required to create an import job.");
    }

    const job = await this.db.createImportJob({
      organizationId,
      workspaceId,
      moduleCode,
      jobType,
      status: "PENDING",
      metadataJson
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const orgNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "ORGANIZATION",
          `Organization: ${organizationId}`,
          "",
          organizationId
        );
        const wsNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Workspace: ${workspaceId}`,
          "",
          workspaceId
        );
        const jobNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Import Job: ${moduleCode} - ${jobType}`,
          `Status: ${job.status}`,
          job.id
        );

        // Links: Organization -> CREATED -> ImportJob, Workspace -> EXECUTED -> ImportJob
        await this.kgEngine.createRelationship(organizationId, orgNode.id, jobNode.id, "CREATED" as any);
        await this.kgEngine.createRelationship(organizationId, wsNode.id, jobNode.id, "EXECUTED" as any);
      } catch (e) {
        console.warn("ImportCenterEngine: KG integration failed during job creation", e);
      }
    }

    // Memory OS Event Logging
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ImportJobCreated",
            `Import job created: Module [${moduleCode}] type [${jobType}] (ID: ${job.id})`
          );
        }
      } catch (e) {}
    }

    return job;
  }

  public async startImportJob(organizationId: string, id: string): Promise<ImportJob> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    const updated = await this.db.updateImportJob(id, organizationId, {
      status: "RUNNING",
      startedAt: new Date().toISOString()
    });

    // Log start message
    await this.addImportLog(organizationId, id, `Import job sequence initiated with status RUNNING.`, "INFO");

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ImportJobStarted",
            `Import job started: ${id}`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  public async completeImportJob(
    organizationId: string,
    id: string,
    stats: { totalRows?: number; processedRows?: number; successRows?: number; errorRows?: number } = {}
  ): Promise<ImportJob> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }

    const updated = await this.db.updateImportJob(id, organizationId, {
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      totalRows: stats.totalRows,
      processedRows: stats.processedRows,
      successRows: stats.successRows,
      errorRows: stats.errorRows
    });

    await this.addImportLog(
      organizationId,
      id,
      `Import completed successfully. Total rows: ${updated.totalRows}, Processed: ${updated.processedRows}, Errors: ${updated.errorRows}`,
      "INFO"
    );

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ImportJobCompleted",
            `Import job completed successfully: ${id}`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  public async failImportJob(organizationId: string, id: string, errorMessage: string): Promise<ImportJob> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }

    const updated = await this.db.updateImportJob(id, organizationId, {
      status: "FAILED",
      completedAt: new Date().toISOString()
    });

    await this.addImportLog(
      organizationId,
      id,
      `Import process failed: ${errorMessage}`,
      "ERROR"
    );

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ImportJobFailed",
            `Import job failure logged for: ${id}. Error: ${errorMessage}`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  public async addImportLog(
    organizationId: string,
    jobId: string,
    message: string,
    level: string = "INFO",
    metadataJson: any = {}
  ): Promise<ImportJobLog> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    return this.db.createImportLog({
      jobId,
      level,
      message,
      metadataJson
    });
  }

  public async addImportError(
    organizationId: string,
    jobId: string,
    rowNumber: number,
    errorCode: string,
    errorMessage: string,
    rawDataJson: any = {}
  ): Promise<ImportJobError> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }

    const err = await this.db.createImportError({
      jobId,
      rowNumber,
      errorCode,
      errorMessage,
      rawDataJson
    });

    // Knowledge Graph Error Integration: ImportJob -> GENERATED -> ImportError node
    if (this.kgEngine) {
      try {
        const jobNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Import Job Error reference`,
          "",
          jobId
        );
        const errorNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Error Row: ${rowNumber}`,
          `[${errorCode}]: ${errorMessage}`,
          err.id
        );

        await this.kgEngine.createRelationship(organizationId, jobNode.id, errorNode.id, "GENERATED" as any);
      } catch (e) {
        console.warn("ImportCenterEngine: KG Error relationship insertion failed", e);
      }
    }

    // Memory OS Event Logging
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === 'function') {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ImportErrorRegistered",
            `Row [${rowNumber}] failed with error code [${errorCode}]: ${errorMessage}`
          );
        }
      } catch (e) {}
    }

    return err;
  }

  public async getImportJob(organizationId: string, id: string): Promise<ImportJob | null> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    return this.db.getImportJob(id, organizationId);
  }

  public async getImportJobs(organizationId: string, workspaceId: string): Promise<ImportJob[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspace_id is required.");
    }
    return this.db.getImportJobs(organizationId, workspaceId);
  }

  public async getImportErrors(organizationId: string, jobId: string): Promise<ImportJobError[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    // Verify job belongs to organization before listing errors to guarantee multi-tenancy boundaries
    const job = await this.db.getImportJob(jobId, organizationId);
    if (!job) {
      throw new Error(`ImportJob not found: ${jobId} under authorized organization scope.`);
    }
    return this.db.getImportErrors(jobId);
  }
}
