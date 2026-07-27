import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  AdminAccessReview,
  AdminGovernanceOverview,
  DecideAdminAccessReviewItemInput,
} from './AdminAccessReviewTypes';

const ENDPOINT = '/api/admin/governance/access-reviews';

export class AdminAccessReviewService {
  static overview(): Promise<AdminGovernanceOverview> {
    return HttpRepositoryClient.get<AdminGovernanceOverview>(
      '/api/admin/governance/overview',
    );
  }

  static list(limit = 50): Promise<AdminAccessReview[]> {
    return HttpRepositoryClient.get<AdminAccessReview[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 200))}`,
    );
  }

  static create(): Promise<AdminAccessReview> {
    return HttpRepositoryClient.post<AdminAccessReview>(
      ENDPOINT,
      {},
    );
  }

  static decide(
    reviewId: string,
    userId: string,
    input: DecideAdminAccessReviewItemInput,
  ): Promise<AdminAccessReview> {
    return HttpRepositoryClient.put<AdminAccessReview>(
      `${ENDPOINT}/${encodeURIComponent(reviewId)}/users/${encodeURIComponent(userId)}`,
      input,
    );
  }
}
