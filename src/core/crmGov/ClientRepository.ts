import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import { PersistenceFallbackPolicyService } from '../persistence/PersistenceFallbackPolicyService';
import { RepositoryHealthService } from '../persistence/RepositoryHealthService';
import { buildTenantStorageKey } from '../persistence/TenantPersistence';
import { SafeJsonStorage } from '../persistence/SafeJsonStorage';
import type { ClientRecord } from '../../hooks/useClientState';

const API_BASE_PATH = '/api/crm-gov/clients';
const STORAGE_KEY = 'oi-beta-crm-gov-clients-v1';
const REPOSITORY_ID = 'crm-gov-clients';

const resolveStorageKey = (): string =>
  buildTenantStorageKey(STORAGE_KEY);

function loadLocalClients(): ClientRecord[] {
  const parsed = SafeJsonStorage.read<ClientRecord[]>({
    key: resolveStorageKey(),
    fallback: [],
    label: 'clientes CRM Gov locais',
  });

  return Array.isArray(parsed) ? parsed : [];
}

function saveLocalClients(clients: ClientRecord[]): void {
  SafeJsonStorage.write(resolveStorageKey(), clients, 'clientes CRM Gov locais');
}

/**
 * ClientRepository
 *
 * Camada oficial de persistência do CRM Gov.
 * A API/backend é a fonte preferencial; o fallback local tenant-aware permanece
 * apenas como transição incremental para Supabase.
 */
export class ClientRepository {
  static async list(): Promise<ClientRecord[]> {
    try {
      const clients = await HttpRepositoryClient.get<ClientRecord[]>(
        API_BASE_PATH
      );

      RepositoryHealthService.markApi(REPOSITORY_ID);

      return clients;
    } catch (error) {
      console.warn('[CRM Gov] API indisponível. Usando fallback local para listar clientes.', error);
      if (!PersistenceFallbackPolicyService.canUseFallback()) {
        RepositoryHealthService.markError(REPOSITORY_ID, error);
        throw error;
      }

      RepositoryHealthService.markFallback(REPOSITORY_ID, error);
      return loadLocalClients();
    }
  }

  static async replaceAll(clients: ClientRecord[]): Promise<ClientRecord[]> {
    try {
      const saved = await HttpRepositoryClient.put<ClientRecord[]>(
        API_BASE_PATH,
        { clients }
      );

      RepositoryHealthService.markApi(REPOSITORY_ID);
      saveLocalClients(saved);

      return saved;
    } catch (error) {
      console.warn('[CRM Gov] API indisponível. Salvando clientes no fallback local.', error);
      if (!PersistenceFallbackPolicyService.canUseFallback()) {
        RepositoryHealthService.markError(REPOSITORY_ID, error);
        throw error;
      }

      RepositoryHealthService.markFallback(REPOSITORY_ID, error);
      saveLocalClients(clients);
      return clients;
    }
  }
}
