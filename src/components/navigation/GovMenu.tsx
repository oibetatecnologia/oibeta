import { LayoutDashboard, FileText, Activity, ShieldAlert, FileSignature, Target, CheckCircle2, ChevronRight, Layers, Briefcase, CheckSquare } from 'lucide-react';
import { MenuItem } from './types';

export const GovItems: MenuItem[] = [
  { 
    id: 'beta_gov', 
    label: 'Beta Gov', 
    icon: ShieldAlert, 
    module: 'beta_gov',
    subItems: [
      { id: 'gov_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'gov_programs', label: 'Programas', icon: Layers },
      { id: 'gov_projects', label: 'Projetos', icon: Briefcase },
      { id: 'gov_actions', label: 'Ações', icon: CheckSquare },
      { id: 'gov_indicators', label: 'Indicadores', icon: Activity },
      { id: 'gov_goals', label: 'Metas', icon: Target },
      { id: 'gov_results', label: 'Resultados', icon: CheckCircle2 },
      { id: 'gov_governance', label: 'Governança', icon: ShieldAlert },
      { id: 'gov_reviews', label: 'Executive Reviews', icon: FileSignature },
      { id: 'gov_reports', label: 'Relatórios', icon: FileText }
    ]
  }
];
