import type { RadarConnector, RadarConnectorExecutionContext, RadarConnectorExecutionResult } from './RadarConnector';
import type { RadarSyncRunMetrics } from '../../../src/core/commercial/connectors/RadarConnectorTypes';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const DEFAULT_MODALITY_CODES = [4, 5, 6, 7, 8, 9, 12];
const MAX_DATE_RANGE_DAYS = 7;
const DEFAULT_LOOKBACK_DAYS = 2;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES_PER_MODALITY = 2;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

interface PncpPageResponse {
  data?: unknown[];
  totalRegistros?: number;
  totalPaginas?: number;
  numeroPagina?: number;
  paginasRestantes?: number;
  empty?: boolean;
}

const emptyMetrics = (): RadarSyncRunMetrics => ({ received: 0, normalized: 0, created: 0, updated: 0, duplicates: 0, ignored: 0, rejected: 0, failures: 0 });

export class PncpRadarConnector implements RadarConnector {
  readonly descriptor = {
    id: 'pncp',
    sourceId: 'pncp',
    label: 'PNCP',
    description: 'Consulta pública oficial de contratações publicadas no Portal Nacional de Contratações Públicas.',
    status: 'available' as const,
    supportsIncremental: true,
    supportsPagination: true,
    available: true,
    defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
    documentationUrl: 'https://pncp.gov.br/api/consulta/swagger-ui/index.html',
  };

  async execute(context: RadarConnectorExecutionContext): Promise<RadarConnectorExecutionResult> {
    const dateTo = parseDate(context.options.dateTo) || startOfToday();
    const requestedFrom = parseDate(context.options.dateFrom) || addDays(dateTo, -DEFAULT_LOOKBACK_DAYS);
    const dateFrom = clampDateRange(requestedFrom, dateTo, MAX_DATE_RANGE_DAYS);
    const pageSize = clampInteger(context.options.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const maxPages = clampInteger(context.options.maxPages, 1, 10, DEFAULT_MAX_PAGES_PER_MODALITY);
    const modalityCodes = resolveModalityCodes();
    const metrics = emptyMetrics();
    const warnings: string[] = [];

    for (const modalityCode of modalityCodes) {
      for (let page = 1; page <= maxPages; page += 1) {
        let response: PncpPageResponse;
        try {
          response = await this.fetchPage({ dateFrom, dateTo, modalityCode, page, pageSize });
        } catch (error: any) {
          metrics.failures += 1;
          warnings.push(`Modalidade ${modalityCode}, página ${page}: ${error?.message || 'falha na consulta ao PNCP'}`);
          break;
        }

        const records = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];
        metrics.received += records.length;

        for (const record of records) {
          try {
            const result = await context.onRecord(record);
            metrics.normalized += result === 'rejected' ? 0 : 1;
            if (result === 'created') metrics.created += 1;
            else if (result === 'updated') metrics.updated += 1;
            else if (result === 'duplicate') metrics.duplicates += 1;
            else if (result === 'ignored') metrics.ignored += 1;
            else metrics.rejected += 1;
          } catch (error: any) {
            metrics.failures += 1;
            warnings.push(`Registro rejeitado durante persistência: ${error?.message || 'erro não identificado'}`);
          }
        }

        const totalPages = Number(response.totalPaginas || 0);
        const pagesRemaining = Number(response.paginasRestantes || 0);
        const hasMore = records.length === pageSize || pagesRemaining > 0 || (totalPages > 0 && page < totalPages);
        if (!hasMore || records.length === 0) break;
      }
    }

    return {
      metrics,
      warnings: unique(warnings).slice(0, 50),
      cursorAfter: JSON.stringify({ dateFrom: formatDate(dateFrom), dateTo: formatDate(dateTo), synchronizedAt: new Date().toISOString() }),
    };
  }

  private async fetchPage(input: { dateFrom: Date; dateTo: Date; modalityCode: number; page: number; pageSize: number }): Promise<PncpPageResponse> {
    const url = new URL(PNCP_BASE_URL);
    url.searchParams.set('dataInicial', formatDate(input.dateFrom));
    url.searchParams.set('dataFinal', formatDate(input.dateTo));
    url.searchParams.set('codigoModalidadeContratacao', String(input.modalityCode));
    url.searchParams.set('pagina', String(input.page));
    url.searchParams.set('tamanhoPagina', String(input.pageSize));

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'Beta-Platform-Radar/1.0' },
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.text()).slice(0, 300);
          throw new Error(`PNCP respondeu HTTP ${response.status}${body ? `: ${body}` : ''}`);
        }
        return await response.json() as PncpPageResponse;
      } catch (error: any) {
        lastError = new Error(error?.name === 'AbortError' ? 'tempo limite excedido na consulta ao PNCP' : error?.message || 'falha de rede');
        if (attempt < MAX_RETRIES) await delay(500 * (attempt + 1));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('falha na consulta ao PNCP');
  }
}

function resolveModalityCodes(): number[] {
  const configured = String(process.env.PNCP_MODALITY_CODES || '').split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0);
  return configured.length ? Array.from(new Set(configured)) : DEFAULT_MODALITY_CODES;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  const date = new Date(`${normalized.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function clampDateRange(dateFrom: Date, dateTo: Date, maxDays: number): Date {
  const earliest = addDays(dateTo, -maxDays);
  return dateFrom < earliest ? earliest : dateFrom > dateTo ? dateTo : dateFrom;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value as number)));
}

function unique(values: string[]): string[] { return Array.from(new Set(values)); }
function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
