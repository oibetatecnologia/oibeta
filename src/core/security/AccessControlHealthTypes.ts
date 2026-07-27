import type { PlatformPermissionAction } from './PermissionPolicyService';
import type { PlatformUserProfile } from '../users/UserRegistry';

export interface AccessControlCoverage {
  profiles: number;
  permissions: number;
  routeRules: number;
  protectedDomains: string[];
}

export interface AccessControlHealth {
  authenticated: boolean;
  userId?: string;
  organizationId?: string;
  role?: string;
  profile?: PlatformUserProfile;
  permissions: PlatformPermissionAction[];
  coverage: AccessControlCoverage;
  checkedAt: string;
}

export interface AccessControlSummary extends AccessControlHealth {
  score: number;
  status: 'healthy' | 'attention' | 'critical';
  missingExpectedPermissions: PlatformPermissionAction[];
  issues: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'alta' | 'média' | 'baixa';
    targetTab: string;
    taskTitle: string;
  }>;
}
