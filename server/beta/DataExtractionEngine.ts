import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { DatabaseAdapter } from "../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";
import { DocumentProcessingError, DocumentErrorCode } from "./errors/DocumentProcessingError";

export class DataExtractionEngine {
  constructor(private dbAdapter: DatabaseAdapter, private kgEngine: KnowledgeGraphEngine) {}

  private runPythonWorkerStream(action: string, filePath: string, args: any, jobId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'workers', 'python', 'data_worker.py');
      if (!fs.existsSync(scriptPath)) {
        return reject(new DocumentProcessingError("Python worker script not found.", 'FILE_NOT_FOUND', { scriptPath }));
      }

      const payload = JSON.stringify({ action, file_path: filePath, ...args });
      const pyProcess = spawn('python3', [scriptPath, payload]);

      let finalResult: any = null;
      let errorOut = '';

      // Set up a cancellation poll
      const pollInterval = setInterval(async () => {
        try {
          const job = await this.dbAdapter.getDocumentJobById(jobId);
          if (job && job.status === 'CANCELED') {
            pyProcess.kill();
            clearInterval(pollInterval);
            reject(new DocumentProcessingError("Job was canceled by user.", 'CANCELED', { jobId }));
          }
        } catch (e) {}
      }, 2000);

      pyProcess.stdout.on('data', async (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'progress') {
                // Real progress from python
                await this.dbAdapter.updateDocumentJob(jobId, { progress: parsed.percent });
            } else if (parsed.type === 'result') {
                finalResult = parsed.data;
            }
          } catch (e) {
            // Not JSON, ignore or log
          }
        }
      });

      pyProcess.stderr.on('data', (data) => {
        errorOut += data.toString();
      });

      pyProcess.on('close', (code) => {
        clearInterval(pollInterval);
        if (code !== 0 && !finalResult) {
          return reject(new DocumentProcessingError(`Worker exited with code ${code}. ${errorOut}`, 'PROCESSING_ERROR', { code, errorOut }));
        }
        resolve(finalResult || { error: "No result returned" });
      });
      
      pyProcess.on('error', (err) => {
        clearInterval(pollInterval);
        reject(new DocumentProcessingError(err.message, 'PROCESSING_ERROR', { err }));
      });
    });
  }

  public async extract(documentId: string, instructions: any, organizationId: string, createdBy: string, workspaceId?: string): Promise<any> {
    const document = await this.dbAdapter.getDocumentById(documentId, workspaceId || "default-workspace");
    if (!document) throw new DocumentProcessingError("Document not found", 'FILE_NOT_FOUND', { documentId });

    // Create a job
    const job = await this.dbAdapter.createDocumentJob({
      organizationId,
      documentId,
      status: 'PENDING'
    });

    await this.dbAdapter.createDocumentAuditLog({
      organizationId,
      documentId,
      jobId: job.id,
      action: 'JOB_STARTED',
      details: { instructions }
    });

    // Run extraction asynchronously with retry control
    this.runExtractionProcessWithRetry(job.id, document, instructions, organizationId, createdBy).catch(e => console.error("Extraction job error:", e));

    return { jobId: job.id, status: "Extraction started. You can poll the job endpoint." };
  }

  private async runExtractionProcessWithRetry(jobId: string, document: any, instructions: any, organizationId: string, createdBy: string) {
    const maxRetries = 2;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        await this.runExtractionProcess(jobId, document, instructions, organizationId, createdBy);
        // If it reaches here and completes, break
        const job = await this.dbAdapter.getDocumentJobById(jobId);
        if (job && (job.status === 'COMPLETED' || job.status === 'CANCELED')) {
           break;
        }
      } catch (e: any) {
        // Will throw internally but handled
      }
      
      const job = await this.dbAdapter.getDocumentJobById(jobId);
      if (job && job.status === 'FAILED') {
         attempt++;
         if (attempt <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // simple backoff
            await this.dbAdapter.updateDocumentJob(jobId, { status: 'PENDING', error: null });
         }
      } else {
         break;
      }
    }
  }

  private async runExtractionProcess(jobId: string, document: any, instructions: any, organizationId: string, createdBy: string) {
    let result: any = null;
    let format = instructions.outputFormat || document.fileType || 'csv';
    let outputFilename = `extracted_${Date.now()}_${document.filename}.${format}`;
    let outputDir = path.join(process.cwd(), ".data", "outputs");
    let outputPath = path.join(outputDir, outputFilename);

    try {
      await this.dbAdapter.updateDocumentJob(jobId, { status: 'RUNNING', startedAt: new Date().toISOString() });
      
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      
      const ext = document.filename.split('.').pop()?.toLowerCase();
      
      const { filters, columns, sheetName, startRow, endRow } = instructions;

      if (ext === 'csv') {
        result = await this.runPythonWorkerStream("extract_csv", document.storagePath, {
          output_path: outputPath,
          filters,
          columns,
          startRow,
          endRow
        }, jobId);
      } else if (ext === 'xlsx') {
        result = await this.runPythonWorkerStream("extract_xlsx", document.storagePath, {
          output_path: outputPath,
          filters,
          columns,
          sheetName,
          outputFormat: format,
          startRow,
          endRow
        }, jobId);
      } else {
         throw new DocumentProcessingError("Unsupported format for extraction locally.", 'UNSUPPORTED_FORMAT', { ext });
      }

      if (!result || result.error || result.status === 'error') {
        throw new DocumentProcessingError(result?.error || "Extraction failed", 'PROCESSING_ERROR', { result });
      }

      const output = await this.dbAdapter.createDocumentOutput({
        organizationId,
        sourceDocumentId: document.id,
        createdBy,
        outputType: format,
        filename: outputFilename,
        storagePath: outputPath,
        metadata: {
          instructions_used: instructions,
          total_rows_extracted: result.rows_extracted || 0,
          status: result.status
        }
      });

      try {
        if (document.projectId) {
          await this.kgEngine.ensureNode(
            organizationId,
            document.projectId,
            "OUTPUT",
            outputFilename,
            "Document Processing Output",
            output.id,
            { format }
          );
          await this.kgEngine.createRelationship(organizationId, document.id, output.id, "DOCUMENT_OUTPUT");
          await this.kgEngine.createRelationship(organizationId, output.id, document.id, "GENERATED_FROM");
        }
      } catch (ex) {
        console.error("KG Error:", ex);
      }

      await this.dbAdapter.updateDocumentJob(jobId, { progress: 100, status: 'COMPLETED', finishedAt: new Date().toISOString(), error: null, metadata: { outputId: output.id } });
      await this.dbAdapter.createDocumentAuditLog({
        organizationId,
        documentId: document.id,
        jobId,
        action: 'JOB_COMPLETED',
        details: { outputId: output.id, rows: result.rows_extracted }
      });

    } catch (e: any) {
      const isCanceled = e.code === 'CANCELED' || e.message === "Job was canceled by user.";
      if (isCanceled) {
          // Already handled cancel states generally, but let's make sure
          await this.dbAdapter.updateDocumentJob(jobId, { status: 'CANCELED', finishedAt: new Date().toISOString() });
      } else {
        await this.dbAdapter.updateDocumentJob(jobId, { status: 'FAILED', error: e.message, finishedAt: new Date().toISOString() });
        await this.dbAdapter.createDocumentAuditLog({
          organizationId,
          documentId: document.id,
          jobId,
          action: 'JOB_FAILED',
          details: { error: e.message, code: e.code || 'PROCESSING_ERROR' }
        });
      }
    }
  }
}
