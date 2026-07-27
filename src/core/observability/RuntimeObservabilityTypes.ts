export type RuntimeObservabilityStatus =
  | 'healthy'
  | 'attention'
  | 'critical';

export interface RuntimeEndpointMetric {
  method: string;
  path: string;
  requestCount: number;
  errorCount: number;
  averageDurationMs: number;
  p95DurationMs: number;
  lastStatusCode: number;
  lastRequestAt: string;
}

export interface RuntimeErrorSample {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  organizationId?: string;
  userId?: string;
  occurredAt: string;
}

export interface RuntimeObservabilitySnapshot {
  status: RuntimeObservabilityStatus;
  startedAt: string;
  checkedAt: string;
  uptimeSeconds: number;
  requestCount: number;
  requestsLastFiveMinutes: number;
  errorCount: number;
  errorsLastFiveMinutes: number;
  errorRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  slowRequestCount: number;
  memoryUsageMb: number;
  heapUsageMb: number;
  endpoints: RuntimeEndpointMetric[];
  recentErrors: RuntimeErrorSample[];
}
