import type { NextFunction, Request, Response } from "express";
import { getCurrentUser } from "../auth/currentUser";
import {
  canServerRole,
  getServerPermissions,
  normalizeServerUserProfile,
  resolveRouteAuthorizationRule,
} from "./AuthorizationPolicy";

export interface AuthorizationRequest extends Request {
  authorizationContext?: {
    userId: string;
    organizationId: string;
    role: string;
    profile: string;
    permissions: string[];
  };
}

export function applyAuthorizationPolicy(
  req: AuthorizationRequest,
  res: Response,
  next: NextFunction,
): void {
  const rule = resolveRouteAuthorizationRule(req.path, req.method);

  if (!rule) {
    next();
    return;
  }

  let user;
  try {
    user = getCurrentUser(req);
  } catch {
    res.status(401).json({
      error: "Unauthorized: active session required",
      requiredPermission: rule.action,
    });
    return;
  }

  const profile = normalizeServerUserProfile(user.role);
  const permissions = getServerPermissions(user.role);

  req.authorizationContext = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    profile,
    permissions,
  };

  const developmentFallbackAllowed =
    rule.allowDevelopmentFallback &&
    process.env.NODE_ENV !== "production" &&
    process.env.DATABASE_MODE !== "supabase";

  if (!canServerRole(user.role, rule.action) && !developmentFallbackAllowed) {
    res.status(403).json({
      error: "Forbidden: insufficient permission",
      requiredPermission: rule.action,
      profile,
    });
    return;
  }

  next();
}
