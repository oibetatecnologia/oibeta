import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export interface InviteAuditLog {
  id: string;
  organizationId: string;
  projectId: string | null;
  inviteId: string;
  action: 'CREATE' | 'SEND' | 'ACCEPT' | 'DECLINE' | 'EXPIRE' | 'REVOKE';
  performedBy: string | null;
  metadata: any;
  createdAt: string;
}

export class InviteAuditEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Records an audit log event for a specific invitation.
   */
  public async logAction(
    organizationId: string,
    projectId: string | null,
    inviteId: string,
    action: 'CREATE' | 'SEND' | 'ACCEPT' | 'DECLINE' | 'EXPIRE' | 'REVOKE',
    performedBy: string | null,
    metadata: any = {}
  ): Promise<InviteAuditLog> {
    const log = await this.dbAdapter.createElectoralInviteAuditLog({
      id: "log_" + Math.random().toString(36).substr(2, 9),
      organizationId,
      projectId,
      inviteId,
      action,
      performedBy,
      metadata,
      createdAt: new Date().toISOString()
    });

    return log;
  }

  /**
   * Retrieves audit logs for an organization, optionally filtered by a specific invite.
   */
  public async getLogs(organizationId: string, inviteId?: string): Promise<InviteAuditLog[]> {
    return this.dbAdapter.getElectoralInviteAuditLogs(organizationId, inviteId);
  }
}
