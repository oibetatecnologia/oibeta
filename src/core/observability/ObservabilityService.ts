import type {
  ActionLogEntry,
  DebugLogEntry,
} from '../../types/workspace/WorkspaceState';
import type {
  ObservabilityIssue,
  ObservabilityMetric,
  ObservabilityStatus,
  ObservabilitySummary,
} from './ObservabilityTypes';
import type { RuntimeObservabilitySnapshot } from './RuntimeObservabilityTypes';

export interface ObservabilityInput {
  actionLogs: ActionLogEntry[];
  debugLogs: DebugLogEntry[];
  isFetchingDebug: boolean;
  isApiError: boolean;
  pendingTasksCount: number;
  productionReadinessScore: number;
  runtime: RuntimeObservabilitySnapshot;
  runtimeError?: string;
}

export class ObservabilityService {
  static buildSummary(input: ObservabilityInput): ObservabilitySummary {
    const errorLogs = input.debugLogs.filter((log) =>
      this.normalizeLevel(log.level) === 'error'
    );
    const warningLogs = input.debugLogs.filter((log) =>
      this.normalizeLevel(log.level) === 'warning'
    );
    const staleActionLogs = input.actionLogs.filter((log) =>
      this.isStale(log.createdAt)
    );

    const metrics: ObservabilityMetric[] = [
      this.metric({
        id: 'runtime-requests',
        label: 'Requisições API',
        value: input.runtime.requestsLastFiveMinutes,
        helper: `P95 ${Math.round(input.runtime.p95DurationMs)} ms`,
        status: input.runtime.status,
      }),
      this.metric({
        id: 'runtime-errors',
        label: 'Taxa de erro',
        value: input.runtime.errorRate,
        helper: `${input.runtime.errorsLastFiveMinutes} erro(s) em 5 min`,
        status: input.runtime.errorRate >= 5
          ? 'critical'
          : input.runtime.errorRate > 0
            ? 'attention'
            : 'healthy',
      }),
      this.metric({
        id: 'action-logs',
        label: 'Ações',
        value: input.actionLogs.length,
        helper: `${staleActionLogs.length} antigas`,
        status: input.actionLogs.length > 0 ? 'healthy' : 'attention',
      }),
      this.metric({
        id: 'debug-logs',
        label: 'Logs técnicos',
        value: input.debugLogs.length,
        helper: input.isFetchingDebug ? 'Atualizando' : 'Carregados',
        status: input.isFetchingDebug ? 'attention' : 'healthy',
      }),
      this.metric({
        id: 'errors',
        label: 'Erros',
        value: errorLogs.length,
        helper: 'Logs críticos',
        status: errorLogs.length > 0 ? 'critical' : 'healthy',
      }),
      this.metric({
        id: 'warnings',
        label: 'Alertas',
        value: warningLogs.length,
        helper: 'Logs de atenção',
        status: warningLogs.length > 5 ? 'attention' : 'healthy',
      }),
      this.metric({
        id: 'task-pressure',
        label: 'Pressão',
        value: input.pendingTasksCount,
        helper: 'Tarefas pendentes',
        status: input.pendingTasksCount > 12 ? 'attention' : 'healthy',
      }),
      this.metric({
        id: 'production',
        label: 'Produção',
        value: input.productionReadinessScore,
        helper: 'Prontidão geral',
        status: input.productionReadinessScore >= 80
          ? 'healthy'
          : input.productionReadinessScore >= 55
            ? 'attention'
            : 'critical',
      }),
    ];

    const issues = this.buildIssues({
      ...input,
      errorLogsCount: errorLogs.length,
      warningLogsCount: warningLogs.length,
      staleActionLogsCount: staleActionLogs.length,
    });

    const metricScore = metrics.reduce((total, metric) => {
      if (metric.status === 'healthy') return total + 100;
      if (metric.status === 'attention') return total + 60;
      return total + 20;
    }, 0);

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          metricScore / Math.max(metrics.length, 1) -
            issues.filter((issue) => issue.priority === 'alta').length * 8,
        ),
      ),
    );

    return {
      score,
      status: this.resolveStatus(score, issues),
      actionLogsCount: input.actionLogs.length,
      debugLogsCount: input.debugLogs.length,
      errorLogsCount: errorLogs.length,
      warningLogsCount: warningLogs.length,
      staleActionLogsCount: staleActionLogs.length,
      runtimeRequestCount: input.runtime.requestsLastFiveMinutes,
      runtimeErrorRate: input.runtime.errorRate,
      runtimeP95DurationMs: input.runtime.p95DurationMs,
      runtimeSlowRequestCount: input.runtime.slowRequestCount,
      runtimeMemoryUsageMb: input.runtime.memoryUsageMb,
      criticalIssues: issues.filter((issue) => issue.priority === 'alta').length,
      metrics,
      issues,
    };
  }

  private static buildIssues(input: ObservabilityInput & {
    errorLogsCount: number;
    warningLogsCount: number;
    staleActionLogsCount: number;
  }): ObservabilityIssue[] {
    const issues: ObservabilityIssue[] = [];

    if (input.runtimeError) {
      issues.push({
        id: 'runtime-observability-unavailable',
        title: 'Telemetria runtime indisponível',
        description: input.runtimeError,
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle: '[Observabilidade] Restaurar telemetria runtime da API',
      });
    }

    if (input.runtime.errorRate >= 5) {
      issues.push({
        id: 'runtime-error-rate',
        title: 'Taxa de erro elevada na API',
        description: `${input.runtime.errorRate}% das requisições recentes retornaram erro 5xx.`,
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle: '[Observabilidade] Investigar erros 5xx da API',
      });
    }

    if (input.runtime.p95DurationMs >= 1500) {
      issues.push({
        id: 'runtime-latency',
        title: 'Latência elevada na API',
        description: `O P95 está em ${Math.round(input.runtime.p95DurationMs)} ms.`,
        priority: input.runtime.p95DurationMs >= 4000 ? 'alta' : 'média',
        targetTab: 'platform_monitoring',
        taskTitle: '[Observabilidade] Reduzir latência P95 da API',
      });
    }

    if (input.runtime.slowRequestCount >= 5) {
      issues.push({
        id: 'runtime-slow-requests',
        title: 'Volume de requisições lentas',
        description: `${input.runtime.slowRequestCount} requisição(ões) recentes excederam 1,5 segundo.`,
        priority: 'média',
        targetTab: 'development',
        taskTitle: '[Observabilidade] Analisar endpoints lentos',
      });
    }

    if (input.isApiError) {
      issues.push({
        id: 'internal-api-error',
        title: 'API interna indisponível',
        description: 'A leitura dos módulos indica erro de API e reduz a confiabilidade operacional.',
        priority: 'alta',
        targetTab: 'platform_monitoring',
        taskTitle: '[Observabilidade] Restaurar API interna da plataforma',
      });
    }

    if (input.errorLogsCount > 0) {
      issues.push({
        id: 'debug-errors',
        title: 'Erros técnicos registrados',
        description: `${input.errorLogsCount} erro(s) foram encontrados nos logs técnicos.`,
        priority: 'alta',
        targetTab: 'settings',
        taskTitle: `[Observabilidade] Investigar ${input.errorLogsCount} erro(s) técnicos`,
      });
    }

    if (input.warningLogsCount > 5) {
      issues.push({
        id: 'debug-warnings',
        title: 'Volume elevado de alertas',
        description: `${input.warningLogsCount} alertas técnicos precisam de triagem.`,
        priority: 'média',
        targetTab: 'settings',
        taskTitle: '[Observabilidade] Triar alertas técnicos recorrentes',
      });
    }

    if (input.actionLogs.length === 0) {
      issues.push({
        id: 'missing-action-logs',
        title: 'Auditoria operacional sem histórico',
        description: 'Nenhuma ação operacional foi carregada para auditoria.',
        priority: 'média',
        targetTab: 'dashboard',
        taskTitle: '[Observabilidade] Validar geração e persistência dos logs de ação',
      });
    }

    if (input.staleActionLogsCount > 10) {
      issues.push({
        id: 'stale-actions',
        title: 'Histórico operacional antigo',
        description: `${input.staleActionLogsCount} ações têm mais de 30 dias.`,
        priority: 'baixa',
        targetTab: 'dashboard',
        taskTitle: '[Observabilidade] Revisar retenção e arquivamento dos logs de ação',
      });
    }

    if (input.pendingTasksCount > 12) {
      issues.push({
        id: 'pending-task-pressure',
        title: 'Fila operacional elevada',
        description: `${input.pendingTasksCount} tarefas pendentes afetam a capacidade de resposta.`,
        priority: 'média',
        targetTab: 'development',
        taskTitle: '[Observabilidade] Triar fila operacional de tarefas',
      });
    }

    return issues;
  }

  private static metric(metric: ObservabilityMetric): ObservabilityMetric {
    return metric;
  }

  private static normalizeLevel(level?: string): 'error' | 'warning' | 'info' {
    const normalized = String(level || '').toLowerCase();

    if (['error', 'fatal', 'critical'].includes(normalized)) return 'error';
    if (['warn', 'warning'].includes(normalized)) return 'warning';
    return 'info';
  }

  private static isStale(createdAt?: string): boolean {
    if (!createdAt) return false;

    const timestamp = new Date(createdAt).getTime();
    if (!Number.isFinite(timestamp)) return false;

    return Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000;
  }

  private static resolveStatus(
    score: number,
    issues: ObservabilityIssue[],
  ): ObservabilityStatus {
    if (issues.some((issue) => issue.priority === 'alta') || score < 50) {
      return 'critical';
    }

    if (issues.length > 0 || score < 80) {
      return 'attention';
    }

    return 'healthy';
  }
}
