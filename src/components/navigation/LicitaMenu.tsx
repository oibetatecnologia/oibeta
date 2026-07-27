import { Briefcase, Globe, Users, FileText, FileSignature, ShieldAlert, FileEdit, LayoutDashboard } from 'lucide-react';
import { MenuItem } from './types';

export const LicitaItems: MenuItem[] = [
  { 
    id: 'beta_licita', 
    label: 'Beta Licita', 
    icon: Briefcase, 
    module: 'beta_licita',
    subItems: [
      { id: 'licita_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'licita_opportunities', label: 'Oportunidades', icon: Globe },
      { id: 'licita_bids', label: 'Certames', icon: Briefcase },
      { id: 'licita_suppliers', label: 'Fornecedores', icon: Users },
      { id: 'licita_contracts', label: 'Contratos', icon: FileText },
      { id: 'licita_arps', label: 'ARP', icon: FileSignature },
      { id: 'licita_compliance', label: 'Compliance', icon: ShieldAlert },
      { id: 'licita_reports', label: 'Relatórios', icon: FileEdit }
    ]
  }
];
