import { ShieldAlert, FileText, LayoutDashboard, Users, CheckSquare, Layers, Activity, Target, Heart, GraduationCap, FolderOpen, FileSignature } from 'lucide-react';
import { MenuItem } from './types';

export const SystemItems: MenuItem[] = [
  { 
    id: 'sistema_1', 
    label: 'Sistema 1', 
    icon: ShieldAlert, 
    module: 'sistema_1',
    subItems: [
      { id: 's1_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 's1_transparencia', label: 'Transparência', icon: FileText },
      { id: 's1_ouvidoria', label: 'Ouvidoria', icon: Users },
      { id: 's1_esic', label: 'e-SIC', icon: CheckSquare },
      { id: 's1_solicitacoes', label: 'Solicitações', icon: Layers },
      { id: 's1_indicadores', label: 'Indicadores', icon: Activity },
      { id: 's1_relatorios', label: 'Relatórios', icon: FileText }
    ]
  },
  { 
    id: 'sistema_5', 
    label: 'Sistema 5', 
    icon: FileText, 
    module: 'sistema_5',
    subItems: [
      { id: 's5_dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 's5_protocolos', label: 'Protocolos', icon: FolderOpen },
      { id: 's5_processos', label: 'Processos', icon: FileSignature },
      { id: 's5_workflow', label: 'Workflow', icon: Layers },
      { id: 's5_ged', label: 'GED', icon: Layers },
      { id: 's5_documentos', label: 'Documentos', icon: FileText },
      { id: 's5_auditoria', label: 'Auditoria', icon: ShieldAlert },
      { id: 's5_relatorios', label: 'Relatórios', icon: FileText }
    ]
  },
  { id: 'beta_amendments', label: 'Amendments', icon: Target, module: 'beta_amendments' },
  { id: 'beta_health', label: 'Health', icon: Heart, module: 'beta_health' },
  { id: 'beta_education', label: 'Education', icon: GraduationCap, module: 'beta_education' }
];
