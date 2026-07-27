export type CurrentUserSource = "supabase" | "development_headers" | "active_session" | "development_seed";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  tenantId?: string;
  workspaceId?: string;
  role: string;
  productIds?: string[];
  licensedProductIds?: string[];
  source?: CurrentUserSource;
}

let activeSessionUser: CurrentUser | null = null;

export function setActiveSessionUser(user: CurrentUser | null): void {
  activeSessionUser = user;
}

export function getCurrentUser(req?: any): CurrentUser {
  // 1. If request has active user attached by middleware
  if (req && req.currentUser) {
    return req.currentUser;
  }

  const allowDevelopmentHeaders =
    process.env.DATABASE_MODE !== "supabase" &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEVELOPMENT_HEADER_AUTH !== "false";

  // 2. Custom identity headers are development-only.
  if (req && allowDevelopmentHeaders) {
    const userId = req.headers["x-user-id"] || req.headers["X-User-Id"];
    const orgId = req.headers["x-organization-id"] || req.headers["X-Organization-Id"];
    const name = req.headers["x-user-name"] || req.headers["X-User-Name"];
    const email = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const role = req.headers["x-user-role"] || req.headers["X-User-Role"];

    if (userId && orgId) {
      return {
        id: Array.isArray(userId) ? userId[0] : userId,
        name: (Array.isArray(name) ? name[0] : name) || "Douglas",
        email: (Array.isArray(email) ? email[0] : email) || "douglas.ujs@gmail.com",
        organizationId: Array.isArray(orgId) ? orgId[0] : orgId,
        role: (Array.isArray(role) ? role[0] : role) || "operator",
        source: "development_headers",
      };
    }
  }

  // 3. Global in-memory session is restricted to local JSON development.
  if (activeSessionUser && process.env.DATABASE_MODE !== "supabase") {
    return { ...activeSessionUser, source: activeSessionUser.source || "active_session" };
  }

  // 4. Supabase and production require a validated request session.
  if (process.env.DATABASE_MODE === "supabase" || process.env.NODE_ENV === "production") {
    throw new Error("UNAUTHORIZED: Active validated session required.");
  }

  // 5. Safe local development seed.
  return {
    id: "dev-user-douglas",
    name: "Douglas",
    email: "douglas.ujs@gmail.com",
    organizationId: "org-oi-beta",
    role: "master_admin",
    source: "development_seed",
  };
}
