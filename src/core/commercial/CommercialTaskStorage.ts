import { SafeJsonStorage } from '../persistence/SafeJsonStorage';
import { buildTenantStorageKey, type TenantPersistenceContext } from '../persistence/TenantPersistence';
import type { GeneratedCommercialTask } from './OpportunityTypes';

const STORAGE_KEY = 'oi-beta-commercial-generated-tasks-v1';

const resolveStorageKey = (context?: Partial<TenantPersistenceContext>): string =>
  buildTenantStorageKey(STORAGE_KEY, context);

export interface StoredCommercialTask extends GeneratedCommercialTask {
  status: 'pending' | 'accepted' | 'discarded';
  createdAt: string;
}

/**
 * CommercialTaskStorage
 *
 * Fallback local tenant-aware das tarefas comerciais geradas pela Beta.
 * Não substitui o módulo oficial de tarefas nem a persistência definitiva.
 */
export class CommercialTaskStorage {
  static list(context?: Partial<TenantPersistenceContext>): StoredCommercialTask[] {
    const parsed = SafeJsonStorage.read<StoredCommercialTask[]>({
      key: resolveStorageKey(context),
      fallback: [],
      label: 'tarefas comerciais locais',
    });

    return Array.isArray(parsed) ? parsed : [];
  }

  static createMany(
    tasks: GeneratedCommercialTask[],
    context?: Partial<TenantPersistenceContext>,
  ): StoredCommercialTask[] {
    const now = new Date().toISOString();
    const current = this.list(context);

    const newTasks = tasks
      .filter((task) => !current.some((existing) => existing.id === task.id))
      .map((task): StoredCommercialTask => ({
        ...task,
        status: 'pending',
        createdAt: now,
      }));

    this.saveAll([...newTasks, ...current], context);

    return newTasks;
  }

  static clear(context?: Partial<TenantPersistenceContext>): void {
    this.saveAll([], context);
  }

  static saveAll(
    tasks: StoredCommercialTask[],
    context?: Partial<TenantPersistenceContext>,
  ): void {
    SafeJsonStorage.write(resolveStorageKey(context), tasks, 'tarefas comerciais locais');
  }
}
