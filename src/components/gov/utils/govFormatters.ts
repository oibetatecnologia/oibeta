/**
 * Formatadores e helpers oficiais do módulo Beta Gov.
 */

export function formatGovStatus(status: string): string {
  if (!status) return 'Inativo';

  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'ATENDIDO') {
    return 'Ativo / Completo';
  }

  if (normalizedStatus === 'PENDING' || normalizedStatus === 'EM_ANDAMENTO' || normalizedStatus === 'EM ANDAMENTO') {
    return 'Pendente';
  }

  if (normalizedStatus === 'PAUSED' || normalizedStatus === 'SUSPENSO') {
    return 'Suspenso';
  }

  return status;
}

export function getGovProgramName(programs: any[], id: string): string {
  const program = programs.find((item) => item.id === id);
  return program ? program.name : 'Geral';
}

export function getGovProjectName(projects: any[], id: string): string {
  const project = projects.find((item) => item.id === id);
  return project ? project.name : 'Geral';
}

export function getGovIndicatorName(indicators: any[], id: string): string {
  const indicator = indicators.find((item) => item.id === id);
  return indicator ? (indicator.indicatorName || indicator.name) : 'Geral';
}
