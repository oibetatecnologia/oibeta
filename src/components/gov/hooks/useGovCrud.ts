import { GovService } from '../../../services/gov/GovService';
import { ProgramCrudService } from '../services/ProgramCrudService';
import { ProjectCrudService } from '../services/ProjectCrudService';
import { ActionCrudService } from '../services/ActionCrudService';
import { GoalCrudService } from '../services/GoalCrudService';

interface UseGovCrudParams {
  workspaceId: string;
  createType: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
  setIsCreateModalOpen: (value: boolean) => void;
  resetForm: () => void;
  loadGovWorkspaceData: () => Promise<void>;
  setFormError: (value: string) => void;
  setFormSubmitting: (value: boolean) => void;
}

/**
 * useGovCrud
 *
 * Centraliza o fluxo de criação do Beta Gov.
 */
export function useGovCrud({
  workspaceId,
  createType,
  formFields,
  programs,
  projectsData,
  indicators,
  setIsCreateModalOpen,
  resetForm,
  loadGovWorkspaceData,
  setFormError,
  setFormSubmitting,
}: UseGovCrudParams) {
  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const params = {
        workspaceId,
        formFields,
        programs,
        projectsData,
        indicators,
      };

      if (createType === 'program') {
        await ProgramCrudService.create(params);
      } else if (createType === 'project') {
        await ProjectCrudService.create(params);
      } else if (createType === 'action') {
        await ActionCrudService.create(params);
      } else if (createType === 'goal') {
        await GoalCrudService.create(params);
      } else {
        await GovService.createRecord({
          workspaceId,
          createType,
          formFields,
          programs,
          projectsData,
          indicators,
        });
      }

      setIsCreateModalOpen(false);
      resetForm();
      await loadGovWorkspaceData();
    } catch (err: any) {
      setFormError(err.message || 'Houve uma falha ao enviar o registro para a API.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return handleCreateSubmit;
}
