import { HttpRepositoryClient } from '../../persistence/HttpRepositoryClient';
import type { RadarConnectorCredentialMetadata, RadarConnectorCredentialScope, RadarConnectorDescriptor, RadarSyncRun, RadarSyncRunRequest } from './RadarConnectorTypes';

const BASE = '/api/commercial/radar-connectors';

export class RadarConnectorRepository {
  static listConnectors(): Promise<RadarConnectorDescriptor[]> {
    return HttpRepositoryClient.get<RadarConnectorDescriptor[]>(BASE);
  }

  static listRuns(): Promise<RadarSyncRun[]> {
    return HttpRepositoryClient.get<RadarSyncRun[]>(`${BASE}/runs`);
  }

  static saveCredential(connectorId: string, input: { scope: RadarConnectorCredentialScope; secret: string; label?: string }): Promise<RadarConnectorCredentialMetadata> {
    return HttpRepositoryClient.put<RadarConnectorCredentialMetadata>(`${BASE}/${encodeURIComponent(connectorId)}/credential`, input);
  }

  static revokeCredential(connectorId: string, scope: RadarConnectorCredentialScope): Promise<{ success: true }> {
    return HttpRepositoryClient.delete<{ success: true }>(`${BASE}/${encodeURIComponent(connectorId)}/credential?scope=${encodeURIComponent(scope)}`);
  }

  static run(connectorId: string, options: RadarSyncRunRequest = {}): Promise<RadarSyncRun> {
    return HttpRepositoryClient.post<RadarSyncRun>(`${BASE}/${encodeURIComponent(connectorId)}/runs`, options);
  }
}
