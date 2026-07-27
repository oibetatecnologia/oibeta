import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  DeploymentEvidenceType,
  DeploymentReleaseLifecycle,
  DeploymentReleaseLifecycleSummary,
} from './DeploymentReleaseLifecycleTypes';

const ENDPOINT = '/api/configuration/deployment/release-lifecycles';

export class DeploymentReleaseLifecycleService {
  static list(limit = 100): Promise<DeploymentReleaseLifecycle[]> {
    return HttpRepositoryClient.get<DeploymentReleaseLifecycle[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static initialize(
    executionId: string,
    responsible: string,
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.post<DeploymentReleaseLifecycle>(
      ENDPOINT,
      { executionId, responsible },
    );
  }

  static updateChecklist(
    lifecycleId: string,
    itemId: string,
    completed: boolean,
    responsible: string,
    notes?: string,
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.put<DeploymentReleaseLifecycle>(
      `${ENDPOINT}/${encodeURIComponent(lifecycleId)}/checklist/${encodeURIComponent(itemId)}`,
      { completed, responsible, notes },
    );
  }

  static addEvidence(
    lifecycleId: string,
    input: {
      type: DeploymentEvidenceType;
      label: string;
      reference: string;
      recordedBy: string;
    },
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.post<DeploymentReleaseLifecycle>(
      `${ENDPOINT}/${encodeURIComponent(lifecycleId)}/evidences`,
      input,
    );
  }

  static verifyPostDeploy(
    lifecycleId: string,
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.post<DeploymentReleaseLifecycle>(
      `${ENDPOINT}/${encodeURIComponent(lifecycleId)}/verify`,
      {},
    );
  }

  static rollback(
    lifecycleId: string,
    reason: string,
    responsible: string,
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.post<DeploymentReleaseLifecycle>(
      `${ENDPOINT}/${encodeURIComponent(lifecycleId)}/rollback`,
      { reason, responsible },
    );
  }

  static complete(
    lifecycleId: string,
  ): Promise<DeploymentReleaseLifecycle> {
    return HttpRepositoryClient.post<DeploymentReleaseLifecycle>(
      `${ENDPOINT}/${encodeURIComponent(lifecycleId)}/complete`,
      {},
    );
  }

  static buildSummary(
    lifecycles: DeploymentReleaseLifecycle[],
  ): DeploymentReleaseLifecycleSummary {
    const allChecklist = lifecycles.flatMap((item) => item.checklist);
    const checklistCompletion = allChecklist.length === 0
      ? 0
      : Math.round(
          (allChecklist.filter((item) => item.completed).length /
            allChecklist.length) *
            100,
        );
    const evidenceCompletion = lifecycles.length === 0
      ? 0
      : Math.round(
          (lifecycles.reduce(
            (total, item) => total + Math.min(item.evidences.length, 5),
            0,
          ) /
            (lifecycles.length * 5)) *
            100,
        );
    const completed = lifecycles.filter(
      (item) => item.status === 'completed',
    ).length;
    const rollbackRequired = lifecycles.filter(
      (item) => item.status === 'rollback_required',
    ).length;
    const rolledBack = lifecycles.filter(
      (item) => item.status === 'rolled_back',
    ).length;
    const productionCompleted = lifecycles.some(
      (item) => item.target === 'production' && item.status === 'completed',
    );

    return {
      total: lifecycles.length,
      preparing: lifecycles.filter((item) =>
        ['preparing', 'deployed'].includes(item.status),
      ).length,
      verified: lifecycles.filter((item) => item.status === 'verified').length,
      completed,
      rollbackRequired,
      rolledBack,
      checklistCompletion,
      evidenceCompletion,
      latest: lifecycles[0],
      productionCompleted,
      readinessScore: lifecycles.length === 0
        ? 20
        : Math.max(
            0,
            Math.min(
              100,
              (productionCompleted ? 100 : completed > 0 ? 80 : 55) -
                rollbackRequired * 15 -
                rolledBack * 5,
            ),
          ),
    };
  }
}
