import type { NextFunction, Request, Response } from "express";
import type { CurrentUser } from "./currentUser";

interface SupabaseLikeClient {
  auth: {
    getUser(token: string): Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error?: { message?: string } | null;
    }>;
  };
  from(table: string): {
    select(columns: string): any;
  };
}

export interface SessionRequest extends Request {
  currentUser?: CurrentUser;
  sessionSource?: "supabase" | "development_headers" | "none";
}

const OI_BETA_ORGANIZATION_IDS = new Set(["org-oi-beta", "org_oi_beta"]);

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function resolveBearerToken(req: Request): string | undefined {
  const authorization = readHeader(req, "authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;

  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

function resolveDevelopmentHeaderUser(req: Request): CurrentUser | null {
  const userId = readHeader(req, "x-user-id");
  const organizationId = readHeader(req, "x-organization-id");

  if (!userId || !organizationId) return null;

  return {
    id: userId,
    organizationId,
    workspaceId: readHeader(req, "x-workspace-id"),
    name: readHeader(req, "x-user-name") || "Douglas",
    email: readHeader(req, "x-user-email") || "douglas.ujs@gmail.com",
    role: readHeader(req, "x-user-role") || "operator",
    source: "development_headers",
  };
}

export function createSessionResolver(input: {
  dbMode: string;
  getAuthClient: () => SupabaseLikeClient;
  getDatabaseClient: () => SupabaseLikeClient;
}) {
  return async function resolveSession(
    req: SessionRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    req.sessionSource = "none";

    const token = resolveBearerToken(req);
    if (input.dbMode === "supabase" && token) {
      try {
        const authClient = input.getAuthClient();
        const databaseClient = input.getDatabaseClient();
        const {
          data: { user: authUser },
          error: authError,
        } = await authClient.auth.getUser(token);

        if (!authUser || authError) {
          next();
          return;
        }

        const { data: dbUser, error: profileError } = await databaseClient
          .from("users")
          .select("id,name,email,organization_id,tenant_id,role,profile,product_ids")
          .eq("id", authUser.id)
          .single();

        if (profileError || !dbUser) {
          next();
          return;
        }

        const { data: memberships } = await databaseClient
          .from("user_organization_memberships")
          .select("organization_id,role,status,is_primary")
          .eq("user_id", authUser.id)
          .eq("status", "ACTIVE");

        const primaryMembership = Array.isArray(memberships)
          ? memberships.find((membership: any) => membership.is_primary) || memberships[0]
          : undefined;
        const organizationId = primaryMembership?.organization_id || dbUser.organization_id;
        if (!organizationId) {
          next();
          return;
        }

        const role = primaryMembership?.role || dbUser.profile || dbUser.role || "operator";
        const isInternalOiBetaUser = OI_BETA_ORGANIZATION_IDS.has(
          String(organizationId).trim().toLowerCase(),
        );

        const [{ data: organization }, { data: licenses }] = await Promise.all([
          databaseClient.from("organizations").select("id,licensed_product_ids").eq("id", organizationId).single(),
          databaseClient.from("product_licenses").select("product_id,status").eq("organization_id", organizationId).eq("status", "ACTIVE"),
        ]);

        let workspaceId: string | undefined;
        if (!isInternalOiBetaUser) {
          const { data: workspaceMemberships } = await databaseClient
            .from("user_workspace_memberships")
            .select("workspace_id,role,status")
            .eq("user_id", authUser.id)
            .eq("organization_id", organizationId)
            .eq("status", "ACTIVE");
          workspaceId = Array.isArray(workspaceMemberships)
            ? workspaceMemberships[0]?.workspace_id
            : undefined;
        }

        req.currentUser = {
          id: dbUser.id,
          name: dbUser.name || authUser.email?.split("@")[0] || "Usuário",
          email: dbUser.email || authUser.email || "",
          organizationId,
          tenantId: dbUser.tenant_id || organizationId,
          workspaceId,
          role,
          productIds: Array.isArray(dbUser.product_ids) ? dbUser.product_ids : [],
          licensedProductIds: Array.isArray(licenses) && licenses.length > 0
            ? licenses.map((license: any) => license.product_id)
            : Array.isArray(organization?.licensed_product_ids) ? organization.licensed_product_ids : [],
          source: "supabase",
        };
        req.sessionSource = "supabase";
      } catch (error) {
        console.warn("SessionResolver: failed to validate Supabase session", error);
      }

      next();
      return;
    }

    const allowDevelopmentHeaders =
      input.dbMode !== "supabase" &&
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEVELOPMENT_HEADER_AUTH !== "false";

    if (allowDevelopmentHeaders) {
      const headerUser = resolveDevelopmentHeaderUser(req);
      if (headerUser) {
        req.currentUser = headerUser;
        req.sessionSource = "development_headers";
      }
    }

    next();
  };
}
