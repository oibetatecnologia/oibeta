export type AdminAuditAction =
  | 'tenant_created'
  | 'tenant_recovered'
  | 'user_invited'
  | 'user_updated'
  | 'product_licenses_updated'
  | 'environment_updated'
  | 'deployment_recorded'
  | 'directory_viewed'
  | 'access_review_created'
  | 'access_review_decided'
  | 'commercial_contract_updated'
  | 'customer_operations_updated'
  | 'rc_certification_created'
  | 'rc_certification_approved';

export type AdminAuditEntity = 'tenant' | 'user' | 'directory';

export interface AdminAuditEntry {
  id: string;
  actorUserId: string;
  actorName?: string;
  organizationId: string;
  actionType: AdminAuditAction;
  entityType: AdminAuditEntity;
  entityId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditSummary {
  totalEntries: number;
  tenantEvents: number;
  userEvents: number;
  invitedUsers: number;
  updatedUsers: number;
  activeActors: number;
  recentEntries: AdminAuditEntry[];
}
