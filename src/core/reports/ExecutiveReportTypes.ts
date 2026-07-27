export type ExecutiveReportRisk = 'saudável' | 'atenção' | 'crítico';
export type ExecutiveReportSectionId = 'overview' | 'commercial' | 'customers' | 'finance' | 'execution' | 'governance';

export interface ExecutiveReportMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  helper: string;
  trend: 'positive' | 'neutral' | 'negative';
}

export interface ExecutiveReportAlert {
  id: string;
  title: string;
  description: string;
  area: string;
  severity: 'alta' | 'média' | 'baixa';
  targetTab: string;
  taskTitle: string;
}

export interface ExecutiveReportSection {
  id: ExecutiveReportSectionId;
  title: string;
  score: number;
  risk: ExecutiveReportRisk;
  summary: string;
  metrics: ExecutiveReportMetric[];
  highlights: string[];
}

export interface ExecutiveReportSnapshot {
  generatedAt: string;
  organizationName: string;
  executiveScore: number;
  risk: ExecutiveReportRisk;
  headline: string;
  sections: ExecutiveReportSection[];
  alerts: ExecutiveReportAlert[];
  recommendations: string[];
}
