export type BetaGovernanceAssetType = "knowledge" | "memory" | "automation" | "skill";
export type BetaGovernanceAssetStatus = "draft" | "active" | "paused" | "archived";
export type BetaGovernanceSensitivity = "public" | "internal" | "confidential" | "restricted";

export interface BetaGovernanceAsset {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: BetaGovernanceAssetType;
  title: string;
  description: string;
  status: BetaGovernanceAssetStatus;
  sensitivity: BetaGovernanceSensitivity;
  owner: string;
  source?: string;
  version: string;
  tags: string[];
  trigger?: string;
  action?: string;
  requiresApproval: boolean;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertBetaGovernanceAssetInput {
  id?: string;
  type: BetaGovernanceAssetType;
  title: string;
  description: string;
  status?: BetaGovernanceAssetStatus;
  sensitivity?: BetaGovernanceSensitivity;
  owner: string;
  source?: string;
  version?: string;
  tags?: string[];
  trigger?: string;
  action?: string;
  requiresApproval?: boolean;
  nextReviewAt?: string;
}

export interface BetaGovernanceSummary {
  total: number;
  active: number;
  draft: number;
  paused: number;
  archived: number;
  knowledge: number;
  memories: number;
  automations: number;
  skills: number;
  overdueReviews: number;
  restrictedAssets: number;
  automationsWithoutApproval: number;
  governanceScore: number;
}
