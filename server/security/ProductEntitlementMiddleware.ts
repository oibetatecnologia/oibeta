import type { NextFunction, Request, Response } from "express";
import { getCurrentUser } from "../auth/currentUser";
import type { TenantProductInstallationService } from "../products/TenantProductInstallationService";
import { normalizeServerUserProfile } from "./AuthorizationPolicy";

interface ProductRouteRule {
  pathPrefix: string;
  productId: string;
}

const PRODUCT_ROUTE_RULES: ProductRouteRule[] = [
  { pathPrefix: "/api/commercial/radar-catalog", productId: "radar-comercial" },
  { pathPrefix: "/api/commercial/radar-connectors", productId: "radar-comercial" },
  { pathPrefix: "/api/commercial/opportunities", productId: "radar-comercial" },
  { pathPrefix: "/api/commercial/tasks", productId: "radar-comercial" },
];

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter(Boolean)));
}

function resolveRule(path: string): ProductRouteRule | undefined {
  return PRODUCT_ROUTE_RULES
    .filter((rule) => path.startsWith(rule.pathPrefix))
    .sort((left, right) => right.pathPrefix.length - left.pathPrefix.length)[0];
}

export function createProductEntitlementMiddleware(
  productInstallations: TenantProductInstallationService,
) {
  return async function enforceProductEntitlement(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const rule = resolveRule(req.path);
    if (!rule) {
      next();
      return;
    }

    let user;
    try {
      user = getCurrentUser(req);
    } catch {
      res.status(401).json({ error: "Unauthorized: active session required" });
      return;
    }

    const profile = normalizeServerUserProfile(user.role);
    const isOiBetaMaster = profile === "master_admin" && user.organizationId === "org-oi-beta";
    if (isOiBetaMaster) {
      next();
      return;
    }

    const tenantProductIds = normalizeIds(user.licensedProductIds);
    const assignedProductIds = normalizeIds(user.productIds);
    const tenantHasProduct = tenantProductIds.includes(rule.productId);
    const userHasProduct = assignedProductIds.length === 0 || assignedProductIds.includes(rule.productId);

    if (!tenantHasProduct || !userHasProduct) {
      res.status(403).json({
        error: "Forbidden: product not licensed for this tenant or user",
        requiredProductId: rule.productId,
        tenantLicensed: tenantHasProduct,
        userAssigned: userHasProduct,
      });
      return;
    }

    try {
      const runtimeActive = await productInstallations.hasActiveInstallation(
        user.organizationId,
        rule.productId,
      );
      if (!runtimeActive) {
        res.status(503).json({
          error: "Product licensed but not operationally provisioned for this tenant",
          requiredProductId: rule.productId,
          runtimeStatus: "not_active",
        });
        return;
      }
    } catch (error) {
      console.error("Product entitlement runtime validation failed:", error);
      res.status(503).json({
        error: "Unable to validate product operational provisioning",
        requiredProductId: rule.productId,
      });
      return;
    }

    next();
  };
}
