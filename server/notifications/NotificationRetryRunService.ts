import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  CreateNotificationRetryRunInput,
  NotificationRetryRun,
} from "./NotificationRetryRunTypes";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "notification-retry-runs.json",
);

export class NotificationRetryRunService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async create(
    input: CreateNotificationRetryRunInput,
  ): Promise<NotificationRetryRun> {
    const run: NotificationRetryRun = {
      id: crypto.randomUUID(),
      ...input,
    };

    if (this.mode === "json") {
      const runs = this.readJson();
      runs.unshift(run);
      this.writeJson(runs.slice(0, 5_000));
      return run;
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_retry_runs")
      .insert({
        id: run.id,
        trigger: run.trigger,
        status: run.status,
        processed: run.processed,
        retried: run.retried,
        dead_lettered: run.deadLettered,
        duration_ms: run.durationMs,
        error_message: run.errorMessage || null,
        started_at: run.startedAt,
        finished_at: run.finishedAt,
      })
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async list(limit = 100): Promise<NotificationRetryRun[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_retry_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  private readJson(): NotificationRetryRun[] {
    if (!fs.existsSync(JSON_PATH)) return [];

    try {
      const parsed = JSON.parse(
        fs.readFileSync(JSON_PATH, "utf-8"),
      );
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(runs: NotificationRetryRun[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(runs, null, 2),
      "utf-8",
    );
  }

  private fromRow(row: any): NotificationRetryRun {
    return {
      id: row.id,
      trigger: row.trigger,
      status: row.status,
      processed: Number(row.processed || 0),
      retried: Number(row.retried || 0),
      deadLettered: Number(row.dead_lettered || 0),
      durationMs: Number(row.duration_ms || 0),
      errorMessage: row.error_message || undefined,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }
}
