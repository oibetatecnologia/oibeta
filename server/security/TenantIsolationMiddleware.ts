import type { NextFunction, Request, Response } from "express";
import { getCurrentUser } from "../auth/currentUser";
import { normalizeServerUserProfile } from "./AuthorizationPolicy";

export interface TenantIsolationSummary {
  enabled: boolean;
  strictInProduction: boolean;
  protectedRequests: number;
  blockedCrossTenantAttempts: number;
  normalizedPayloads: number;
  lastBlockedAt?: string;
  rules: {
    sessionOrganizationIsAuthoritative: boolean;
    workspaceMismatchBlocked: boolean;
    tenantPathMismatchBlocked: boolean;
    commercialTenantMismatchBlocked: boolean;
  };
}

const metrics = {
  protectedRequests: 0,
  blockedCrossTenantAttempts: 0,
  normalizedPayloads: 0,
  lastBlockedAt: undefined as string | undefined,
};

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstString(value[0]);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function requestedOrganizationId(req: Request): string | undefined {
  return firstString(
    req.headers["x-organization-id"] ||
      req.query?.organizationId ||
      req.query?.organization_id ||
      req.body?.organizationId ||
      req.body?.organization_id,
  );
}

function requestedWorkspaceId(req: Request): string | undefined {
  return firstString(
    req.headers["x-workspace-id"] ||
      req.query?.workspaceId ||
      req.query?.workspace_id ||
      req.body?.workspaceId ||
      req.body?.workspace_id,
  );
}

function tenantIdFromPath(path: string): string | undefined {
  const match = path.match(/^\/api\/admin\/tenants\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function reject(res: Response, reason: string, details: Record<string, unknown>): void {
  metrics.blockedCrossTenantAttempts += 1;
  metrics.lastBlockedAt = new Date().toISOString();
  res.status(403).json({
    error: "Forbidden: tenant scope mismatch",
    reason,
    ...details,
  });
}

export function enforceTenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth") || req.path.startsWith("/api/health") || req.path === "/api/status") {
    next();
    return;
  }

  let user;
  try {
    user = getCurrentUser(req);
  } catch {
    next();
    return;
  }

  metrics.protectedRequests += 1;
  const profile = normalizeServerUserProfile(user.role);
  const isMaster = profile === "master_admin";
  const requestOrganizationId = requestedOrganizationId(req);
  const requestWorkspaceId = requestedWorkspaceId(req);

  if (!isMaster && requestOrganizationId && requestOrganizationId !== user.organizationId) {
    reject(res, "organization_id_conflict", {
      sessionOrganizationId: user.organizationId,
      requestedOrganizationId: requestOrganizationId,
    });
    return;
  }

  if (!isMaster && user.workspaceId && requestWorkspaceId && requestWorkspaceId !== user.workspaceId) {
    reject(res, "workspace_id_conflict", {
      sessionWorkspaceId: user.workspaceId,
      requestedWorkspaceId: requestWorkspaceId,
    });
    return;
  }

  const pathTenantId = tenantIdFromPath(req.path);
  if (!isMaster && pathTenantId && pathTenantId !== user.organizationId && pathTenantId !== user.tenantId) {
    reject(res, "tenant_path_conflict", {
      sessionOrganizationId: user.organizationId,
      requestedTenantId: pathTenantId,
    });
    return;
  }

  const commercialTenantId = firstString(req.query?.tenantId || req.body?.tenantId);
  if (!isMaster && commercialTenantId && commercialTenantId !== user.organizationId && commercialTenantId !== user.tenantId) {
    reject(res, "commercial_tenant_conflict", {
      sessionOrganizationId: user.organizationId,
      requestedTenantId: commercialTenantId,
    });
    return;
  }

  if (!isMaster && req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    let normalized = false;
    if (req.body.organizationId !== user.organizationId) {
      req.body.organizationId = user.organizationId;
      normalized = true;
    }
    if (user.workspaceId && req.body.workspaceId !== user.workspaceId) {
      req.body.workspaceId = user.workspaceId;
      normalized = true;
    }
    if (normalized) metrics.normalizedPayloads += 1;
  }

  next();
}

export function getTenantIsolationSummary(): TenantIsolationSummary {
  return {
    enabled: true,
    strictInProduction: process.env.NODE_ENV === "production" || process.env.DATABASE_MODE === "supabase",
    protectedRequests: metrics.protectedRequests,
    blockedCrossTenantAttempts: metrics.blockedCrossTenantAttempts,
    normalizedPayloads: metrics.normalizedPayloads,
    lastBlockedAt: metrics.lastBlockedAt,
    rules: {
      sessionOrganizationIsAuthoritative: true,
      workspaceMismatchBlocked: true,
      tenantPathMismatchBlocked: true,
      commercialTenantMismatchBlocked: true,
    },
  };
}
