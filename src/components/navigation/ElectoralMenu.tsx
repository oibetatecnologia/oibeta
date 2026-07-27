import { UserCheck, LayoutDashboard, Target, Globe, Users, Mail, LineChart, FileText } from 'lucide-react';
import { MenuItem } from './types';

export const ElectoralItems: MenuItem[] = [
  { 
    id: 'beta_electoral', 
    label: 'Beta Electoral', 
    icon: UserCheck, 
    module: 'beta_electoral',
    subItems: [
      { id: 'electoral_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'electoral_campaigns', label: 'Campanhas', icon: Target },
      { id: 'electoral_territories', label: 'Territórios', icon: Globe },
      { id: 'electoral_coordinators', label: 'Coordenadores', icon: Users },
      { id: 'electoral_invites', label: 'Convites', icon: Mail },
      { id: 'electoral_analyses', label: 'Análises', icon: LineChart },
      { id: 'electoral_reports', label: 'Relatórios', icon: FileText }
    ]
  }
];
