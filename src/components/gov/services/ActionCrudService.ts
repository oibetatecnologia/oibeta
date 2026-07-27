import { GovService } from '../../../services/gov/GovService';

export interface GovCrudCreateParams {
  workspaceId: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

/**
 * ActionCrudService
 *
 * Serviço de criação de Ações Gov.
 */
export const ActionCrudService = {
  async create(params: GovCrudCreateParams) {
    return GovService.createRecord({
      workspaceId: params.workspaceId,
      createType: 'action',
      formFields: params.formFields,
      programs: params.programs,
      projectsData: params.projectsData,
      indicators: params.indicators,
    });
  },
};
