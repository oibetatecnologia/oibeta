import type { AdminUserProfile, AdminUserStatus } from "./AdminDirectoryTypes";

export type AdminAccessReviewStatus = "open" | "completed";
export type AdminAccessReviewDecision = "pending" | "certified" | "suspended" | "adjusted";

export interface AdminAccessReviewItem {
  userId: string;
  name: string;
  email: string;
  profile: AdminUserProfile;
  status: AdminUserStatus;
  superiorUserId?: string;
  productIds: string[];
  riskFlags: string[];
  decision: AdminAccessReviewDecision;
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

export interface AdminAccessReview {
  id: string;
  organizationId: string;
  status: AdminAccessReviewStatus;
  items: AdminAccessReviewItem[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface AdminGovernanceOverview {
  organizationId: string;
  users: number;
  activeUsers: number;
  invitedUsers: number;
  pausedUsers: number;
  privilegedUsers: number;
  usersWithoutProducts: number;
  usersWithoutSuperior: number;
  openReviews: number;
  pendingDecisions: number;
  governanceScore: number;
}

export interface DecideAdminAccessReviewItemInput {
  decision: Exclude<AdminAccessReviewDecision, "pending">;
  decidedBy: string;
  notes?: string;
  profile?: AdminUserProfile;
  status?: AdminUserStatus;
  superiorUserId?: string;
  productIds?: string[];
}
