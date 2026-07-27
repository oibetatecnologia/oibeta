import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CreateDeploymentReleaseApprovalInput,
  DecideDeploymentReleaseApprovalInput,
  DeploymentReleaseApproval,
  DeploymentReleaseApprovalSummary,
} from './DeploymentReleaseApprovalTypes';

const ENDPOINT = '/api/configuration/deployment/release-approvals';

export class DeploymentReleaseApprovalService {
  static list(limit = 100): Promise<DeploymentReleaseApproval[]> {
    return HttpRepositoryClient.get<DeploymentReleaseApproval[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static create(
    input: CreateDeploymentReleaseApprovalInput,
  ): Promise<DeploymentReleaseApproval> {
    return HttpRepositoryClient.post<DeploymentReleaseApproval>(
      ENDPOINT,
      input,
    );
  }

  static decide(
    approvalId: string,
    input: DecideDeploymentReleaseApprovalInput,
  ): Promise<DeploymentReleaseApproval> {
    return HttpRepositoryClient.put<DeploymentReleaseApproval>(
      `${ENDPOINT}/${encodeURIComponent(approvalId)}`,
      input,
    );
  }

  static buildSummary(
    approvals: DeploymentReleaseApproval[],
  ): DeploymentReleaseApprovalSummary {
    const pending = approvals.filter(
      (approval) => approval.status === 'pending',
    ).length;
    const approved = approvals.filter(
      (approval) => approval.status === 'approved',
    ).length;
    const rejected = approvals.filter(
      (approval) => approval.status === 'rejected',
    ).length;
    const cancelled = approvals.filter(
      (approval) => approval.status === 'cancelled',
    ).length;
    const productionApproved = approvals.some(
      (approval) =>
        approval.target === 'production' &&
        approval.status === 'approved',
    );
    const stagingApproved = approvals.some(
      (approval) =>
        approval.target === 'staging' &&
        approval.status === 'approved',
    );

    return {
      total: approvals.length,
      pending,
      approved,
      rejected,
      cancelled,
      productionApproved,
      stagingApproved,
      latest: approvals[0],
      readinessScore:
        approvals.length === 0
          ? 30
          : Math.max(
              0,
              Math.min(
                100,
                (productionApproved
                  ? 100
                  : stagingApproved
                    ? 75
                    : 45) -
                  pending * 3 -
                  rejected * 5,
              ),
            ),
    };
  }
}
