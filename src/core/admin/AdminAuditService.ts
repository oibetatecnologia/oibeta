import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  AdminAuditEntry,
  AdminAuditSummary,
} from './AdminAuditTypes';

const AUDIT_ENDPOINT = '/api/admin/audit';

export class AdminAuditService {
  static async list(limit = 100): Promise<AdminAuditEntry[]> {
    return HttpRepositoryClient.get<AdminAuditEntry[]>(
      `${AUDIT_ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static buildSummary(entries: AdminAuditEntry[]): AdminAuditSummary {
    return {
      totalEntries: entries.length,
      tenantEvents: entries.filter(
        (entry) => entry.entityType === 'tenant',
      ).length,
      userEvents: entries.filter(
        (entry) => entry.entityType === 'user',
      ).length,
      invitedUsers: entries.filter(
        (entry) => entry.actionType === 'user_invited',
      ).length,
      updatedUsers: entries.filter(
        (entry) => entry.actionType === 'user_updated',
      ).length,
      activeActors: new Set(
        entries.map((entry) => entry.actorUserId),
      ).size,
      recentEntries: entries.slice(0, 12),
    };
  }
}
