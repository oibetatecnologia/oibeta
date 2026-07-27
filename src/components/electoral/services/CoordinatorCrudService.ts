import { ElectoralService } from '../../../services/electoral/ElectoralService';
import type { Coordinator } from '../types';

/**
 * CoordinatorCrudService
 *
 * Serviço operacional de coordenadores eleitorais.
 */
export const CoordinatorCrudService = {
  create(form: Partial<Coordinator>, user: any) {
    return ElectoralService.createCoordinator(form, user);
  },

  update(coordinatorId: string, form: Partial<Coordinator>, user: any) {
    return ElectoralService.updateCoordinator(coordinatorId, form, user);
  },

  prepareEditForm(coordinator: Coordinator): Partial<Coordinator> {
    return {
      name: coordinator.name,
      email: coordinator.email || '',
      phone: coordinator.phone || '',
      level: coordinator.level || 'REGIONAL',
      status: coordinator.status || 'ACTIVE',
      assignedTerritory: coordinator.assignedTerritory || '',
      campaignId: coordinator.campaignId || '',
    };
  },
};
