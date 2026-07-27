export type ServerPermissionAction =
  | "platform_admin"
  | "tenant_manage"
  | "users_manage"
  | "organization_manage"
  | "products_license"
  | "commercial_operate"
  | "finance_operate"
  | "support_operate"
  | "environment_read"
  | "environment_manage"
  | "observability_manage"
  | "audit_read"
  | "public_read";

export type ServerUserProfile =
  | "master_admin"
  | "tenant_admin"
  | "executive"
  | "manager"
  | "operator"
  | "auditor"
  | "public_user";

export interface RouteAuthorizationRule {
  id: string;
  pathPrefix: string;
  methods?: string[];
  action: ServerPermissionAction;
  allowDevelopmentFallback?: boolean;
}

const PROFILE_PERMISSIONS: Record<ServerUserProfile, ServerPermissionAction[]> = {
  master_admin: [
    "platform_admin",
    "tenant_manage",
    "users_manage",
    "organization_manage",
    "products_license",
    "commercial_operate",
    "finance_operate",
    "support_operate",
    "environment_read",
    "environment_manage",
    "observability_manage",
    "audit_read",
  ],
  tenant_admin: [
    "tenant_manage",
    "users_manage",
    "organization_manage",
    "commercial_operate",
    "finance_operate",
    "support_operate",
    "environment_read",
    "environment_manage",
    "observability_manage",
    "audit_read",
  ],
  executive: [
    "organization_manage",
    "commercial_operate",
    "finance_operate",
    "support_operate",
    "environment_read",
    "environment_manage",
    "observability_manage",
    "audit_read",
  ],
  manager: [
    "users_manage",
    "commercial_operate",
    "support_operate",
    "environment_read",
    "observability_manage",
    "audit_read",
  ],
  operator: [
    "commercial_operate",
    "support_operate",
    "environment_read",
  ],
  auditor: [
    "environment_read",
    "audit_read",
  ],
  public_user: [
    "public_read",
  ],
};

export const ROUTE_AUTHORIZATION_RULES: RouteAuthorizationRule[] = [
  {
    id: "release-candidate-certifications-read",
    pathPrefix: "/api/production/release-candidate-certifications",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "release-candidate-certifications-manage",
    pathPrefix: "/api/production/release-candidate-certifications",
    methods: ["POST", "PUT"],
    action: "platform_admin",
  },
  { id: "beta-governance-read", pathPrefix: "/api/beta/governance", methods: ["GET"], action: "audit_read", allowDevelopmentFallback: true },
  { id: "beta-governance-manage", pathPrefix: "/api/beta/governance", methods: ["POST", "PUT"], action: "organization_manage" },
  {
    id: "admin-audit",
    pathPrefix: "/api/admin/audit",
    methods: ["GET"],
    action: "audit_read",
  },
  {
    id: "admin-environments-read",
    pathPrefix: "/api/admin/environments",
    methods: ["GET"],
    action: "environment_read",
  },
  {
    id: "admin-environments-manage",
    pathPrefix: "/api/admin/environments",
    action: "environment_manage",
  },
  {
    id: "admin-governance-read",
    pathPrefix: "/api/admin/governance",
    methods: ["GET"],
    action: "audit_read",
  },
  {
    id: "admin-governance-manage",
    pathPrefix: "/api/admin/governance",
    methods: ["POST", "PUT"],
    action: "users_manage",
  },
  {
    id: "customer-operations-read",
    pathPrefix: "/api/customer-operations",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "customer-operations-manage",
    pathPrefix: "/api/customer-operations/plans",
    methods: ["POST"],
    action: "commercial_operate",
  },
  {
    id: "admin-commercial-contracts-read",
    pathPrefix: "/api/admin/commercial-contracts",
    methods: ["GET"],
    action: "finance_operate",
    allowDevelopmentFallback: true,
  },
  {
    id: "admin-commercial-contracts-manage",
    pathPrefix: "/api/admin/commercial-contracts",
    methods: ["POST"],
    action: "products_license",
  },
  {
    id: "admin-users",
    pathPrefix: "/api/admin/users",
    action: "users_manage",
  },
  {
    id: "admin-tenants",
    pathPrefix: "/api/admin/tenants",
    action: "platform_admin",
  },
  {
    id: "admin-fallback",
    pathPrefix: "/api/admin",
    action: "platform_admin",
  },
  {
    id: "commercial-opportunities",
    pathPrefix: "/api/commercial/opportunities",
    action: "commercial_operate",
  },
  {
    id: "commercial-tasks",
    pathPrefix: "/api/commercial/tasks",
    action: "commercial_operate",
  },
  {
    id: "crm-gov-clients",
    pathPrefix: "/api/crm-gov/clients",
    action: "commercial_operate",
  },
  {
    id: "deployment-release-lifecycles-read",
    pathPrefix: "/api/configuration/deployment/release-lifecycles",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "deployment-release-lifecycles-manage",
    pathPrefix: "/api/configuration/deployment/release-lifecycles",
    methods: ["POST", "PUT"],
    action: "environment_manage",
  },
  {
    id: "deployment-release-executions-read",
    pathPrefix: "/api/configuration/deployment/release-executions",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "deployment-release-executions-manage",
    pathPrefix: "/api/configuration/deployment/release-executions",
    methods: ["POST"],
    action: "environment_manage",
  },
  {
    id: "deployment-release-approvals-read",
    pathPrefix: "/api/configuration/deployment/release-approvals",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "deployment-release-approvals-manage",
    pathPrefix: "/api/configuration/deployment/release-approvals",
    methods: ["POST", "PUT"],
    action: "environment_manage",
  },
  {
    id: "deployment-validations-read",
    pathPrefix: "/api/configuration/deployment/validations",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "deployment-validations-execute",
    pathPrefix: "/api/configuration/deployment/validations",
    methods: ["POST"],
    action: "observability_manage",
  },
  {
    id: "deployment-connectivity-read",
    pathPrefix: "/api/configuration/deployment/connectivity",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "deployment-configuration-read",
    pathPrefix: "/api/configuration/deployment",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-maintenance-scheduler-read",
    pathPrefix: "/api/notification-maintenance/scheduler",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-maintenance-scheduler-run",
    pathPrefix: "/api/notification-maintenance/scheduler/run",
    methods: ["POST"],
    action: "observability_manage",
  },
  {
    id: "notification-maintenance-read",
    pathPrefix: "/api/notification-maintenance",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-maintenance-execute",
    pathPrefix: "/api/notification-maintenance/execute",
    methods: ["POST"],
    action: "observability_manage",
  },
  {
    id: "notification-retry-runs-read",
    pathPrefix: "/api/notification-deliveries/retry-runs",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-delivery-scheduler-read",
    pathPrefix: "/api/notification-deliveries/retry-scheduler",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-delivery-scheduler-run",
    pathPrefix: "/api/notification-deliveries/retry-scheduler/run",
    methods: ["POST"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-deliveries-retry",
    pathPrefix: "/api/notification-deliveries",
    methods: ["POST"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-deliveries-read",
    pathPrefix: "/api/notification-deliveries",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-preferences-read",
    pathPrefix: "/api/notification-preferences",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notification-preferences-update",
    pathPrefix: "/api/notification-preferences",
    methods: ["PUT"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notifications-read",
    pathPrefix: "/api/notifications",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "notifications-update",
    pathPrefix: "/api/notifications",
    methods: ["PUT"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "observability-incident-alerts",
    pathPrefix: "/api/observability/incident-alerts",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "observability-incident-escalation",
    pathPrefix: "/api/observability/incidents",
    methods: ["POST"],
    action: "observability_manage",
  },
  {
    id: "observability-incidents-read",
    pathPrefix: "/api/observability/incidents",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "observability-incidents-manage",
    pathPrefix: "/api/observability/incidents",
    action: "observability_manage",
  },
  {
    id: "runtime-observability",
    pathPrefix: "/api/observability",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "persistence-health",
    pathPrefix: "/api/persistence",
    methods: ["GET"],
    action: "audit_read",
    allowDevelopmentFallback: true,
  },
  {
    id: "exports",
    pathPrefix: "/api",
    methods: ["GET"],
    action: "audit_read",
  },
];

export function normalizeServerUserProfile(role?: string): ServerUserProfile {
  const normalized = String(role || "").trim().toLowerCase();

  if (["master_admin", "super_admin", "superadmin", "owner"].includes(normalized)) {
    return "master_admin";
  }

  if (["tenant_admin", "admin"].includes(normalized)) {
    return "tenant_admin";
  }

  if (["executive", "prefeito", "presidente"].includes(normalized)) {
    return "executive";
  }

  if (["manager", "gestor", "secretario", "secretário"].includes(normalized)) {
    return "manager";
  }

  if (["operator", "user", "usuario", "usuário", "servidor"].includes(normalized)) {
    return "operator";
  }

  if (["auditor", "controlador"].includes(normalized)) {
    return "auditor";
  }

  return "public_user";
}

export function getServerPermissions(
  role?: string,
): ServerPermissionAction[] {
  return PROFILE_PERMISSIONS[normalizeServerUserProfile(role)];
}

export function canServerRole(
  role: string | undefined,
  action: ServerPermissionAction,
): boolean {
  return getServerPermissions(role).includes(action);
}

export function resolveRouteAuthorizationRule(
  path: string,
  method: string,
): RouteAuthorizationRule | undefined {
  const normalizedMethod = method.toUpperCase();

  if (path.startsWith("/api/auth")) return undefined;

  if (
    path.includes("/export") ||
    path.includes("/csv") ||
    path.includes("/xlsx") ||
    path.includes("/pdf")
  ) {
    return {
      id: "dynamic-export",
      pathPrefix: path,
      methods: [normalizedMethod],
      action: "audit_read",
    };
  }

  return ROUTE_AUTHORIZATION_RULES.find((rule) => {
    if (!path.startsWith(rule.pathPrefix)) return false;
    if (!rule.methods || rule.methods.length === 0) return true;

    return rule.methods.includes(normalizedMethod);
  });
}

export function getAuthorizationCoverageSummary(): {
  profiles: number;
  permissions: number;
  routeRules: number;
  protectedDomains: string[];
} {
  const protectedDomains = Array.from(
    new Set(
      ROUTE_AUTHORIZATION_RULES.map((rule) =>
        rule.pathPrefix.split("/").filter(Boolean).slice(0, 3).join("/"),
      ),
    ),
  );

  return {
    profiles: Object.keys(PROFILE_PERMISSIONS).length,
    permissions: new Set(Object.values(PROFILE_PERMISSIONS).flat()).size,
    routeRules: ROUTE_AUTHORIZATION_RULES.length,
    protectedDomains,
  };
}
