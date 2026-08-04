import type { RadarConnector, RadarConnectorExecutionContext, RadarConnectorExecutionResult } from './RadarConnector';
import type { RadarConnectorDescriptor, RadarSyncRunMetrics } from '../../../src/core/commercial/connectors/RadarConnectorTypes';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
const DEFAULT_MODALITY_CODES = [4, 5, 6, 7, 8, 9, 12];
const MAX_DATE_RANGE_DAYS = 7;
const DEFAULT_LOOKBACK_DAYS = 2;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const DEFAULT_MAX_PAGES_PER_MODALITY = 2;
const REQUEST_TIMEOUTS_MS = [30_000, 60_000, 90_000] as const;
const MIN_REQUEST_INTERVAL_MS = 2_000;
const MAX_REQUEST_INTERVAL_MS = 30_000;
const TRANSIENT_HTTP_STATUSES = new Set([429, 502, 503, 504]);
let nextAllowedRequestAt = 0;
let adaptiveRequestIntervalMs = MIN_REQUEST_INTERVAL_MS;

interface PncpPageResponse {
  data?: unknown[];
  totalRegistros?: number;
  totalPaginas?: number;
  numeroPagina?: number;
  paginasRestantes?: number;
  empty?: boolean;
}

class PncpTemporaryUnavailableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'PncpTemporaryUnavailableError';
  }
}

const emptyMetrics = (): RadarSyncRunMetrics => ({
  received: 0,
  normalized: 0,
  created: 0,
  updated: 0,
  duplicates: 0,
  ignored: 0,
  rejected: 0,
  failures: 0,
});

export class PncpRadarConnector implements RadarConnector {
  readonly descriptor: RadarConnectorDescriptor = {
    id: 'pncp',
    sourceId: 'pncp',
    label: 'PNCP',
    description: 'Consulta pública oficial de contratações publicadas no Portal Nacional de Contratações Públicas.',
    status: 'available' as const,
    supportsIncremental: true,
    supportsPagination: true,
    available: true,
    authPolicy: 'PUBLIC_NO_AUTH',
    defaultLookbackDays: DEFAULT_LOOKBACK_DAYS,
    documentationUrl: 'https://pncp.gov.br/api/consulta/swagger-ui/index.html',
  };

  async execute(context: RadarConnectorExecutionContext): Promise<RadarConnectorExecutionResult> {
    const cursorRange = parseCursorRange(context.options.cursorBefore);
    const dateTo = parseDate(context.options.dateTo) || parseDate(cursorRange?.dateTo) || startOfToday();
    const requestedFrom = parseDate(context.options.dateFrom) || parseDate(cursorRange?.dateFrom) || addDays(dateTo, -DEFAULT_LOOKBACK_DAYS);
    const dateFrom = clampDateRange(requestedFrom, dateTo, MAX_DATE_RANGE_DAYS);
    const pageSize = clampInteger(context.options.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const maxPages = clampInteger(context.options.maxPages, 1, 10, DEFAULT_MAX_PAGES_PER_MODALITY);
    const modalityCodes = resolveModalityCodes();
    const dateWindows = buildDailyWindows(dateFrom, dateTo);
    const resumePoint = parseResumePoint(context.options.cursorBefore, dateFrom, dateTo, modalityCodes, maxPages);
    const metrics = emptyMetrics();
    const warnings: string[] = [];
    let lastCompletedWindow: { date: string; modalityCode: number; page: number } | undefined;

    if (resumePoint) {
      warnings.push(`Execução retomada de ${formatDisplayDate(parseCursorDate(resumePoint.date))}, modalidade ${resumePoint.modalityCode}, página ${resumePoint.page}.`);
    }

    for (const window of dateWindows) {
      for (const modalityCode of modalityCodes) {
        const firstPage = resolveFirstPage(window, modalityCode, resumePoint);
        if (firstPage === undefined) continue;
        for (let page = firstPage; page <= maxPages; page += 1) {
          let response: PncpPageResponse;
          try {
            response = await this.fetchPage({
              dateFrom: window,
              dateTo: window,
              modalityCode,
              page,
              pageSize,
            });
          } catch (error: any) {
            metrics.failures += 1;

            if (error instanceof PncpTemporaryUnavailableError) {
              const statusLabel = error.status ? `HTTP ${error.status}` : 'tempo limite';
              const warning = `PNCP indisponível temporariamente (${statusLabel}). A sincronização foi interrompida sem apagar os dados já importados. Tente novamente mais tarde.`;
              warnings.push(warning);
              console.warn('[PNCP] Sincronização interrompida por indisponibilidade externa.', {
                date: formatDate(window),
                modalityCode,
                page,
                status: error.status,
                message: error.message,
              });
              return buildResult(metrics, warnings, dateFrom, dateTo, lastCompletedWindow, {
                interruptedAt: { date: formatDate(window), modalityCode, page },
                reason: error.message,
              });
            }

            warnings.push(`Modalidade ${modalityCode}, data ${formatDisplayDate(window)}, página ${page}: ${error?.message || 'falha na consulta ao PNCP'}`);
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

          lastCompletedWindow = { date: formatDate(window), modalityCode, page };

          const totalPages = Number(response.totalPaginas || 0);
          const pagesRemaining = Number(response.paginasRestantes || 0);
          const hasMore = records.length === pageSize || pagesRemaining > 0 || (totalPages > 0 && page < totalPages);
          if (!hasMore || records.length === 0) break;
        }
      }
    }

    return buildResult(metrics, warnings, dateFrom, dateTo, lastCompletedWindow);
  }

  private async fetchPage(input: { dateFrom: Date; dateTo: Date; modalityCode: number; page: number; pageSize: number }): Promise<PncpPageResponse> {
    const url = new URL(PNCP_BASE_URL);
    url.searchParams.set('dataInicial', formatDate(input.dateFrom));
    url.searchParams.set('dataFinal', formatDate(input.dateTo));
    url.searchParams.set('codigoModalidadeContratacao', String(input.modalityCode));
    url.searchParams.set('pagina', String(input.page));
    url.searchParams.set('tamanhoPagina', String(input.pageSize));

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < REQUEST_TIMEOUTS_MS.length; attempt += 1) {
      const controller = new AbortController();
      const timeoutMs = REQUEST_TIMEOUTS_MS[attempt];
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        await respectRequestInterval();
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'Beta-Platform-Radar/1.0' },
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.text()).slice(0, 300);
          const normalizedBody = stripHtml(body);

          if (TRANSIENT_HTTP_STATUSES.has(response.status)) {
            const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
            registerTransientFailure(response.status, retryAfterMs);
            throw new PncpTemporaryUnavailableError(
              `PNCP respondeu HTTP ${response.status}${normalizedBody ? `: ${normalizedBody}` : ''}`,
              response.status,
              retryAfterMs,
            );
          }

          throw new Error(`PNCP respondeu HTTP ${response.status}${normalizedBody ? `: ${normalizedBody}` : ''}`);
        }

        registerSuccessfulRequest();
        return await response.json() as PncpPageResponse;
      } catch (error: any) {
        const normalizedError = error?.name === 'AbortError'
          ? new PncpTemporaryUnavailableError(`tempo limite de ${Math.round(timeoutMs / 1_000)} segundos excedido na consulta ao PNCP`)
          : error;

        lastError = normalizedError instanceof Error ? normalizedError : new Error(normalizedError?.message || 'falha de rede');

        if (attempt < REQUEST_TIMEOUTS_MS.length - 1) {
          await delay(resolveRetryDelay(normalizedError, attempt));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new PncpTemporaryUnavailableError('falha temporária na consulta ao PNCP');
  }
}

function buildResult(
  metrics: RadarSyncRunMetrics,
  warnings: string[],
  dateFrom: Date,
  dateTo: Date,
  lastCompletedWindow?: { date: string; modalityCode: number; page: number },
  interruption?: { interruptedAt: { date: string; modalityCode: number; page: number }; reason: string },
): RadarConnectorExecutionResult {
  return {
    metrics,
    warnings: unique(warnings).slice(0, 50),
    cursorAfter: JSON.stringify({
      dateFrom: formatDate(dateFrom),
      dateTo: formatDate(dateTo),
      lastCompletedWindow,
      ...interruption,
      synchronizedAt: new Date().toISOString(),
    }),
  };
}

function buildDailyWindows(dateFrom: Date, dateTo: Date): Date[] {
  const windows: Date[] = [];
  for (let current = new Date(dateTo); current >= dateFrom; current = addDays(current, -1)) {
    windows.push(new Date(current));
  }
  return windows;
}

function resolveModalityCodes(): number[] {
  const configured = String(process.env.PNCP_MODALITY_CODES || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
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

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value as number)));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveRetryDelay(error: any, attempt: number): number {
  if (Number.isFinite(error?.retryAfterMs)) return clampRetryDelay(Number(error.retryAfterMs));
  if (error?.status === 429) return [15_000, 30_000, 60_000][attempt] || 60_000;
  return [10_000, 20_000, 45_000][attempt] || 45_000;
}

async function respectRequestInterval(): Promise<void> {
  const waitMs = Math.max(0, nextAllowedRequestAt - Date.now());
  if (waitMs > 0) await delay(waitMs);
  nextAllowedRequestAt = Date.now() + adaptiveRequestIntervalMs;
}

function registerTransientFailure(status?: number, retryAfterMs?: number): void {
  const requestedDelay = Number.isFinite(retryAfterMs) ? clampRetryDelay(Number(retryAfterMs)) : 0;
  const multiplier = status === 429 ? 2.5 : 1.5;
  adaptiveRequestIntervalMs = Math.min(
    MAX_REQUEST_INTERVAL_MS,
    Math.max(MIN_REQUEST_INTERVAL_MS, requestedDelay, Math.ceil(adaptiveRequestIntervalMs * multiplier)),
  );
  nextAllowedRequestAt = Math.max(nextAllowedRequestAt, Date.now() + Math.max(adaptiveRequestIntervalMs, requestedDelay));
}

function registerSuccessfulRequest(): void {
  adaptiveRequestIntervalMs = Math.max(MIN_REQUEST_INTERVAL_MS, adaptiveRequestIntervalMs - 500);
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return clampRetryDelay(seconds * 1_000);
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return clampRetryDelay(Math.max(0, dateMs - Date.now()));
  return undefined;
}

function clampRetryDelay(value: number): number {
  return Math.min(120_000, Math.max(1_000, Math.trunc(value)));
}

interface PncpCursorRange {
  dateFrom?: string;
  dateTo?: string;
}

function parseCursorRange(cursorBefore?: string): PncpCursorRange | undefined {
  if (!cursorBefore) return undefined;
  try {
    const cursor = JSON.parse(cursorBefore);
    return {
      dateFrom: typeof cursor?.dateFrom === 'string' ? cursor.dateFrom : undefined,
      dateTo: typeof cursor?.dateTo === 'string' ? cursor.dateTo : undefined,
    };
  } catch {
    return undefined;
  }
}

interface PncpResumePoint {
  date: string;
  modalityCode: number;
  page: number;
}

function parseResumePoint(
  cursorBefore: string | undefined,
  dateFrom: Date,
  dateTo: Date,
  modalityCodes: number[],
  maxPages: number,
): PncpResumePoint | undefined {
  if (!cursorBefore) return undefined;
  try {
    const cursor = JSON.parse(cursorBefore);
    const interrupted = cursor?.interruptedAt;
    if (!interrupted) return undefined;
    if (cursor.dateFrom !== formatDate(dateFrom) || cursor.dateTo !== formatDate(dateTo)) return undefined;
    const point = {
      date: String(interrupted.date || ''),
      modalityCode: Number(interrupted.modalityCode),
      page: Number(interrupted.page),
    };
    if (!/^\d{8}$/.test(point.date)) return undefined;
    if (!modalityCodes.includes(point.modalityCode)) return undefined;
    if (!Number.isInteger(point.page) || point.page < 1 || point.page > maxPages) return undefined;
    return point;
  } catch {
    return undefined;
  }
}

function resolveFirstPage(window: Date, modalityCode: number, resumePoint?: PncpResumePoint): number | undefined {
  if (!resumePoint) return 1;
  const windowKey = formatDate(window);
  if (windowKey > resumePoint.date) return undefined;
  if (windowKey < resumePoint.date) return 1;
  if (modalityCode < resumePoint.modalityCode) return undefined;
  if (modalityCode > resumePoint.modalityCode) return 1;
  return resumePoint.page;
}

function parseCursorDate(value: string): Date {
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`);
}
