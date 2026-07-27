import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { RuntimeObservabilitySnapshot } from './RuntimeObservabilityTypes';

const ENDPOINT = '/api/observability/runtime';

export class RuntimeObservabilityService {
  static load(): Promise<RuntimeObservabilitySnapshot> {
    return HttpRepositoryClient.get<RuntimeObservabilitySnapshot>(ENDPOINT);
  }
}
