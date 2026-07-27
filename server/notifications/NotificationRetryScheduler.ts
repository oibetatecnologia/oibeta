import type { NotificationDeliveryService } from "./NotificationDeliveryService";
import type { NotificationRetryRunService } from "./NotificationRetryRunService";
import type { NotificationRetryRunTrigger } from "./NotificationRetryRunTypes";

export interface NotificationRetrySchedulerSnapshot {
  running: boolean;
  intervalMs: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastProcessed: number;
  lastRetried: number;
  lastDeadLettered: number;
  lastError?: string;
}

export class NotificationRetryScheduler {
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastRunAt?: string;
  private nextRunAt?: string;
  private lastProcessed = 0;
  private lastRetried = 0;
  private lastDeadLettered = 0;
  private lastError?: string;

  constructor(
    private readonly deliveries: NotificationDeliveryService,
    private readonly runHistory: NotificationRetryRunService,
    private readonly intervalMs = 60_000,
  ) {}

  start(): void {
    if (this.timer) return;

    this.scheduleNext();
    this.timer = setInterval(
      () => void this.run("scheduled"),
      this.intervalMs,
    );

    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
    this.nextRunAt = undefined;
  }

  async run(
    trigger: NotificationRetryRunTrigger = "manual",
  ): Promise<void> {
    const startedAt = new Date();

    if (this.running) {
      const finishedAt = new Date();
      await this.runHistory.create({
        trigger,
        status: "skipped",
        processed: 0,
        retried: 0,
        deadLettered: 0,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        errorMessage: "Já existe uma execução em andamento.",
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
      return;
    }

    this.running = true;
    this.lastError = undefined;

    try {
      const result =
        await this.deliveries.processScheduledRetries();
      const finishedAt = new Date();

      this.lastProcessed = result.processed;
      this.lastRetried = result.retried;
      this.lastDeadLettered = result.deadLettered;
      this.lastRunAt = finishedAt.toISOString();

      await this.runHistory.create({
        trigger,
        status: "success",
        processed: result.processed,
        retried: result.retried,
        deadLettered: result.deadLettered,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.lastError = errorMessage;
      this.lastRunAt = finishedAt.toISOString();

      await this.runHistory.create({
        trigger,
        status: "failed",
        processed: this.lastProcessed,
        retried: this.lastRetried,
        deadLettered: this.lastDeadLettered,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        errorMessage,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }

  getSnapshot(): NotificationRetrySchedulerSnapshot {
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      lastProcessed: this.lastProcessed,
      lastRetried: this.lastRetried,
      lastDeadLettered: this.lastDeadLettered,
      lastError: this.lastError,
    };
  }

  private scheduleNext(): void {
    this.nextRunAt = new Date(
      Date.now() + this.intervalMs,
    ).toISOString();
  }
}
