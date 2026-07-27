import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  DeploymentValidationRun,
  DeploymentValidationSummary,
} from './DeploymentValidationTypes';

const ENDPOINT = '/api/configuration/deployment/validations';

export class DeploymentValidationService {
  static list(limit = 100): Promise<DeploymentValidationRun[]> {
    return HttpRepositoryClient.get<DeploymentValidationRun[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static execute(): Promise<DeploymentValidationRun> {
    return HttpRepositoryClient.post<DeploymentValidationRun>(
      ENDPOINT,
      {},
    );
  }

  static buildSummary(
    runs: DeploymentValidationRun[],
  ): DeploymentValidationSummary {
    const approvedRuns = runs.filter(
      (run) => run.status === 'approved',
    ).length;
    const attentionRuns = runs.filter(
      (run) => run.status === 'attention',
    ).length;
    const blockedRuns = runs.filter(
      (run) => run.status === 'blocked',
    ).length;
    const latestApproved = runs.find(
      (run) => run.status === 'approved',
    );

    return {
      totalRuns: runs.length,
      approvedRuns,
      attentionRuns,
      blockedRuns,
      latest: runs[0],
      latestApprovedAt: latestApproved?.createdAt,
      readinessScore:
        runs.length === 0
          ? 35
          : Math.max(
              0,
              Math.min(
                100,
                (runs[0]?.score || 0) -
                  blockedRuns * 4 -
                  attentionRuns,
              ),
            ),
    };
  }
}
