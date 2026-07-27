import { Settings, Users, Building2, Layers } from 'lucide-react';
import { MenuItem } from './types';

export const AdminItems: MenuItem[] = [
  { id: 'core_admin', label: 'Beta Core Admin', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Building2 },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'organization', label: 'Organização', icon: Building2 },
  { id: 'modules_contracted', label: 'Módulos Contratados', icon: Layers }
];
