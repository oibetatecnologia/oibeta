export type ReleaseCandidateControlStatus =
  | "pending"
  | "approved"
  | "blocked";

export type ReleaseCandidateControlCategory =
  | "quality"
  | "security"
  | "privacy"
  | "continuity"
  | "operations"
  | "commercial"
  | "product";

export interface ReleaseCandidateControl {
  id: string;
  category: ReleaseCandidateControlCategory;
  title: string;
  description: string;
  required: boolean;
  status: ReleaseCandidateControlStatus;
  owner?: string;
  evidence?: string;
  reviewedAt?: string;
  expiresAt?: string;
  notes?: string;
}

export type ReleaseCandidateCertificationStatus =
  | "draft"
  | "attention"
  | "approved"
  | "blocked";

export interface ReleaseCandidateCertification {
  id: string;
  organizationId: string;
  workspaceId: string;
  version: string;
  status: ReleaseCandidateCertificationStatus;
  controls: ReleaseCandidateControl[];
  score: number;
  approvedControls: number;
  pendingControls: number;
  blockedControls: number;
  requiredControls: number;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseCandidateCertificationInput {
  version: string;
  createdBy: string;
}

export interface UpdateReleaseCandidateControlInput {
  status: ReleaseCandidateControlStatus;
  owner: string;
  evidence?: string;
  expiresAt?: string;
  notes?: string;
}

export interface ReleaseCandidateCertificationSummary {
  total: number;
  approved: number;
  attention: number;
  blocked: number;
  latest?: ReleaseCandidateCertification;
  latestApprovedAt?: string;
  controlCoverage: number;
  readinessScore: number;
}
