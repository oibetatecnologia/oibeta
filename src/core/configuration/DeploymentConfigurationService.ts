import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { DeploymentConfigurationSummary } from './DeploymentConfigurationTypes';

const ENDPOINT = '/api/configuration/deployment';

export class DeploymentConfigurationService {
  static get(): Promise<DeploymentConfigurationSummary> {
    return HttpRepositoryClient.get<DeploymentConfigurationSummary>(
      ENDPOINT,
    );
  }
}
