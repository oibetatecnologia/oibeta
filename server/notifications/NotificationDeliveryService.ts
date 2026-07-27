import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type {
  NotificationDeliveryRecord,
  NotificationDeliverySummary,
} from "./NotificationDeliveryTypes";
import { NotificationRetryPolicy } from "./NotificationRetryPolicy";

const JSON_PATH = path.join(
  process.cwd(),
  ".data",
  "notification-deliveries.json",
);

const nowIso = () => new Date().toISOString();

export class NotificationDeliveryService {
  constructor(
    private readonly mode: "json" | "supabase",
    private readonly supabaseAdapter: SupabaseDatabaseAdapter,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    limit = 100,
  ): Promise<NotificationDeliveryRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));

    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (record) =>
            record.organizationId === organizationId &&
            record.userId === userId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, safeLimit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_deliveries")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  async recordDelivered(input: {
    organizationId: string;
    notificationId: string;
    userId: string;
  }): Promise<NotificationDeliveryRecord> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const records = this.readJson();
      const existingIndex = records.findIndex(
        (record) =>
          record.organizationId === input.organizationId &&
          record.notificationId === input.notificationId &&
          record.userId === input.userId &&
          record.channel === "in_app",
      );

      if (existingIndex >= 0) {
        records[existingIndex] = {
          ...records[existingIndex],
          status:
            records[existingIndex].status === "read"
              ? "read"
              : "delivered",
          attemptCount: records[existingIndex].attemptCount + 1,
          deliveredAt:
            records[existingIndex].deliveredAt || timestamp,
          failedAt: undefined,
          failureReason: undefined,
          updatedAt: timestamp,
        };
        this.writeJson(records);
        return records[existingIndex];
      }

      const created: NotificationDeliveryRecord = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        notificationId: input.notificationId,
        userId: input.userId,
        channel: "in_app",
        status: "delivered",
        attemptCount: 1,
        deliveredAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      records.unshift(created);
      this.writeJson(records.slice(0, 20_000));
      return created;
    }

    const client = this.supabaseAdapter.getClient();
    const { data: existing, error: existingError } = await client
      .from("notification_deliveries")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("notification_id", input.notificationId)
      .eq("user_id", input.userId)
      .eq("channel", "in_app")
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { data, error } = await client
        .from("notification_deliveries")
        .update({
          status:
            existing.status === "read" ? "read" : "delivered",
          attempt_count: Number(existing.attempt_count || 0) + 1,
          delivered_at: existing.delivered_at || timestamp,
          failed_at: null,
          failure_reason: null,
          updated_at: timestamp,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return this.fromRow(data);
    }

    const record: NotificationDeliveryRecord = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      notificationId: input.notificationId,
      userId: input.userId,
      channel: "in_app",
      status: "delivered",
      attemptCount: 1,
      deliveredAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await client
      .from("notification_deliveries")
      .insert(this.toRow(record))
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async recordFailure(input: {
    organizationId: string;
    notificationId: string;
    userId: string;
    reason: string;
  }): Promise<NotificationDeliveryRecord> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const records = this.readJson();
      const existingIndex = records.findIndex(
        (record) =>
          record.organizationId === input.organizationId &&
          record.notificationId === input.notificationId &&
          record.userId === input.userId &&
          record.channel === "in_app",
      );

      if (existingIndex >= 0) {
        const attemptCount =
          records[existingIndex].attemptCount + 1;
        const decision = NotificationRetryPolicy.evaluate({
          status: "failed",
          attemptCount,
        });

        records[existingIndex] = {
          ...records[existingIndex],
          status: decision.deadLetter
            ? "dead_letter"
            : "failed",
          attemptCount,
          failedAt: timestamp,
          failureReason: input.reason,
          nextRetryAt: decision.nextRetryAt,
          deadLetterAt: decision.deadLetter
            ? timestamp
            : undefined,
          updatedAt: timestamp,
        };
        this.writeJson(records);
        return records[existingIndex];
      }

      const decision = NotificationRetryPolicy.evaluate({
        status: "failed",
        attemptCount: 1,
      });
      const created: NotificationDeliveryRecord = {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        notificationId: input.notificationId,
        userId: input.userId,
        channel: "in_app",
        status: decision.deadLetter
          ? "dead_letter"
          : "failed",
        attemptCount: 1,
        failedAt: timestamp,
        failureReason: input.reason,
        nextRetryAt: decision.nextRetryAt,
        deadLetterAt: decision.deadLetter
          ? timestamp
          : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      records.unshift(created);
      this.writeJson(records.slice(0, 20_000));
      return created;
    }

    const client = this.supabaseAdapter.getClient();
    const { data: existing, error: existingError } = await client
      .from("notification_deliveries")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("notification_id", input.notificationId)
      .eq("user_id", input.userId)
      .eq("channel", "in_app")
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const attemptCount =
        Number(existing.attempt_count || 0) + 1;
      const decision = NotificationRetryPolicy.evaluate({
        status: "failed",
        attemptCount,
      });
      const { data, error } = await client
        .from("notification_deliveries")
        .update({
          status: decision.deadLetter
            ? "dead_letter"
            : "failed",
          attempt_count: attemptCount,
          failed_at: timestamp,
          failure_reason: input.reason,
          next_retry_at: decision.nextRetryAt || null,
          dead_letter_at: decision.deadLetter
            ? timestamp
            : null,
          updated_at: timestamp,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return this.fromRow(data);
    }

    const decision = NotificationRetryPolicy.evaluate({
      status: "failed",
      attemptCount: 1,
    });
    const record: NotificationDeliveryRecord = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      notificationId: input.notificationId,
      userId: input.userId,
      channel: "in_app",
      status: decision.deadLetter
        ? "dead_letter"
        : "failed",
      attemptCount: 1,
      failedAt: timestamp,
      failureReason: input.reason,
      nextRetryAt: decision.nextRetryAt,
      deadLetterAt: decision.deadLetter
        ? timestamp
        : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await client
      .from("notification_deliveries")
      .insert(this.toRow(record))
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async processScheduledRetries(): Promise<{
    processed: number;
    retried: number;
    deadLettered: number;
  }> {
    const now = new Date();
    const due = await this.listDueRetries(now, 500);
    let retried = 0;
    let deadLettered = 0;

    for (const record of due) {
      const decision = NotificationRetryPolicy.evaluate(
        record,
        now,
      );

      if (decision.deadLetter) {
        await this.moveToDeadLetter(record, now);
        deadLettered += 1;
        continue;
      }

      await this.retry(
        record.organizationId,
        record.userId,
        record.id,
      );
      retried += 1;
    }

    return {
      processed: due.length,
      retried,
      deadLettered,
    };
  }

  private async listDueRetries(
    now: Date,
    limit: number,
  ): Promise<NotificationDeliveryRecord[]> {
    if (this.mode === "json") {
      return this.readJson()
        .filter(
          (record) =>
            record.status === "failed" &&
            Boolean(record.nextRetryAt) &&
            new Date(record.nextRetryAt as string).getTime() <=
              now.getTime(),
        )
        .sort((a, b) =>
          String(a.nextRetryAt).localeCompare(
            String(b.nextRetryAt),
          ),
        )
        .slice(0, limit);
    }

    const { data, error } = await this.supabaseAdapter
      .getClient()
      .from("notification_deliveries")
      .select("*")
      .eq("status", "failed")
      .lte("next_retry_at", now.toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  private async moveToDeadLetter(
    record: NotificationDeliveryRecord,
    now: Date,
  ): Promise<void> {
    const timestamp = now.toISOString();

    if (this.mode === "json") {
      const records = this.readJson();
      const index = records.findIndex(
        (item) => item.id === record.id,
      );

      if (index >= 0) {
        records[index] = {
          ...records[index],
          status: "dead_letter",
          deadLetterAt: timestamp,
          nextRetryAt: undefined,
          updatedAt: timestamp,
        };
        this.writeJson(records);
      }
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("notification_deliveries")
      .update({
        status: "dead_letter",
        dead_letter_at: timestamp,
        next_retry_at: null,
        updated_at: timestamp,
      })
      .eq("id", record.id);

    if (error) throw error;
  }

  async retry(
    organizationId: string,
    userId: string,
    deliveryId: string,
  ): Promise<NotificationDeliveryRecord> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const records = this.readJson();
      const index = records.findIndex(
        (record) =>
          record.id === deliveryId &&
          record.organizationId === organizationId &&
          record.userId === userId,
      );

      if (index < 0) throw new Error("Entrega não encontrada.");
      if (records[index].status !== "failed") {
        throw new Error(
          "Somente entregas com falha podem ser reprocessadas.",
        );
      }

      records[index] = {
        ...records[index],
        status: "delivered",
        attemptCount: records[index].attemptCount + 1,
        deliveredAt: timestamp,
        failedAt: undefined,
        failureReason: undefined,
        lastRetryAt: timestamp,
        nextRetryAt: undefined,
        deadLetterAt: undefined,
        updatedAt: timestamp,
      };
      this.writeJson(records);
      return records[index];
    }

    const client = this.supabaseAdapter.getClient();
    const { data: current, error: currentError } = await client
      .from("notification_deliveries")
      .select("*")
      .eq("id", deliveryId)
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .single();

    if (currentError) throw currentError;
    if (current.status !== "failed") {
      throw new Error(
        "Somente entregas com falha podem ser reprocessadas.",
      );
    }

    const { data, error } = await client
      .from("notification_deliveries")
      .update({
        status: "delivered",
        attempt_count: Number(current.attempt_count || 0) + 1,
        delivered_at: timestamp,
        failed_at: null,
        failure_reason: null,
        last_retry_at: timestamp,
        next_retry_at: null,
        dead_letter_at: null,
        updated_at: timestamp,
      })
      .eq("id", deliveryId)
      .select()
      .single();

    if (error) throw error;
    return this.fromRow(data);
  }

  async retryAllFailed(
    organizationId: string,
    userId: string,
  ): Promise<{
    retried: number;
    records: NotificationDeliveryRecord[];
  }> {
    const failed = (await this.list(organizationId, userId, 500))
      .filter((record) => record.status === "failed");
    const records: NotificationDeliveryRecord[] = [];

    for (const record of failed) {
      records.push(
        await this.retry(
          organizationId,
          userId,
          record.id,
        ),
      );
    }

    return {
      retried: records.length,
      records,
    };
  }

  async markRead(
    organizationId: string,
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const records = this.readJson();
      const next = records.map((record) =>
        record.organizationId === organizationId &&
        record.userId === userId &&
        record.notificationId === notificationId
          ? {
              ...record,
              status: "read" as const,
              readAt: timestamp,
              updatedAt: timestamp,
            }
          : record,
      );
      this.writeJson(next);
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("notification_deliveries")
      .update({
        status: "read",
        read_at: timestamp,
        updated_at: timestamp,
      })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("notification_id", notificationId);

    if (error) throw error;
  }

  async markAllRead(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const timestamp = nowIso();

    if (this.mode === "json") {
      const records = this.readJson();
      const next = records.map((record) =>
        record.organizationId === organizationId &&
        record.userId === userId &&
        record.status !== "read"
          ? {
              ...record,
              status: "read" as const,
              readAt: timestamp,
              updatedAt: timestamp,
            }
          : record,
      );
      this.writeJson(next);
      return;
    }

    const { error } = await this.supabaseAdapter
      .getClient()
      .from("notification_deliveries")
      .update({
        status: "read",
        read_at: timestamp,
        updated_at: timestamp,
      })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .neq("status", "read");

    if (error) throw error;
  }

  buildSummary(
    records: NotificationDeliveryRecord[],
  ): NotificationDeliverySummary {
    const delivered = records.filter(
      (record) => record.status === "delivered",
    ).length;
    const read = records.filter(
      (record) => record.status === "read",
    ).length;
    const failed = records.filter(
      (record) => record.status === "failed",
    ).length;
    const deadLetter = records.filter(
      (record) => record.status === "dead_letter",
    ).length;
    const successful = delivered + read;
    const total = records.length;

    return {
      total,
      delivered,
      read,
      failed,
      retryableFailed: failed,
      deadLetter,
      pendingRead: delivered,
      deliveryRate:
        total === 0 ? 100 : Math.round((successful / total) * 100),
      readRate:
        successful === 0
          ? 100
          : Math.round((read / successful) * 100),
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          100 - failed * 15 - deadLetter * 30 - delivered * 2,
        ),
      ),
    };
  }

  private readJson(): NotificationDeliveryRecord[] {
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

  private writeJson(
    records: NotificationDeliveryRecord[],
  ): void {
    fs.mkdirSync(path.dirname(JSON_PATH), {
      recursive: true,
    });
    fs.writeFileSync(
      JSON_PATH,
      JSON.stringify(records, null, 2),
      "utf-8",
    );
  }

  private toRow(
    record: NotificationDeliveryRecord,
  ): Record<string, unknown> {
    return {
      id: record.id,
      organization_id: record.organizationId,
      notification_id: record.notificationId,
      user_id: record.userId,
      channel: record.channel,
      status: record.status,
      attempt_count: record.attemptCount,
      delivered_at: record.deliveredAt || null,
      read_at: record.readAt || null,
      failed_at: record.failedAt || null,
      failure_reason: record.failureReason || null,
      last_retry_at: record.lastRetryAt || null,
      next_retry_at: record.nextRetryAt || null,
      dead_letter_at: record.deadLetterAt || null,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private fromRow(row: any): NotificationDeliveryRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      notificationId: row.notification_id,
      userId: row.user_id,
      channel: row.channel,
      status: row.status,
      attemptCount: Number(row.attempt_count || 0),
      deliveredAt: row.delivered_at || undefined,
      readAt: row.read_at || undefined,
      failedAt: row.failed_at || undefined,
      failureReason: row.failure_reason || undefined,
      lastRetryAt: row.last_retry_at || undefined,
      nextRetryAt: row.next_retry_at || undefined,
      deadLetterAt: row.dead_letter_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
