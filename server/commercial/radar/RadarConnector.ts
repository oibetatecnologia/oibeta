import type { RadarConnectorDescriptor, RadarSyncRunMetrics } from '../../../src/core/commercial/connectors/RadarConnectorTypes';

export interface RadarConnectorExecutionOptions {
  dateFrom?: string;
  dateTo?: string;
  maxPages?: number;
  pageSize?: number;
  cursor?: string;
  cursorBefore?: string;
}

export interface RadarConnectorExecutionContext {
  options: RadarConnectorExecutionOptions;
  credential?: { value: string; scope: 'global' | 'tenant' };
  onRecord: (record: unknown) => Promise<'created' | 'updated' | 'duplicate' | 'ignored' | 'rejected'>;
}

export interface RadarConnectorExecutionResult {
  metrics: RadarSyncRunMetrics;
  cursorAfter?: string;
  warnings: string[];
}

export interface RadarConnector {
  descriptor: RadarConnectorDescriptor;
  execute(context: RadarConnectorExecutionContext): Promise<RadarConnectorExecutionResult>;
}
