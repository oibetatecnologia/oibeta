export type ObservabilityStatus = 'healthy' | 'attention' | 'critical';
export type ObservabilityPriority = 'alta' | 'média' | 'baixa';

export interface ObservabilityMetric {
  id: string;
  label: string;
  value: number;
  helper: string;
  status: ObservabilityStatus;
}

export interface ObservabilityIssue {
  id: string;
  title: string;
  description: string;
  priority: ObservabilityPriority;
  targetTab: string;
  taskTitle: string;
}

export interface ObservabilitySummary {
  score: number;
  status: ObservabilityStatus;
  actionLogsCount: number;
  debugLogsCount: number;
  errorLogsCount: number;
  warningLogsCount: number;
  staleActionLogsCount: number;
  runtimeRequestCount: number;
  runtimeErrorRate: number;
  runtimeP95DurationMs: number;
  runtimeSlowRequestCount: number;
  runtimeMemoryUsageMb: number;
  criticalIssues: number;
  metrics: ObservabilityMetric[];
  issues: ObservabilityIssue[];
}
