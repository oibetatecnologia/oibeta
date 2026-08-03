import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { execFile } from 'child_process';
import util from 'util';
import AdmZip from 'adm-zip';
import { PDFParse } from 'pdf-parse';

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';
import csvParser from 'csv-parser';

const execFileAsync = util.promisify(execFile);

export class DataPreviewEngine {
  public async generatePreview(fileProps: any): Promise<any> {
    const { filename, storagePath } = fileProps;
    if (!fs.existsSync(storagePath)) {
      return { error: "File not found on disk." };
    }

    const ext = filename.split('.').pop()?.toLowerCase();

    try {
      switch (ext) {
        case 'csv':
          return await this.realCsvPreview(storagePath);
        case 'xlsx':
          return await this.realXlsxPreview(storagePath);
        case 'pdf':
          return await this.realPdfPreview(storagePath);
        case 'docx':
          return await this.realDocxPreview(storagePath);
        case 'zip':
          return await this.realZipPreview(storagePath);
        case 'json':
          return await this.realJsonPreview(storagePath);
        case 'xml':
          return await this.realXmlPreview(storagePath);
        case 'html':
        case 'htm':
          return await this.realHtmlPreview(storagePath);
        case 'txt':
          const text = fs.readFileSync(storagePath, 'utf8');
          return { type: "text", summary: "Documento de texto detectado.", size: text.length };
        default:
          return { type: "unknown", summary: "Tipo de arquivo não suportado para extração avançada." };
      }
    } catch (e: any) {
      console.error("Preview error:", e);
      return { type: "error", summary: `Falha ao processar arquivo: ${e.message}` };
    }
  }

  private async tryPythonWorker(action: string, filePath: string, args: any = {}): Promise<any> {
    try {
      const scriptPath = path.join(process.cwd(), 'workers', 'python', 'data_worker.py');
      if (fs.existsSync(scriptPath)) {
        const payload = JSON.stringify({ action, file_path: filePath, ...args });
        const { stdout } = await execFileAsync('python3', [scriptPath, payload]);
        const res = JSON.parse(stdout);
        if (!res.error) return res;
      }
    } catch (e) {
      console.warn("Python worker failed or unavailable, falling back to Node");
    }
    return null;
  }

  private async realCsvPreview(storagePath: string): Promise<any> {
    // Attempt python first for robustness or fall back to node
    const pyRes = await this.tryPythonWorker("preview_csv", storagePath);
    if (pyRes && !pyRes.error) return pyRes;

    // Node fallback
    return new Promise((resolve) => {
      const results: any[] = [];
      let headers: string[] = [];
      let bytesRead = 0;
      let lineCount = 0;
      
      const stream = fs.createReadStream(storagePath)
        .pipe(csvParser())
        .on('headers', (h) => headers = h)
        .on('data', (data) => {
          lineCount++;
          if (results.length < 5) results.push(data);
          bytesRead += JSON.stringify(data).length; // rough
        })
        .on('end', async () => {
          // Use exact row count from python worker if possible
          let exactRows = lineCount;
          const pyCount = await this.tryPythonWorker("count_csv_rows", storagePath);
          if (pyCount && pyCount.status === "success") {
             exactRows = pyCount.count;
          } else {
             const stats = fs.statSync(storagePath);
             const avgLineSize = bytesRead / (lineCount || 1);
             const est_rows = avgLineSize > 0 ? Math.floor(stats.size / avgLineSize) : lineCount;
             exactRows = est_rows > lineCount ? est_rows : lineCount;
          }

          resolve({
            type: "spreadsheet",
            estimatedRows: exactRows,
            columnsCount: headers.length,
            separator: ",",
            encoding: "UTF-8",
            columns: headers,
            sample: results.slice(0, 5),
            notice: "Tabela CSV identificada."
          });
        })
        .on('error', () => {
          resolve({ error: "Failed to parse CSV" });
        });
    });
  }

  private async realXlsxPreview(storagePath: string): Promise<any> {
    const pyRes = await this.tryPythonWorker("preview_xlsx", storagePath);
    if (pyRes && !pyRes.error) return pyRes;

    const workbook = xlsx.readFile(storagePath);
    const tabs = workbook.SheetNames;
    const firstSheet = workbook.Sheets[tabs[0]];
    const jsonData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
    
    // Extracted headers
    const headers = (jsonData[0] as any[]) || [];
    const sampleRows = jsonData.slice(1, 6).map((row: any) => {
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    return {
      type: "spreadsheet",
      estimatedRows: jsonData.length - 1,
      tabs: tabs,
      columnsCount: headers.length,
      columns: headers.map(String),
      sample: sampleRows,
      notice: `Planilha Excel identificada com ${tabs.length} abas.`
    };
  }

  private async realPdfPreview(storagePath: string): Promise<any> {
    const dataBuffer = fs.readFileSync(storagePath);
    const parser = new PDFParse({ data: dataBuffer });

    try {
      const [textResult, infoResult] = await Promise.all([
        parser.getText(),
        parser.getInfo(),
      ]);

      return {
        type: "pdf",
        pages: textResult.total,
        summary: "Documento PDF detectado. A extração de texto estruturada foi concluída.",
        metadata: infoResult.info,
        sampleText: textResult.text.substring(0, 1000),
        fullText: textResult.text
      };
    } finally {
      await parser.destroy();
    }
  }

  private async realDocxPreview(storagePath: string): Promise<any> {
    const result = await mammoth.extractRawText({ path: storagePath });
    const text = result.value;
    return {
      type: "docx",
      summary: "Documento Word detectado.",
      sampleText: text.substring(0, 1000),
      fullText: text
    };
  }

  private async realZipPreview(storagePath: string): Promise<any> {
    const zip = new AdmZip(storagePath);
    const entries = zip.getEntries();
    const files = entries.map(e => ({ name: e.entryName, isDirectory: e.isDirectory, size: e.header.size }));
    return {
      type: "archive",
      summary: `Arquivo ZIP detectado com ${files.length} itens.`,
      files: files.slice(0, 50) // only list up to 50
    };
  }

  private async realJsonPreview(storagePath: string): Promise<any> {
    const content = fs.readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(content);
    const isArray = Array.isArray(parsed);
    const keys = isArray ? (parsed.length > 0 ? Object.keys(parsed[0]) : []) : Object.keys(parsed);
    return {
      type: "json",
      summary: "Estrutura JSON válida detectada.",
      isArray,
      elements: isArray ? parsed.length : 1,
      keys: keys.slice(0, 20),
      fullText: content
    };
  }

  private async realXmlPreview(storagePath: string): Promise<any> {
    const content = fs.readFileSync(storagePath, 'utf8');
    const result = await parseStringPromise(content);
    const rootKeys = Object.keys(result);
    return {
      type: "xml",
      summary: "Estrutura XML válida detectada.",
      rootTags: rootKeys,
      fullText: content
    };
  }

  private async realHtmlPreview(storagePath: string): Promise<any> {
    const content = fs.readFileSync(storagePath, 'utf8');
    const $ = cheerio.load(content);
    const title = $('title').text();
    const linkCount = $('a').length;
    const tableCount = $('table').length;
    const cleanText = $('body').text().replace(/\s+/g, ' ');
    return {
      type: "html",
      summary: "Arquivo HTML.",
      title,
      linkCount,
      tableCount,
      textSample: cleanText.substring(0, 500),
      fullText: cleanText
    };
  }
}