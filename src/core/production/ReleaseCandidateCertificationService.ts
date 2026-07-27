import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CreateReleaseCandidateCertificationInput,
  ReleaseCandidateCertification,
  ReleaseCandidateCertificationSummary,
  UpdateReleaseCandidateControlInput,
} from './ReleaseCandidateCertificationTypes';

const ENDPOINT = '/api/production/release-candidate-certifications';

export class ReleaseCandidateCertificationService {
  static list(
    limit = 100,
  ): Promise<ReleaseCandidateCertification[]> {
    return HttpRepositoryClient.get<
      ReleaseCandidateCertification[]
    >(`${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`);
  }

  static create(
    input: CreateReleaseCandidateCertificationInput,
  ): Promise<ReleaseCandidateCertification> {
    return HttpRepositoryClient.post<
      ReleaseCandidateCertification
    >(ENDPOINT, input);
  }

  static updateControl(
    certificationId: string,
    controlId: string,
    input: UpdateReleaseCandidateControlInput,
  ): Promise<ReleaseCandidateCertification> {
    return HttpRepositoryClient.put<
      ReleaseCandidateCertification
    >(
      `${ENDPOINT}/${encodeURIComponent(
        certificationId,
      )}/controls/${encodeURIComponent(controlId)}`,
      input,
    );
  }

  static approve(
    certificationId: string,
    approvedBy: string,
  ): Promise<ReleaseCandidateCertification> {
    return HttpRepositoryClient.post<
      ReleaseCandidateCertification
    >(
      `${ENDPOINT}/${encodeURIComponent(
        certificationId,
      )}/approve`,
      { approvedBy },
    );
  }

  static buildSummary(
    items: ReleaseCandidateCertification[],
  ): ReleaseCandidateCertificationSummary {
    const approved = items.filter(
      (item) => item.status === 'approved',
    ).length;
    const blocked = items.filter(
      (item) => item.status === 'blocked',
    ).length;
    const attention = items.filter(
      (item) =>
        item.status === 'attention' ||
        item.status === 'draft',
    ).length;
    const latest = items[0];
    const latestApproved = items.find(
      (item) => item.status === 'approved',
    );

    return {
      total: items.length,
      approved,
      attention,
      blocked,
      latest,
      latestApprovedAt: latestApproved?.approvedAt,
      controlCoverage: latest?.score || 0,
      readinessScore:
        items.length === 0
          ? 25
          : latest?.status === 'approved'
            ? 100
            : Math.max(
                0,
                Math.min(
                  95,
                  (latest?.score || 0) -
                    (latest?.blockedControls || 0) * 10,
                ),
              ),
    };
  }
}
