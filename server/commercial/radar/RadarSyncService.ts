import crypto from 'node:crypto';
import type { DatabaseAdapter } from '../../database/DatabaseAdapter';
import type { CommercialOpportunity } from '../../../src/core/commercial/OpportunityTypes';
import { analyzeOpportunity } from '../../../src/core/commercial/OpportunityAnalyzer';
import type { RadarSyncRun, RadarSyncRunMetrics, RadarSyncRunRequest } from '../../../src/core/commercial/connectors/RadarConnectorTypes';
import { RadarConnectorRegistry } from './RadarConnectorRegistry';
import { buildImportedOpportunity, mapPncpRecord } from './PncpOpportunityMapper';

const activeRuns = new Set<string>();
const STALE_RUN_AFTER_MS = 15 * 60_000;
const emptyMetrics = (): RadarSyncRunMetrics => ({ received: 0, normalized: 0, created: 0, updated: 0, duplicates: 0, ignored: 0, rejected: 0, failures: 0 });

export class RadarSyncService {
  constructor(private readonly db: DatabaseAdapter) {}

  listConnectors() {
    return RadarConnectorRegistry.list();
  }

  async listRuns(organizationId: string, workspaceId?: string) {
    const runs = await this.db.getCommercialRadarSyncRuns(organizationId, workspaceId);
    const now = Date.now();

    for (const run of runs) {
      if (run.status !== 'running') continue;
      const startedAt = new Date(run.startedAt).getTime();
      if (!Number.isFinite(startedAt) || now - startedAt <= STALE_RUN_AFTER_MS) continue;

      const finishedAt = new Date().toISOString();
      await this.db.updateCommercialRadarSyncRun(run.id, organizationId, workspaceId, {
        status: 'failed',
        finishedAt,
        updatedAt: finishedAt,
        errors: [...run.errors, 'Execução encerrada automaticamente porque permaneceu ativa além do tempo máximo esperado.'],
      });
    }

    return this.db.getCommercialRadarSyncRuns(organizationId, workspaceId);
  }

  async start(input: { organizationId: string; workspaceId?: string; connectorId: string; initiatedBy?: string; options?: RadarSyncRunRequest }): Promise<RadarSyncRun> {
    const connector = RadarConnectorRegistry.get(input.connectorId);
    if (!connector) throw new Error('Radar connector not found');

    const lockKey = `${input.organizationId}:${input.workspaceId || '*'}:${connector.id}`;
    const persistedRuns = await this.listRuns(input.organizationId, input.workspaceId);
    const persistedActiveRun = persistedRuns.find((run) => run.connectorId === connector.id && run.status === 'running');

    if (activeRuns.has(lockKey) || persistedActiveRun) {
      if (persistedActiveRun) return persistedActiveRun;
      throw new Error('A synchronization for this connector is already running');
    }

    const now = new Date().toISOString();
    const base: RadarSyncRun = {
      id: crypto.randomUUID(), organizationId: input.organizationId, workspaceId: input.workspaceId,
      connectorId: connector.id, sourceId: connector.sourceId, status: 'running', startedAt: now,
      metrics: emptyMetrics(), warnings: [], errors: [], initiatedBy: input.initiatedBy,
      createdAt: now, updatedAt: now,
    };
    const created = await this.db.createCommercialRadarSyncRun(base);

    activeRuns.add(lockKey);
    void this.executeRun(created, input, lockKey).catch((error) => {
      console.error('[RadarSync] Background execution failed:', error);
    });

    return created;
  }

  private async executeRun(
    base: RadarSyncRun,
    input: { organizationId: string; workspaceId?: string; connectorId: string; initiatedBy?: string; options?: RadarSyncRunRequest },
    lockKey: string,
  ): Promise<void> {
    const connector = RadarConnectorRegistry.get(input.connectorId);
    try {
      const adapter = RadarConnectorRegistry.getAdapter(input.connectorId);
      if (!connector?.available || !adapter) {
        const finishedAt = new Date().toISOString();
        await this.db.updateCommercialRadarSyncRun(base.id, input.organizationId, input.workspaceId, {
          status: 'failed', finishedAt, updatedAt: finishedAt,
          errors: [connector?.unavailableReason || 'Connector unavailable'],
        });
        return;
      }

      const current = await this.db.getCommercialOpportunities(input.organizationId, input.workspaceId) as CommercialOpportunity[];
      const bySourceExternalId = new Map(current.filter((item) => item.sourceId && item.externalId).map((item) => [`${item.sourceId}:${item.externalId}`, item]));

      const result = await adapter.execute({
        options: input.options || {},
        onRecord: async (record) => {
          const normalized = connector.id === 'pncp' ? mapPncpRecord(record) : undefined;
          if (!normalized) return 'rejected';

          const sourceKey = `${normalized.sourceId}:${normalized.externalId}`;
          const existing = bySourceExternalId.get(sourceKey);
          if (existing) {
            const unchanged = existing.sourceHash === normalized.sourceHash && existing.sourceUpdatedAt === normalized.sourceUpdatedAt;
            if (unchanged) return 'ignored';
            const analysisBase = { ...existing, ...normalized, updatedAt: new Date().toISOString() } as CommercialOpportunity;
            const updated = await this.db.updateCommercialOpportunity(existing.id, input.organizationId, input.workspaceId, {
              ...normalized,
              priority: resolvePriority(normalized.submissionDeadline),
              analysis: analyzeOpportunity(analysisBase),
            });
            bySourceExternalId.set(sourceKey, updated);
            return 'updated';
          }

          const imported = buildImportedOpportunity(normalized, input.organizationId, input.workspaceId, current);
          const created = await this.db.createCommercialOpportunity(imported);
          current.unshift(created);
          bySourceExternalId.set(sourceKey, created);
          return imported.probableDuplicateOf ? 'duplicate' : 'created';
        },
      });

      const finishedAt = new Date().toISOString();
      const hasWarnings = result.warnings.length > 0 || result.metrics.failures > 0 || result.metrics.rejected > 0;
      await this.db.updateCommercialRadarSyncRun(base.id, input.organizationId, input.workspaceId, {
        status: hasWarnings ? 'completed_with_warnings' : 'completed',
        finishedAt,
        updatedAt: finishedAt,
        cursorAfter: result.cursorAfter,
        metrics: result.metrics,
        warnings: result.warnings,
      });
    } catch (error: any) {
      const finishedAt = new Date().toISOString();
      await this.db.updateCommercialRadarSyncRun(base.id, input.organizationId, input.workspaceId, {
        status: 'failed', finishedAt, updatedAt: finishedAt,
        errors: [error?.message || 'Unexpected synchronization failure'],
      });
    } finally {
      activeRuns.delete(lockKey);
    }
  }
}

function resolvePriority(deadline?: string): 'low' | 'medium' | 'high' | 'critical' {
  if (!deadline) return 'medium';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (!Number.isFinite(days)) return 'medium';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'high';
  if (days <= 15) return 'medium';
  return 'low';
}
