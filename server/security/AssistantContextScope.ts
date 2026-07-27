import type { Request } from "express";
import { getCurrentUser, type CurrentUser } from "../auth/currentUser";
import { normalizeServerUserProfile } from "./AuthorizationPolicy";

export interface AssistantContextScope {
  user: CurrentUser;
  organizationId: string;
  workspaceId: string;
}

export interface AssistantContextIsolationSummary {
  enabled: boolean;
  strictWorkspaceBinding: boolean;
  resolvedRequests: number;
  blockedWorkspaceConflicts: number;
  blockedMissingWorkspace: number;
  developmentFallbacks: number;
  lastBlockedAt?: string;
  rules: {
    organizationFromSessionOnly: boolean;
    tenantWorkspaceConflictBlocked: boolean;
    productionRequiresSessionWorkspace: boolean;
    assistantRoutesUseCentralResolver: boolean;
  };
}

const metrics = {
  resolvedRequests: 0,
  blockedWorkspaceConflicts: 0,
  blockedMissingWorkspace: 0,
  developmentFallbacks: 0,
  lastBlockedAt: undefined as string | undefined,
};

export class AssistantScopeError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstString(value[0]);
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function requestedWorkspaceId(req: Request): string | undefined {
  return firstString(
    req.query?.workspaceId ||
      req.query?.workspace_id ||
      req.headers["x-workspace-id"] ||
      req.body?.workspaceId ||
      req.body?.workspace_id,
  );
}

function markBlocked(): void {
  metrics.lastBlockedAt = new Date().toISOString();
}

export function resolveAssistantContextScope(req: Request): AssistantContextScope {
  const user = getCurrentUser(req);
  const profile = normalizeServerUserProfile(user.role);
  const isMaster = profile === "master_admin";
  const requestedWorkspace = requestedWorkspaceId(req);
  const sessionWorkspace = firstString(user.workspaceId);
  const strict = process.env.NODE_ENV === "production" || process.env.DATABASE_MODE === "supabase";

  if (!user.organizationId) {
    throw new AssistantScopeError(401, "assistant_organization_missing", "A sessão autenticada não possui organização válida.");
  }

  if (!isMaster && sessionWorkspace && requestedWorkspace && requestedWorkspace !== sessionWorkspace) {
    metrics.blockedWorkspaceConflicts += 1;
    markBlocked();
    throw new AssistantScopeError(403, "assistant_workspace_conflict", "O workspace solicitado não pertence à sessão autenticada.");
  }

  let workspaceId = sessionWorkspace;

  if (isMaster && requestedWorkspace) {
    workspaceId = requestedWorkspace;
  } else if (!workspaceId && requestedWorkspace && !strict) {
    workspaceId = requestedWorkspace;
    metrics.developmentFallbacks += 1;
  }

  if (!workspaceId) {
    metrics.blockedMissingWorkspace += 1;
    markBlocked();
    throw new AssistantScopeError(
      strict ? 403 : 400,
      "assistant_workspace_missing",
      strict
        ? "A sessão autenticada precisa estar vinculada a um workspace para acessar o contexto da Beta."
        : "workspaceId é obrigatório para acessar o contexto da Beta.",
    );
  }

  metrics.resolvedRequests += 1;

  return {
    user,
    organizationId: user.organizationId,
    workspaceId,
  };
}

export function getAssistantContextIsolationSummary(): AssistantContextIsolationSummary {
  return {
    enabled: true,
    strictWorkspaceBinding: process.env.NODE_ENV === "production" || process.env.DATABASE_MODE === "supabase",
    resolvedRequests: metrics.resolvedRequests,
    blockedWorkspaceConflicts: metrics.blockedWorkspaceConflicts,
    blockedMissingWorkspace: metrics.blockedMissingWorkspace,
    developmentFallbacks: metrics.developmentFallbacks,
    lastBlockedAt: metrics.lastBlockedAt,
    rules: {
      organizationFromSessionOnly: true,
      tenantWorkspaceConflictBlocked: true,
      productionRequiresSessionWorkspace: true,
      assistantRoutesUseCentralResolver: true,
    },
  };
}
