import { ElectoralService } from '../../../services/electoral/ElectoralService';
import type { Territory } from '../types';

/**
 * TerritoryCrudService
 *
 * Serviço operacional de territórios eleitorais.
 */
export const TerritoryCrudService = {
  create(form: Partial<Territory>, user: any) {
    return ElectoralService.createTerritory(form, user);
  },
};
