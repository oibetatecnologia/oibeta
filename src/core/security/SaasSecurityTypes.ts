export type SaasSecurityStatus = 'healthy' | 'attention' | 'critical';

export interface SaasSecurityGate {
  id: string;
  title: string;
  score: number;
  status: SaasSecurityStatus;
  evidence: string;
  taskTitle: string;
}

export interface SaasSecurityReadiness {
  score: number;
  status: SaasSecurityStatus;
  databaseMode: string;
  tablesReady: number;
  tablesRequired: number;
  rlsEnabledTables: number;
  membershipTablesReady: boolean;
  licenseTableReady: boolean;
  auditTableReady: boolean;
  sessionSource: string;
  authenticated: boolean;
  organizationId?: string;
  workspaceId?: string;
  role?: string;
  checkedAt: string;
  gates: SaasSecurityGate[];
}
