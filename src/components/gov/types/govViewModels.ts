export interface GovDashboardParams {
  programs: any[];
  projectsData: any[];
  actions: any[];
  indicators: any[];
  goals: any[];
  results: any[];
  reports: any[];
  progSummary: any;
  perfSummary: any;
}

export interface GovDashboardMetrics {
  totalPrograms: number;
  totalProjects: number;
  totalActions: number;
  totalIndicators: number;
  totalGoals: number;
  totalResults: number;
  totalReports: number;

  programsLabel: string | number;
  projectsLabel: string | number;
  actionsLabel: string | number;
  indicatorsLabel: string | number;
  goalsLabel: string | number;
  resultsLabel: string | number;
  reportsLabel: string | number;

  programSuccessRateLabel: string;
  complianceRatioLabel: string;
  completedProjectsLabel: string;
}
