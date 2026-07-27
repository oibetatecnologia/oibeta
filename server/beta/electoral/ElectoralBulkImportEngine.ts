import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import fs from "fs";
import zlib from "zlib";
import { parse } from "csv-parse";
import path from "path";
import crypto from "crypto";

export interface ImportJobConfig {
  filePath: string;
  organizationId?: string;
  projectId?: string;
  uf?: string;
  anoEleitoral?: number;
  dryRun?: boolean;
  batchSize?: number;
}

export class ElectoralBulkImportEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async startImport(config: ImportJobConfig): Promise<any> {
    const importRunId = "run_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const batchSize = config.batchSize || 5000;
    const isDryRun = !!config.dryRun;

    const sourceFileName = path.basename(config.filePath);

    // Create job record
    const job = await this.dbAdapter.createElectoralImportJob({
      organizationId: config.organizationId,
      projectId: config.projectId,
      importRunId,
      sourceFileName,
      sourceFilePath: config.filePath,
      uf: config.uf,
      anoEleitoral: config.anoEleitoral,
      status: "PENDING",
      totalRows: 0,
      processedRows: 0,
      insertedRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      metadata: { isDryRun, batchSize }
    });

    // Start background processing
    this.processFile(job.id, config, importRunId, batchSize, isDryRun).catch(e => {
        console.error("Import failed:", e);
    });

    return job;
  }

  private async processFile(jobId: string, config: ImportJobConfig, importRunId: string, batchSize: number, dryRun: boolean) {
    await this.dbAdapter.updateElectoralImportJob(jobId, { status: "RUNNING", startedAt: new Date().toISOString() });

    let processedCount = 0;
    let insertedCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let batch: any[] = [];
    const seenRecords = new Set<string>();

    const isGzip = config.filePath.toLowerCase().endsWith(".gz");

    return new Promise<void>((resolve, reject) => {
      const fileStream = fs.createReadStream(config.filePath);
      fileStream.on('error', async (error: any) => {
          await this.failJob(jobId, error.message);
          reject(error);
      });

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        delimiter: [',', ';'] // auto detect common delimiters
      });

      const stream = isGzip ? fileStream.pipe(zlib.createGunzip()) : fileStream;
      
      stream.on('error', async (error: any) => {
        await this.failJob(jobId, error.message);
        reject(error);
      });

      stream.pipe(parser)
        .on('data', async (row) => {
          processedCount++;

          const normalized = this.normalizeAndValidateRow(row, config, importRunId);

          if (!normalized.valid) {
             invalidCount++;
             if (!dryRun) {
                 parser.pause();
                 await this.dbAdapter.createElectoralImportRowError({
                     importJobId: jobId,
                     rowNumber: processedCount,
                     rawData: row,
                     errorMessage: normalized.error
                 });
                 parser.resume();
             }
             return;
          }

          // Deduplication
          const d = normalized.data;
          const dedupKey = `${d.importRunId}|${d.anoEleitoral}|${d.uf}|${d.municipio}|${d.zona}|${d.cargo}|${d.nome}|${d.numeroVotavel}|${d.localVotacao}|${d.turno}|${d.suplementar}`;
          if (seenRecords.has(dedupKey)) {
             duplicateCount++;
             return; // Skip duplicate
          }
          seenRecords.add(dedupKey);

          if (!dryRun) {
              batch.push(normalized.data);
              if (batch.length >= batchSize) {
                  parser.pause();
                  try {
                      // Insert batch
                      await this.dbAdapter.bulkCreateElectoralHistoricalResults(batch);
                      insertedCount += batch.length;
                      
                      // Update job progress
                      await this.dbAdapter.updateElectoralImportJob(jobId, {
                          processedRows: processedCount,
                          insertedRows: insertedCount,
                          invalidRows: invalidCount,
                          duplicateRows: duplicateCount
                      });
                  } catch (e: any) {
                      // Mark job as partial or failed
                      await this.failJob(jobId, "Batch insert failed: " + e.message);
                      reject(e);
                      return;
                  }
                  batch = [];
                  parser.resume();
              }
          }
        })
        .on('end', async () => {
          if (!dryRun && batch.length > 0) {
            try {
                await this.dbAdapter.bulkCreateElectoralHistoricalResults(batch);
                insertedCount += batch.length;
            } catch (e: any) {
                await this.failJob(jobId, "Final batch insert failed: " + e.message);
                reject(e);
                return;
            }
          }

          const finalStatus = invalidCount > 0 ? "PARTIAL" : "COMPLETED";
          await this.dbAdapter.updateElectoralImportJob(jobId, {
            status: dryRun ? "COMPLETED" : finalStatus, 
            totalRows: processedCount,
            processedRows: processedCount,
            insertedRows: insertedCount,
            invalidRows: invalidCount,
            duplicateRows: duplicateCount,
            completedAt: new Date().toISOString()
          });
          resolve();
        });
    });
  }

  private normalizeAndValidateRow(row: any, config: ImportJobConfig, importRunId: string): { valid: boolean, data?: any, error?: string } {
    // Expected incoming columns: ANO_ELEITORAL, UF, MUNICIPIO, ZONA, CARGO, NOME, PARTIDO, NUMERO_VOTAVEL, LOCAL_VOTACAO, ENDERECO_LOCAL, QT_VOTOS, TURNO, SUPLEMENTAR
    
    const tryKey = (keys: string[]) => {
      for(const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
      }
      return undefined;
    };

    const anoRaw = tryKey(["ANO_ELEITORAL", "ano_eleitoral"]);
    const ufRaw = tryKey(["UF", "uf"]);
    const munRaw = tryKey(["MUNICIPIO", "municipio"]);
    const zonaRaw = tryKey(["ZONA", "zona"]);
    const cargoRaw = tryKey(["CARGO", "cargo"]);
    const nomeRaw = tryKey(["NOME", "nome"]);
    const partidoRaw = tryKey(["PARTIDO", "partido"]);
    const numRaw = tryKey(["NUMERO_VOTAVEL", "numero_votavel"]);
    const localRaw = tryKey(["LOCAL_VOTACAO", "local_votacao"]);
    const endRaw = tryKey(["ENDERECO_LOCAL", "endereco_local"]);
    const qtRaw = tryKey(["QT_VOTOS", "qt_votos", "votos"]);
    const turnoRaw = tryKey(["TURNO", "turno"]);
    const supRaw = tryKey(["SUPLEMENTAR", "suplementar"]);

    // Defaults based on job config if row is missing it
    const ano = anoRaw ? Number(anoRaw) : config.anoEleitoral;
    const uf = ufRaw ? String(ufRaw).trim().toUpperCase() : config.uf;
    const municipio = munRaw ? String(munRaw).trim() : null;
    const cargo = cargoRaw ? String(cargoRaw).trim() : null;
    const nome = nomeRaw ? String(nomeRaw).trim() : null;
    const qt_votos = qtRaw ? Number(qtRaw) : null;

    if (!ano) return { valid: false, error: "Missing required field: ano_eleitoral" };
    if (!uf) return { valid: false, error: "Missing required field: uf" };
    if (!municipio) return { valid: false, error: "Missing required field: municipio" };
    if (!cargo) return { valid: false, error: "Missing required field: cargo" };
    if (!nome) return { valid: false, error: "Missing required field: nome" };
    if (qt_votos === null || isNaN(qt_votos)) return { valid: false, error: "Missing or invalid required field: qt_votos" };

    const parsedSuplementar = supRaw === true || supRaw === "true" || supRaw === "1" || supRaw === "S" || supRaw === "SIM";

    const hashStr = [
       ano, uf, municipio, zonaRaw || "", cargo, nome, numRaw || "", partidoRaw || "", localRaw || "", turnoRaw || "", parsedSuplementar
    ].map(String).join("|").toUpperCase();
    
    const recordHash = crypto.createHash('md5').update(hashStr).digest('hex');

    return {
      valid: true,
      data: {
        organizationId: config.organizationId,
        projectId: config.projectId,
        anoEleitoral: ano,
        uf,
        municipio,
        zona: zonaRaw ? String(zonaRaw).trim() : null,
        cargo,
        nome,
        partido: partidoRaw ? String(partidoRaw).trim() : null,
        numeroVotavel: numRaw ? String(numRaw).trim() : null,
        localVotacao: localRaw ? String(localRaw).trim() : null,
        enderecoLocal: endRaw ? String(endRaw).trim() : null,
        qtVotos: qt_votos,
        turno: turnoRaw ? Number(turnoRaw) : null,
        suplementar: parsedSuplementar,
        importRunId,
        recordHash
      }
    };
  }

  private async failJob(jobId: string, errorMessage: string) {
      await this.dbAdapter.updateElectoralImportJob(jobId, {
          status: "FAILED",
          errorMessage,
          completedAt: new Date().toISOString()
      });
  }

}
