import type { RadarConnectorDescriptor } from '../../../src/core/commercial/connectors/RadarConnectorTypes';
import { PROCUREMENT_SOURCES } from '../../../src/core/commercial/CommercialRadarRegistry';
import type { RadarConnector } from './RadarConnector';
import { PncpRadarConnector } from './PncpRadarConnector';
import { ComprasGovRadarConnector } from './ComprasGovRadarConnector';

const adapters = new Map<string, RadarConnector>([
  ['pncp', new PncpRadarConnector()],
  ['compras_gov', new ComprasGovRadarConnector()],
]);

const AUTH_POLICIES: Record<string, RadarConnectorDescriptor['authPolicy']> = {
  pncp: 'PUBLIC_NO_AUTH',
  compras_gov: 'PUBLIC_NO_AUTH',
  portal_compras_publicas: 'GLOBAL_OR_TENANT',
  bll: 'GLOBAL_OR_TENANT',
  bbm: 'GLOBAL_OR_TENANT',
  licitanet: 'GLOBAL_OR_TENANT',
  state_portal: 'TENANT_PROVIDED',
  municipal_portal: 'TENANT_PROVIDED',
};

const descriptors: RadarConnectorDescriptor[] = PROCUREMENT_SOURCES.map((source) => {
  const adapter = adapters.get(source.id);
  if (adapter) return { ...adapter.descriptor, authPolicy: AUTH_POLICIES[source.id] || 'PUBLIC_NO_AUTH' };
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
    authPolicy: AUTH_POLICIES[source.id] || 'TENANT_PROVIDED',
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
