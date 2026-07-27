import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  NotificationMaintenancePreview,
  NotificationMaintenanceResult,
  NotificationMaintenanceRun,
  NotificationRetentionPolicy,
} from "./NotificationMaintenanceTypes";

const NOTIFICATIONS_JSON = path.join(
  process.cwd(),
  ".data",
  "platform-notifications.json",
);
const DELIVERIES_JSON = path.join(
  process.cwd(),
  ".data",
  "notification-deliveries.json",
);
const RETRY_RUNS_JSON = path.join(
  process.cwd(),
  ".data",
  "notification-retry-runs.json",
);
const MAINTENANCE_RUNS_JSON = path.join(
  process.cwd(),
  ".data",
  "notification-maintenance-runs.json",
);

export const DEFAULT_NOTIFICATION_RETENTION_POLICY:
  NotificationRetentionPolicy = {
    readNotificationsDays: 90,
    readDeliveriesDays: 90,
    deadLetterDays: 180,
    retryRunsDays: 30,
  };

export class NotificationMaintenanceService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
    private readonly policy = DEFAULT_NOTIFICATION_RETENTION_POLICY,
  ) {}

  async preview(): Promise<NotificationMaintenancePreview> {
    const cutoffs = this.cutoffs();

    if (this.mode === "json") {
      const notifications = this.readArray(NOTIFICATIONS_JSON);
      const deliveries = this.readArray(DELIVERIES_JSON);
      const retryRuns = this.readArray(RETRY_RUNS_JSON);

      const readNotifications = notifications.filter(
        (item: any) =>
          String(item.status).toUpperCase() === "READ" &&
          this.before(item.readAt || item.updatedAt, cutoffs.readNotifications),
      ).length;
      const readDeliveries = deliveries.filter(
        (item: any) =>
          item.status === "read" &&
          this.before(item.readAt || item.updatedAt, cutoffs.readDeliveries),
      ).length;
      const deadLetterDeliveries = deliveries.filter(
        (item: any) =>
          item.status === "dead_letter" &&
          this.before(item.deadLetterAt || item.updatedAt, cutoffs.deadLetter),
      ).length;
      const oldRetryRuns = retryRuns.filter((item: any) =>
        this.before(item.finishedAt || item.startedAt, cutoffs.retryRuns),
      ).length;

      return this.previewResult(
        readNotifications,
        readDeliveries,
        deadLetterDeliveries,
        oldRetryRuns,
      );
    }

    const client = this.supabaseAdapter.getClient();
    const [
      notifications,
      readDeliveries,
      deadLetters,
      retryRuns,
    ] = await Promise.all([
      client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("status", "READ")
        .lt("read_at", cutoffs.readNotifications),
      client
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "read")
        .lt("read_at", cutoffs.readDeliveries),
      client
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "dead_letter")
        .lt("dead_letter_at", cutoffs.deadLetter),
      client
        .from("notification_retry_runs")
        .select("id", { count: "exact", head: true })
        .lt("finished_at", cutoffs.retryRuns),
    ]);

    for (const result of [
      notifications,
      readDeliveries,
      deadLetters,
      retryRuns,
    ]) {
      if (result.error) throw result.error;
    }

    return this.previewResult(
      notifications.count || 0,
      readDeliveries.count || 0,
      deadLetters.count || 0,
      retryRuns.count || 0,
    );
  }

  async execute(
    trigger: "manual" | "scheduled" = "manual",
  ): Promise<NotificationMaintenanceResult> {
    const startedAt = new Date();
    const preview = await this.preview();
    const cutoffs = this.cutoffs();

    if (this.mode === "json") {
      this.filterJson(
        NOTIFICATIONS_JSON,
        (item: any) =>
          !(
            String(item.status).toUpperCase() === "READ" &&
            this.before(
              item.readAt || item.updatedAt,
              cutoffs.readNotifications,
            )
          ),
      );
      this.filterJson(
        DELIVERIES_JSON,
        (item: any) =>
          !(
            (item.status === "read" &&
              this.before(
                item.readAt || item.updatedAt,
                cutoffs.readDeliveries,
              )) ||
            (item.status === "dead_letter" &&
              this.before(
                item.deadLetterAt || item.updatedAt,
                cutoffs.deadLetter,
              ))
          ),
      );
      this.filterJson(
        RETRY_RUNS_JSON,
        (item: any) =>
          !this.before(
            item.finishedAt || item.startedAt,
            cutoffs.retryRuns,
          ),
      );
    } else {
      const client = this.supabaseAdapter.getClient();
      const results = await Promise.all([
        client
          .from("notifications")
          .delete()
          .eq("status", "READ")
          .lt("read_at", cutoffs.readNotifications),
        client
          .from("notification_deliveries")
          .delete()
          .eq("status", "read")
          .lt("read_at", cutoffs.readDeliveries),
        client
          .from("notification_deliveries")
          .delete()
          .eq("status", "dead_letter")
          .lt("dead_letter_at", cutoffs.deadLetter),
        client
          .from("notification_retry_runs")
          .delete()
          .lt("finished_at", cutoffs.retryRuns),
      ]);

      for (const result of results) {
        if (result.error) throw result.error;
      }
    }

    const finishedAt = new Date();
    const run: NotificationMaintenanceRun = {
      id: crypto.randomUUID(),
      trigger,
      readNotificationsRemoved: preview.readNotifications,
      readDeliveriesRemoved: preview.readDeliveries,
      deadLetterDeliveriesRemoved: preview.deadLetterDeliveries,
      retryRunsRemoved: preview.retryRuns,
      totalRemoved: preview.totalCandidates,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };

    await this.saveRun(run);
    return { preview, run };
  }

  async listRuns(limit = 50): Promise<NotificationMaintenanceRun[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));

    if (this.mode === "json") {
      return this.readArray(MAINTENANCE_RUNS_JSON)
        .sort((a: any, b: any) =>
          String(b.startedAt).localeCompare(String(a.startedAt)),
        )
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_maintenance_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      trigger: row.trigger,
      readNotificationsRemoved:
        Number(row.read_notifications_removed || 0),
      readDeliveriesRemoved:
        Number(row.read_deliveries_removed || 0),
      deadLetterDeliveriesRemoved:
        Number(row.dead_letter_deliveries_removed || 0),
      retryRunsRemoved: Number(row.retry_runs_removed || 0),
      totalRemoved: Number(row.total_removed || 0),
      durationMs: Number(row.duration_ms || 0),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }));
  }

  private async saveRun(
    run: NotificationMaintenanceRun,
  ): Promise<void> {
    if (this.mode === "json") {
      const runs = this.readArray(MAINTENANCE_RUNS_JSON);
      runs.unshift(run);
      this.writeArray(MAINTENANCE_RUNS_JSON, runs.slice(0, 1_000));
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("notification_maintenance_runs")
      .insert({
        id: run.id,
        trigger: run.trigger,
        read_notifications_removed:
          run.readNotificationsRemoved,
        read_deliveries_removed: run.readDeliveriesRemoved,
        dead_letter_deliveries_removed:
          run.deadLetterDeliveriesRemoved,
        retry_runs_removed: run.retryRunsRemoved,
        total_removed: run.totalRemoved,
        duration_ms: run.durationMs,
        started_at: run.startedAt,
        finished_at: run.finishedAt,
      });

    if (error) throw error;
  }

  private cutoffs() {
    const date = (days: number) =>
      new Date(Date.now() - days * 86_400_000).toISOString();

    return {
      readNotifications: date(this.policy.readNotificationsDays),
      readDeliveries: date(this.policy.readDeliveriesDays),
      deadLetter: date(this.policy.deadLetterDays),
      retryRuns: date(this.policy.retryRunsDays),
    };
  }

  private previewResult(
    readNotifications: number,
    readDeliveries: number,
    deadLetterDeliveries: number,
    retryRuns: number,
  ): NotificationMaintenancePreview {
    return {
      policy: this.policy,
      readNotifications,
      readDeliveries,
      deadLetterDeliveries,
      retryRuns,
      totalCandidates:
        readNotifications +
        readDeliveries +
        deadLetterDeliveries +
        retryRuns,
      checkedAt: new Date().toISOString(),
    };
  }

  private before(
    value: string | undefined,
    cutoff: string,
  ): boolean {
    return Boolean(value && value < cutoff);
  }

  private readArray(filePath: string): any[] {
    if (!fs.existsSync(filePath)) return [];

    try {
      const parsed = JSON.parse(
        fs.readFileSync(filePath, "utf-8"),
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private filterJson(
    filePath: string,
    predicate: (item: any) => boolean,
  ): void {
    this.writeArray(
      filePath,
      this.readArray(filePath).filter(predicate),
    );
  }

  private writeArray(filePath: string, values: any[]): void {
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
    fs.writeFileSync(
      filePath,
      JSON.stringify(values, null, 2),
      "utf-8",
    );
  }
}
