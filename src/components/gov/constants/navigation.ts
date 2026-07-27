import {
  Activity,
  Briefcase,
  CheckCircle2,
  FileSignature,
  FileText,
  Gauge,
  LayoutDashboard,
  Layers,
  ShieldAlert,
  Target,
} from 'lucide-react';

export type GovTab =
  | 'beta_gov'
  | 'gov_dashboard'
  | 'gov_programs'
  | 'gov_projects'
  | 'gov_actions'
  | 'gov_indicators'
  | 'gov_goals'
  | 'gov_results'
  | 'gov_governance'
  | 'gov_reviews'
  | 'gov_reports';

export const GOV_NAVIGATION_TABS = [
  { id: 'gov_dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'gov_programs', label: 'Programas', icon: Layers },
  { id: 'gov_projects', label: 'Projetos', icon: Briefcase },
  { id: 'gov_actions', label: 'Ações', icon: CheckCircle2 },
  { id: 'gov_indicators', label: 'Indicadores', icon: Activity },
  { id: 'gov_goals', label: 'Metas', icon: Target },
  { id: 'gov_results', label: 'Resultados', icon: Gauge },
  { id: 'gov_governance', label: 'Governança', icon: ShieldAlert },
  { id: 'gov_reviews', label: 'Revisões', icon: FileSignature },
  { id: 'gov_reports', label: 'Relatórios', icon: FileText },
] as const;

export const GOV_DEFAULT_TAB: GovTab = 'gov_dashboard';

export function normalizeGovTab(tab: string): GovTab {
  if (tab === 'beta_gov') return 'gov_dashboard';

  const exists = GOV_NAVIGATION_TABS.some((item) => item.id === tab);
  return exists ? (tab as GovTab) : GOV_DEFAULT_TAB;
}
