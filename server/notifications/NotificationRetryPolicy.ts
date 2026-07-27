import type { NotificationDeliveryRecord } from "./NotificationDeliveryTypes";

export interface NotificationRetryDecision {
  retry: boolean;
  deadLetter: boolean;
  nextRetryAt?: string;
  delayMinutes?: number;
}

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 240];

export class NotificationRetryPolicy {
  static evaluate(
    record: Pick<
      NotificationDeliveryRecord,
      "status" | "attemptCount"
    >,
    now = new Date(),
  ): NotificationRetryDecision {
    if (record.status !== "failed") {
      return {
        retry: false,
        deadLetter: false,
      };
    }

    if (record.attemptCount >= MAX_ATTEMPTS) {
      return {
        retry: false,
        deadLetter: true,
      };
    }

    const delayMinutes =
      RETRY_DELAYS_MINUTES[
        Math.min(
          Math.max(record.attemptCount - 1, 0),
          RETRY_DELAYS_MINUTES.length - 1,
        )
      ];

    return {
      retry: true,
      deadLetter: false,
      delayMinutes,
      nextRetryAt: new Date(
        now.getTime() + delayMinutes * 60_000,
      ).toISOString(),
    };
  }

  static get maxAttempts(): number {
    return MAX_ATTEMPTS;
  }
}
