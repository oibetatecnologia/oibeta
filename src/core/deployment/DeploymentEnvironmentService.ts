import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CreateDeploymentRecordInput,
  DeploymentEnvironment,
  DeploymentEnvironmentSummary,
  DeploymentRecord,
  UpdateDeploymentEnvironmentInput,
} from './DeploymentEnvironmentTypes';

const ENDPOINT = '/api/admin/environments';

export class DeploymentEnvironmentService {
  static list(
    tenantId: string,
  ): Promise<DeploymentEnvironment[]> {
    return HttpRepositoryClient.get<DeploymentEnvironment[]>(
      `${ENDPOINT}?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  static update(
    environmentId: string,
    input: UpdateDeploymentEnvironmentInput,
  ): Promise<DeploymentEnvironment> {
    return HttpRepositoryClient.put<DeploymentEnvironment>(
      `${ENDPOINT}/${encodeURIComponent(environmentId)}`,
      input,
    );
  }

  static listDeployments(
    environmentId: string,
    limit = 50,
  ): Promise<DeploymentRecord[]> {
    return HttpRepositoryClient.get<DeploymentRecord[]>(
      `${ENDPOINT}/${encodeURIComponent(environmentId)}/deployments?limit=${limit}`,
    );
  }

  static recordDeployment(
    environmentId: string,
    input: CreateDeploymentRecordInput,
  ): Promise<{
    environment: DeploymentEnvironment;
    deployment: DeploymentRecord;
  }> {
    return HttpRepositoryClient.post<{
      environment: DeploymentEnvironment;
      deployment: DeploymentRecord;
    }>(
      `${ENDPOINT}/${encodeURIComponent(environmentId)}/deployments`,
      input,
    );
  }

  static buildSummary(
    environments: DeploymentEnvironment[],
  ): DeploymentEnvironmentSummary {
    const readyEnvironments = environments.filter(
      (environment) => environment.status === 'ready',
    ).length;
    const attentionEnvironments = environments.filter(
      (environment) => environment.status === 'attention',
    ).length;
    const pendingEnvironments = environments.filter(
      (environment) => environment.status === 'pending',
    ).length;
    const offlineEnvironments = environments.filter(
      (environment) => environment.status === 'offline',
    ).length;
    const productionReady = environments.some(
      (environment) =>
        environment.kind === 'production' &&
        environment.status === 'ready',
    );
    const stagingReady = environments.some(
      (environment) =>
        environment.kind === 'staging' &&
        environment.status === 'ready',
    );

    const componentScore = environments.reduce((total, environment) => {
      const statuses = [
        environment.status,
        environment.databaseStatus,
        environment.storageStatus,
        environment.apiStatus,
      ];

      return total + statuses.reduce((subtotal, status) => {
        if (status === 'ready') return subtotal + 100;
        if (status === 'attention') return subtotal + 60;
        if (status === 'pending') return subtotal + 35;
        return subtotal;
      }, 0) / statuses.length;
    }, 0);

    return {
      totalEnvironments: environments.length,
      readyEnvironments,
      attentionEnvironments,
      pendingEnvironments,
      offlineEnvironments,
      productionReady,
      stagingReady,
      readinessScore:
        environments.length === 0
          ? 0
          : Math.round(componentScore / environments.length),
    };
  }
}
