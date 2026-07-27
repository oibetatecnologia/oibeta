import { GovService } from '../../../services/gov/GovService';

export interface GovCrudCreateParams {
  workspaceId: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

/**
 * ProgramCrudService
 *
 * Serviço de criação de Programas Gov.
 *
 * Responsabilidade:
 * - encapsular criação de programas;
 * - preservar contrato atual do GovService;
 * - remover lógica operacional direta do GovWorkspace.
 */
export const ProgramCrudService = {
  async create(params: GovCrudCreateParams) {
    return GovService.createRecord({
      workspaceId: params.workspaceId,
      createType: 'program',
      formFields: params.formFields,
      programs: params.programs,
      projectsData: params.projectsData,
      indicators: params.indicators,
    });
  },
};
