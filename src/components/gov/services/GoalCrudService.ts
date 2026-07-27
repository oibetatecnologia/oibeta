import { GovService } from '../../../services/gov/GovService';

export interface GovCrudCreateParams {
  workspaceId: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

/**
 * GoalCrudService
 *
 * Serviço de criação de Metas Gov.
 */
export const GoalCrudService = {
  async create(params: GovCrudCreateParams) {
    return GovService.createRecord({
      workspaceId: params.workspaceId,
      createType: 'goal',
      formFields: params.formFields,
      programs: params.programs,
      projectsData: params.projectsData,
      indicators: params.indicators,
    });
  },
};
