export type DeploymentConnectivityStatus =
  | "healthy"
  | "attention"
  | "critical"
  | "skipped";

export interface DeploymentConnectivityCheck {
  id: string;
  label: string;
  target: string;
  status: DeploymentConnectivityStatus;
  durationMs: number;
  description: string;
  httpStatus?: number;
}

export interface DeploymentConnectivitySummary {
  status: Exclude<DeploymentConnectivityStatus, "skipped">;
  score: number;
  productionBlocked: boolean;
  healthy: number;
  attention: number;
  critical: number;
  skipped: number;
  checks: DeploymentConnectivityCheck[];
  checkedAt: string;
}
