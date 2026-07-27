import type { RadarConnectorDescriptor } from '../../../src/core/commercial/connectors/RadarConnectorTypes';
import { PROCUREMENT_SOURCES } from '../../../src/core/commercial/CommercialRadarRegistry';
import type { RadarConnector } from './RadarConnector';
import { PncpRadarConnector } from './PncpRadarConnector';

const adapters = new Map<string, RadarConnector>([
  ['pncp', new PncpRadarConnector()],
]);

const descriptors: RadarConnectorDescriptor[] = PROCUREMENT_SOURCES.map((source) => {
  const adapter = adapters.get(source.id);
  if (adapter) return { ...adapter.descriptor };
  return {
    id: source.id,
    sourceId: source.id,
    label: source.label,
    description: source.description,
    status: 'planned',
    supportsIncremental: true,
    supportsPagination: true,
    available: false,
    unavailableReason: 'Conector ainda não implementado. A infraestrutura de sincronização está pronta para receber o adaptador oficial.',
  };
});

export class RadarConnectorRegistry {
  static list(): RadarConnectorDescriptor[] {
    return descriptors.map((item) => ({ ...item }));
  }

  static get(connectorId: string): RadarConnectorDescriptor | undefined {
    const item = descriptors.find((connector) => connector.id === connectorId);
    return item ? { ...item } : undefined;
  }

  static getAdapter(connectorId: string): RadarConnector | undefined {
    return adapters.get(connectorId);
  }
}
