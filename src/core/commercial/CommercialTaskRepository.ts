import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import { PersistenceFallbackPolicyService } from '../persistence/PersistenceFallbackPolicyService';
import { RepositoryHealthService } from '../persistence/RepositoryHealthService';
import { CommercialTaskStorage, type StoredCommercialTask } from './CommercialTaskStorage';
import type { GeneratedCommercialTask } from './OpportunityTypes';

const API_BASE_PATH = '/api/commercial/tasks';
const REPOSITORY_ID = 'commercial-generated-tasks';

/**
 * CommercialTaskRepository
 *
 * Camada oficial de persistência das tarefas comerciais geradas pela Beta.
 * A API/backend é a fonte preferencial; o fallback local tenant-aware permanece
 * apenas como transição para Supabase.
 */
export class CommercialTaskRepository {
  static async list(): Promise<StoredCommercialTask[]> {
    try {
      const tasks = await HttpRepositoryClient.get<StoredCommercialTask[]>(
        API_BASE_PATH
      );

      RepositoryHealthService.markApi(REPOSITORY_ID);

      return tasks;
    } catch (error) {
      console.warn('[CommercialRadar] API indisponível. Usando fallback local para listar tarefas comerciais.', error);
      if (!PersistenceFallbackPolicyService.canUseFallback()) {
        RepositoryHealthService.markError(REPOSITORY_ID, error);
        throw error;
      }

      RepositoryHealthService.markFallback(REPOSITORY_ID, error);
      return CommercialTaskStorage.list();
    }
  }

  static async createMany(tasks: GeneratedCommercialTask[]): Promise<StoredCommercialTask[]> {
    if (tasks.length === 0) {
      return [];
    }

    try {
      const createdTasks = await HttpRepositoryClient.post<StoredCommercialTask[]>(
        `${API_BASE_PATH}/bulk`,
        { tasks }
      );

      RepositoryHealthService.markApi(REPOSITORY_ID);

      return createdTasks;
    } catch (error) {
      console.warn('[CommercialRadar] API indisponível. Salvando tarefas comerciais no fallback local.', error);
      if (!PersistenceFallbackPolicyService.canUseFallback()) {
        RepositoryHealthService.markError(REPOSITORY_ID, error);
        throw error;
      }

      RepositoryHealthService.markFallback(REPOSITORY_ID, error);
      return CommercialTaskStorage.createMany(tasks);
    }
  }

  static async clear(): Promise<void> {
    try {
      await HttpRepositoryClient.delete<{ success: boolean }>(
        API_BASE_PATH
      );

      RepositoryHealthService.markApi(REPOSITORY_ID);
    } catch (error) {
      console.warn('[CommercialRadar] API indisponível. Limpando fallback local de tarefas comerciais.', error);
      if (!PersistenceFallbackPolicyService.canUseFallback()) {
        RepositoryHealthService.markError(REPOSITORY_ID, error);
        throw error;
      }

      RepositoryHealthService.markFallback(REPOSITORY_ID, error);
      CommercialTaskStorage.clear();
    }
  }
}
