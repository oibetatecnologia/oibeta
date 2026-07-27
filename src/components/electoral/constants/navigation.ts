import {
  FileText,
  Globe,
  LayoutDashboard,
  LineChart,
  Mail,
  Target,
  Users,
} from 'lucide-react';

export type ElectoralSubTab =
  | 'dashboard'
  | 'campaigns'
  | 'territories'
  | 'coordinators'
  | 'invites'
  | 'analyses'
  | 'reports';

export const ELECTORAL_TAB_TO_ACTIVE_TAB: Record<ElectoralSubTab, string> = {
  dashboard: 'electoral_dashboard',
  campaigns: 'electoral_campaigns',
  territories: 'electoral_territories',
  coordinators: 'electoral_coordinators',
  invites: 'electoral_invites',
  analyses: 'electoral_analyses',
  reports: 'electoral_reports',
};

export const ACTIVE_TAB_TO_ELECTORAL_TAB: Record<string, ElectoralSubTab> = {
  electoral_dashboard: 'dashboard',
  electoral_campaigns: 'campaigns',
  electoral_territories: 'territories',
  electoral_coordinators: 'coordinators',
  electoral_invites: 'invites',
  electoral_analyses: 'analyses',
  electoral_reports: 'reports',
};

export const ELECTORAL_NAVIGATION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campanhas', icon: Target },
  { id: 'territories', label: 'Territórios', icon: Globe },
  { id: 'coordinators', label: 'Coordenadores', icon: Users },
  { id: 'invites', label: 'Convites', icon: Mail },
  { id: 'analyses', label: 'Análises', icon: LineChart },
  { id: 'reports', label: 'Relatórios', icon: FileText },
] as const;
