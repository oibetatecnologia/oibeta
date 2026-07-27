import type { RuntimeObservabilitySnapshot } from "./RuntimeObservabilityTypes";
import type { CreateOperationalIncidentInput } from "./OperationalIncidentTypes";

export interface IncidentDetectionResult {
  detected: CreateOperationalIncidentInput[];
  checkedAt: string;
}

export class IncidentDetectionService {
  static detect(
    organizationId: string,
    workspaceId: string | undefined,
    snapshot: RuntimeObservabilitySnapshot,
  ): IncidentDetectionResult {
    const detected: CreateOperationalIncidentInput[] = [];

    if (snapshot.errorRate >= 5) {
      detected.push({
        organizationId,
        workspaceId,
        title: "Taxa crítica de erros na API",
        description: `${snapshot.errorRate}% das requisições recentes retornaram erro 5xx.`,
        source: "runtime-observability",
        severity: "critical",
        owner: "Equipe de desenvolvimento Oi Beta",
        fingerprint: "runtime:error-rate:critical",
        automated: true,
      });
    } else if (snapshot.errorRate > 0) {
      detected.push({
        organizationId,
        workspaceId,
        title: "Erros recentes na API",
        description: `${snapshot.errorsLastFiveMinutes} erro(s) 5xx foram detectados nos últimos cinco minutos.`,
        source: "runtime-observability",
        severity: "high",
        owner: "Equipe de desenvolvimento Oi Beta",
        fingerprint: "runtime:error-rate:attention",
        automated: true,
      });
    }

    if (snapshot.p95DurationMs >= 4000) {
      detected.push({
        organizationId,
        workspaceId,
        title: "Latência crítica da API",
        description: `A latência P95 atingiu ${Math.round(snapshot.p95DurationMs)} ms.`,
        source: "runtime-observability",
        severity: "critical",
        owner: "Equipe de desenvolvimento Oi Beta",
        fingerprint: "runtime:latency:critical",
        automated: true,
      });
    } else if (snapshot.p95DurationMs >= 1500) {
      detected.push({
        organizationId,
        workspaceId,
        title: "Latência elevada da API",
        description: `A latência P95 está em ${Math.round(snapshot.p95DurationMs)} ms.`,
        source: "runtime-observability",
        severity: "high",
        owner: "Equipe de desenvolvimento Oi Beta",
        fingerprint: "runtime:latency:attention",
        automated: true,
      });
    }

    if (snapshot.slowRequestCount >= 5) {
      detected.push({
        organizationId,
        workspaceId,
        title: "Volume elevado de requisições lentas",
        description: `${snapshot.slowRequestCount} requisição(ões) recentes excederam 1,5 segundo.`,
        source: "runtime-observability",
        severity: "medium",
        owner: "Equipe de desenvolvimento Oi Beta",
        fingerprint: "runtime:slow-requests",
        automated: true,
      });
    }

    return { detected, checkedAt: new Date().toISOString() };
  }
}
