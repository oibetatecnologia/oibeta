/**
 * Formulários padrão oficiais do módulo Beta Gov.
 *
 * Responsabilidade:
 * - centralizar o estado inicial dos formulários;
 * - evitar duplicação no GovWorkspace;
 * - preservar valores padrão atuais.
 */

interface DefaultGovFormContext {
  objectives?: any[];
  programs?: any[];
  projectsData?: any[];
  indicators?: any[];
}

export function createDefaultGovFormFields(context: DefaultGovFormContext = {}) {
  const { objectives = [], programs = [], projectsData = [], indicators = [] } = context;

  return {
    name: '',
    description: '',
    status: 'ACTIVE',
    objectiveId: objectives.length > 0 ? objectives[0].id : '',
    programId: programs.length > 0 ? programs[0].id : '',
    projectId: projectsData.length > 0 ? projectsData[0].id : '',
    indicatorId: indicators.length > 0 ? indicators[0].id : '',
    secretaria: '',
    periodo: '',
    responsavel: '',
    prazo: '',
    goalValue: '',
    currentValue: '0',
    descricaoMeta: '',
    unidade: 'Percentual (%)',
    indicatorName: '',
    resultValue: '',
  };
}
