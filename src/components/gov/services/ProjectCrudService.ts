import { GovService } from '../../../services/gov/GovService';

export interface GovCrudCreateParams {
  workspaceId: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

/**
 * ProjectCrudService
 *
 * Serviço de criação de Projetos Gov.
 */
export const ProjectCrudService = {
  async create(params: GovCrudCreateParams) {
    return GovService.createRecord({
      workspaceId: params.workspaceId,
      createType: 'project',
      formFields: params.formFields,
      programs: params.programs,
      projectsData: params.projectsData,
      indicators: params.indicators,
    });
  },
};
