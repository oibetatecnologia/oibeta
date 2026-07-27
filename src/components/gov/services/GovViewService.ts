/**
 * GovViewService
 *
 * Serviço leve de apresentação do Beta Gov.
 *
 * Não acessa API.
 * Não altera estado.
 * Não substitui GovService.
 */
export const GovViewService = {
  getWorkspaceHealthLabel(params: {
    programs: any[];
    projectsData: any[];
    actions: any[];
    goals: any[];
  }): string {
    const total =
      params.programs.length +
      params.projectsData.length +
      params.actions.length +
      params.goals.length;

    return total > 0 ? 'Dados operacionais reais carregados' : 'Aguardando dados operacionais';
  },

  countTotalOperationalRecords(params: {
    programs: any[];
    projectsData: any[];
    actions: any[];
    goals: any[];
  }): number {
    return (
      params.programs.length +
      params.projectsData.length +
      params.actions.length +
      params.goals.length
    );
  },
};
