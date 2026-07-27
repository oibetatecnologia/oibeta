import { HttpRepositoryClient } from '../../persistence/HttpRepositoryClient';
import type { RadarConnectorDescriptor, RadarSyncRun, RadarSyncRunRequest } from './RadarConnectorTypes';

const BASE = '/api/commercial/radar-connectors';

export class RadarConnectorRepository {
  static listConnectors(): Promise<RadarConnectorDescriptor[]> {
    return HttpRepositoryClient.get<RadarConnectorDescriptor[]>(BASE);
  }

  static listRuns(): Promise<RadarSyncRun[]> {
    return HttpRepositoryClient.get<RadarSyncRun[]>(`${BASE}/runs`);
  }

  static run(connectorId: string, options: RadarSyncRunRequest = {}): Promise<RadarSyncRun> {
    return HttpRepositoryClient.post<RadarSyncRun>(`${BASE}/${encodeURIComponent(connectorId)}/runs`, options);
  }
}
