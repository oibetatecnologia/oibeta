import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CreateDeploymentReleaseExecutionInput,
  DeploymentReleaseExecution,
  DeploymentReleaseExecutionSummary,
} from './DeploymentReleaseExecutionTypes';

const ENDPOINT = '/api/configuration/deployment/release-executions';

export class DeploymentReleaseExecutionService {
  static list(limit = 100): Promise<DeploymentReleaseExecution[]> {
    return HttpRepositoryClient.get<DeploymentReleaseExecution[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static create(
    input: CreateDeploymentReleaseExecutionInput,
  ): Promise<{
    execution: DeploymentReleaseExecution;
  }> {
    return HttpRepositoryClient.post<{
      execution: DeploymentReleaseExecution;
    }>(ENDPOINT, input);
  }

  static buildSummary(
    executions: DeploymentReleaseExecution[],
  ): DeploymentReleaseExecutionSummary {
    const successful = executions.filter(
      (item) => item.status === 'success',
    ).length;
    const failed = executions.filter(
      (item) => item.status === 'failed',
    ).length;
    const rolledBack = executions.filter(
      (item) => item.status === 'rolled_back',
    ).length;
    const productionExecuted = executions.some(
      (item) =>
        item.target === 'production' &&
        item.status === 'success',
    );
    const stagingExecuted = executions.some(
      (item) =>
        item.target === 'staging' &&
        item.status === 'success',
    );

    return {
      total: executions.length,
      successful,
      failed,
      rolledBack,
      productionExecuted,
      stagingExecuted,
      latest: executions[0],
      readinessScore:
        executions.length === 0
          ? 25
          : Math.max(
              0,
              Math.min(
                100,
                (productionExecuted
                  ? 100
                  : stagingExecuted
                    ? 75
                    : 45) -
                  failed * 8 -
                  rolledBack * 4,
              ),
            ),
    };
  }
}
