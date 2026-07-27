import crypto from "crypto";
import type { NextFunction, Response } from "express";
import type {
  RuntimeEndpointMetric,
  RuntimeErrorSample,
  RuntimeObservabilityRequest,
  RuntimeObservabilitySnapshot,
  RuntimeRequestSample,
} from "./RuntimeObservabilityTypes";

const MAX_SAMPLES = 1_000;
const FIVE_MINUTES_MS = 5 * 60 * 1_000;
const SLOW_REQUEST_THRESHOLD_MS = 1_500;

export class RuntimeObservabilityService {
  private readonly startedAt = new Date();
  private readonly samples: RuntimeRequestSample[] = [];

  createMiddleware() {
    return (
      req: RuntimeObservabilityRequest,
      res: Response,
      next: NextFunction,
    ): void => {
      if (!req.path.startsWith("/api/")) {
        next();
        return;
      }

      req.runtimeObservationStartedAt = process.hrtime.bigint();

      res.on("finish", () => {
        const startedAt = req.runtimeObservationStartedAt;
        if (!startedAt) return;

        const durationNs = process.hrtime.bigint() - startedAt;
        const durationMs = Number(durationNs) / 1_000_000;
        const organizationId = this.headerValue(
          req.headers["x-organization-id"],
        );
        const workspaceId = this.headerValue(
          req.headers["x-workspace-id"],
        );
        const userId = this.headerValue(req.headers["x-user-id"]);

        this.record({
          id: crypto.randomUUID(),
          method: req.method.toUpperCase(),
          path: this.normalizePath(req.path),
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          organizationId,
          workspaceId,
          userId,
          occurredAt: new Date().toISOString(),
        });
      });

      next();
    };
  }

  getSnapshot(): RuntimeObservabilitySnapshot {
    const now = Date.now();
    const fiveMinutesAgo = now - FIVE_MINUTES_MS;
    const recentSamples = this.samples.filter(
      (sample) =>
        new Date(sample.occurredAt).getTime() >= fiveMinutesAgo,
    );
    const errorSamples = this.samples.filter(
      (sample) => sample.statusCode >= 500,
    );
    const recentErrors = recentSamples.filter(
      (sample) => sample.statusCode >= 500,
    );
    const durations = recentSamples.map((sample) => sample.durationMs);
    const memory = process.memoryUsage();
    const errorRate =
      recentSamples.length === 0
        ? 0
        : (recentErrors.length / recentSamples.length) * 100;
    const p95DurationMs = this.percentile(durations, 95);
    const slowRequestCount = recentSamples.filter(
      (sample) => sample.durationMs >= SLOW_REQUEST_THRESHOLD_MS,
    ).length;

    return {
      status: this.resolveStatus(
        errorRate,
        p95DurationMs,
        slowRequestCount,
      ),
      startedAt: this.startedAt.toISOString(),
      checkedAt: new Date(now).toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      requestCount: this.samples.length,
      requestsLastFiveMinutes: recentSamples.length,
      errorCount: errorSamples.length,
      errorsLastFiveMinutes: recentErrors.length,
      errorRate: Math.round(errorRate * 100) / 100,
      averageDurationMs:
        durations.length === 0
          ? 0
          : Math.round(
              (durations.reduce((total, value) => total + value, 0) /
                durations.length) *
                100,
            ) / 100,
      p95DurationMs: Math.round(p95DurationMs * 100) / 100,
      slowRequestCount,
      memoryUsageMb: Math.round(memory.rss / 1024 / 1024),
      heapUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
      endpoints: this.buildEndpointMetrics(recentSamples),
      recentErrors: recentErrors
        .slice(-20)
        .reverse()
        .map((sample): RuntimeErrorSample => ({
          id: sample.id,
          method: sample.method,
          path: sample.path,
          statusCode: sample.statusCode,
          durationMs: sample.durationMs,
          organizationId: sample.organizationId,
          userId: sample.userId,
          occurredAt: sample.occurredAt,
        })),
    };
  }

  private record(sample: RuntimeRequestSample): void {
    this.samples.push(sample);

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES);
    }
  }

  private buildEndpointMetrics(
    samples: RuntimeRequestSample[],
  ): RuntimeEndpointMetric[] {
    const grouped = new Map<string, RuntimeRequestSample[]>();

    samples.forEach((sample) => {
      const key = `${sample.method} ${sample.path}`;
      const current = grouped.get(key) || [];
      current.push(sample);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([key, endpointSamples]) => {
        const [method, ...pathParts] = key.split(" ");
        const durations = endpointSamples.map(
          (sample) => sample.durationMs,
        );
        const last = endpointSamples[endpointSamples.length - 1];

        return {
          method,
          path: pathParts.join(" "),
          requestCount: endpointSamples.length,
          errorCount: endpointSamples.filter(
            (sample) => sample.statusCode >= 500,
          ).length,
          averageDurationMs:
            Math.round(
              (durations.reduce((total, value) => total + value, 0) /
                durations.length) *
                100,
            ) / 100,
          p95DurationMs:
            Math.round(this.percentile(durations, 95) * 100) / 100,
          lastStatusCode: last.statusCode,
          lastRequestAt: last.occurredAt,
        };
      })
      .sort((a, b) => {
        if (b.errorCount !== a.errorCount) {
          return b.errorCount - a.errorCount;
        }

        return b.p95DurationMs - a.p95DurationMs;
      })
      .slice(0, 30);
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(
        0,
        Math.ceil((percentile / 100) * sorted.length) - 1,
      ),
    );

    return sorted[index];
  }

  private resolveStatus(
    errorRate: number,
    p95DurationMs: number,
    slowRequestCount: number,
  ): RuntimeObservabilitySnapshot["status"] {
    if (errorRate >= 5 || p95DurationMs >= 4_000) {
      return "critical";
    }

    if (
      errorRate > 0 ||
      p95DurationMs >= SLOW_REQUEST_THRESHOLD_MS ||
      slowRequestCount >= 5
    ) {
      return "attention";
    }

    return "healthy";
  }

  private normalizePath(path: string): string {
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
        ":id",
      )
      .replace(/\/\d+(?=\/|$)/g, "/:id")
      .replace(/\/org-[^/]+/g, "/org-:id")
      .replace(/\/workspace-[^/]+/g, "/workspace-:id");
  }

  private headerValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
