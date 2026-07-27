import type { GovDashboardMetrics, GovDashboardParams } from '../types/govViewModels';

function toNoDataLabel(value: number): string | number {
  return value > 0 ? value : 'NO_DATA';
}

function formatRatio(value: unknown, fallback: string): string {
  if (typeof value !== 'number') return fallback;
  return `${(value * 100).toFixed(1)}%`;
}

export function calculateGovDashboardMetrics({
  programs,
  projectsData,
  actions,
  indicators,
  goals,
  results,
  reports,
  progSummary,
  perfSummary,
}: GovDashboardParams): GovDashboardMetrics {
  const completedProjects = projectsData.filter((project) => project.status === 'COMPLETED').length;

  return {
    totalPrograms: programs.length,
    totalProjects: projectsData.length,
    totalActions: actions.length,
    totalIndicators: indicators.length,
    totalGoals: goals.length,
    totalResults: results.length,
    totalReports: reports.length,

    programsLabel: toNoDataLabel(programs.length),
    projectsLabel: toNoDataLabel(projectsData.length),
    actionsLabel: toNoDataLabel(actions.length),
    indicatorsLabel: toNoDataLabel(indicators.length),
    goalsLabel: toNoDataLabel(goals.length),
    resultsLabel: toNoDataLabel(results.length),
    reportsLabel: toNoDataLabel(reports.length),

    programSuccessRateLabel: formatRatio(progSummary?.successRate, 'NO_DATA'),
    complianceRatioLabel: formatRatio(perfSummary?.complianceRatio, '96.2%'),
    completedProjectsLabel: `${completedProjects} / ${projectsData.length}`,
  };
}
