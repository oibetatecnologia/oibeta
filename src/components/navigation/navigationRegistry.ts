import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  FileText,
  BrainCircuit,
  Files,
  Users,
  BarChart3,
  Clock,
  Settings,
  Building2,
  Target,
  Heart,
  GraduationCap,
} from 'lucide-react';
import { GovItems } from './GovMenu';
import { SystemItems } from './SystemMenu';
import { ElectoralItems } from './ElectoralMenu';
import { LicitaItems } from './LicitaMenu';
import type { MenuGroup, MenuItem } from './types';

interface NavigationRegistryContext {
  selectedProjectId: string;
  filteredMemoriesCount: number;
  filteredDecisionsCount: number;
  filteredTasksCount: number;
}

function withCoreRuntimeState(items: MenuItem[], context: NavigationRegistryContext): MenuItem[] {
  return items.map((item) => {
    if (item.id !== 'projects' || !item.subItems) {
      return item;
    }

    return {
      ...item,
      subItems: item.subItems.map((subItem) => {
        if (subItem.id === 'memories') {
          return {
            ...subItem,
            count: context.selectedProjectId ? context.filteredMemoriesCount : null,
            disabled: !context.selectedProjectId,
          };
        }

        if (subItem.id === 'decisions') {
          return {
            ...subItem,
            count: context.selectedProjectId ? context.filteredDecisionsCount : null,
            disabled: !context.selectedProjectId,
          };
        }

        if (subItem.id === 'tasks') {
          return {
            ...subItem,
            count: context.selectedProjectId ? context.filteredTasksCount : null,
            disabled: !context.selectedProjectId,
          };
        }

        return subItem;
      }),
    };
  });
}

const CoreItems: MenuItem[] = [
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
      { id: 'documents', label: 'Documentos', icon: Files, badge: 'GERAR' },
      { id: 'clients', label: 'Clientes', icon: Users, badge: 'CRM' },
      { id: 'reports', label: 'Relatórios', icon: BarChart3, badge: 'PDF' },
      { id: 'schedule', label: 'Agenda', icon: Clock },
    ],
  },
  { id: 'assistant', label: 'Beta Assistant', icon: BrainCircuit },
];

const AdministrationItems: MenuItem[] = [
  { id: 'core_admin', label: 'Beta Core Admin', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Building2 },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'organization', label: 'Organização', icon: Building2 },
  { id: 'modules_contracted', label: 'Módulos Contratados', icon: Layers },
];

export function getNavigationGroups(context: NavigationRegistryContext): MenuGroup[] {
  const sistema1Items = SystemItems.filter((item) => item.id === 'sistema_1');
  const sistema5Items = SystemItems.filter((item) => item.id === 'sistema_5');
  const amendmentItems = SystemItems.filter((item) => item.id === 'beta_amendments');
  const healthItems = SystemItems.filter((item) => item.id === 'beta_health');
  const educationItems = SystemItems.filter((item) => item.id === 'beta_education');

  return [
    {
      id: 'core',
      label: 'CORE',
      items: withCoreRuntimeState(CoreItems, context),
    },
    {
      id: 'govtech',
      label: 'GOVTECH',
      items: [
        ...GovItems,
        ...sistema1Items,
        ...sistema5Items,
        ...LicitaItems,
        ...amendmentItems,
      ],
    },
    {
      id: 'saude',
      label: 'SAÚDE',
      items: healthItems,
    },
    {
      id: 'educacao',
      label: 'EDUCAÇÃO',
      items: educationItems,
    },
    {
      id: 'politico',
      label: 'POLÍTICO',
      items: ElectoralItems,
    },
    {
      id: 'administracao',
      label: 'ADMINISTRAÇÃO',
      items: AdministrationItems,
    },
  ];
}
