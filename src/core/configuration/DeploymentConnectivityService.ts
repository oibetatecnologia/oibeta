import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { DeploymentConnectivitySummary } from './DeploymentConnectivityTypes';

const ENDPOINT = '/api/configuration/deployment/connectivity';

export class DeploymentConnectivityService {
  static load(): Promise<DeploymentConnectivitySummary> {
    return HttpRepositoryClient.get<DeploymentConnectivitySummary>(
      ENDPOINT,
    );
  }
}
