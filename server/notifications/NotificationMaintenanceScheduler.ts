import type { NotificationMaintenanceService } from "./NotificationMaintenanceService";

export interface NotificationMaintenanceSchedulerSnapshot {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastCheckAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastCandidates: number;
  lastRemoved: number;
  lastDurationMs: number;
  lastError?: string;
}

export class NotificationMaintenanceScheduler {
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastCheckAt?: string;
  private lastRunAt?: string;
  private nextRunAt?: string;
  private lastCandidates = 0;
  private lastRemoved = 0;
  private lastDurationMs = 0;
  private lastError?: string;

  constructor(
    private readonly maintenance: NotificationMaintenanceService,
    private readonly intervalMs = 24 * 60 * 60 * 1_000,
  ) {}

  start(): void {
    if (this.timer) return;

    this.scheduleNext();
    this.timer = setInterval(
      () => void this.run(),
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

  async run(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.lastError = undefined;
    const startedAt = Date.now();

    try {
      const preview = await this.maintenance.preview();
      this.lastCandidates = preview.totalCandidates;
      this.lastCheckAt = new Date().toISOString();

      if (preview.totalCandidates > 0) {
        const result = await this.maintenance.execute("scheduled");
        this.lastRemoved = result.run.totalRemoved;
        this.lastRunAt = result.run.finishedAt;
      } else {
        this.lastRemoved = 0;
      }

      this.lastDurationMs = Date.now() - startedAt;
    } catch (error) {
      this.lastError =
        error instanceof Error ? error.message : String(error);
      this.lastDurationMs = Date.now() - startedAt;
      this.lastCheckAt = new Date().toISOString();
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }

  getSnapshot(): NotificationMaintenanceSchedulerSnapshot {
    return {
      enabled: Boolean(this.timer),
      running: this.running,
      intervalMs: this.intervalMs,
      lastCheckAt: this.lastCheckAt,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      lastCandidates: this.lastCandidates,
      lastRemoved: this.lastRemoved,
      lastDurationMs: this.lastDurationMs,
      lastError: this.lastError,
    };
  }

  private scheduleNext(): void {
    this.nextRunAt = new Date(
      Date.now() + this.intervalMs,
    ).toISOString();
  }
}
