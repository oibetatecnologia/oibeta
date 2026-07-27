import { LayoutDashboard, Layers, BrainCircuit, CheckSquare, FileText, Users, BarChart3, Clock } from 'lucide-react';
import { MenuItem } from './types';

export const CoreItems: MenuItem[] = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { 
    id: 'projects', 
    label: 'Workspace', 
    icon: Layers,
    subItems: [
      { id: 'projects', label: 'Projetos', icon: Layers },
      { id: 'memories', label: 'Memórias', icon: BrainCircuit },
      { id: 'decisions', label: 'Decisões', icon: FileText },
      { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
      { id: 'documents', label: 'Documentos', icon: Layers, badge: 'GERAR' },
      { id: 'clients', label: 'Clientes', icon: Users, badge: 'CRM' },
      { id: 'reports', label: 'Relatórios', icon: BarChart3, badge: 'PDF' },
      { id: 'schedule', label: 'Agenda', icon: Clock }
    ]
  },
  { id: 'assistant', label: 'Beta Assistant', icon: BrainCircuit }
];
