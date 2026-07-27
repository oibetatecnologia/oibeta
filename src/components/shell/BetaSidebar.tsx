import React from 'react';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  FileText,
  BrainCircuit,
  Files,
  Users,
  BarChart3,
  Building2,
  Clock,
  X,
  Activity,
  Target,
  Landmark,
  ShieldAlert,
  Heart,
  GraduationCap,
  UserCheck,
  Settings,
  Globe,
  Mail,
  LineChart,
  FolderOpen,
  Briefcase,
  FileSignature,
  CheckCircle2,
  AlertCircle,
  FileEdit
} from 'lucide-react';
import { Project } from '../../types';
import { getNavigationGroups } from '../navigation/navigationRegistry';

interface BetaSidebarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  isLeftSidebarCollapsed: boolean;
  setIsLeftSidebarCollapsed: (collapsed: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  isWorkspaceExpanded: boolean;
  setIsWorkspaceExpanded: (expanded: boolean) => void;
  isElectoralExpanded: boolean;
  setIsElectoralExpanded: (expanded: boolean) => void;
  isLicitaExpanded: boolean;
  setIsLicitaExpanded: (expanded: boolean) => void;
  isGovExpanded: boolean;
  setIsGovExpanded: (expanded: boolean) => void;

  isModuleActive: (code: string) => boolean;

  totalProjects: number;
  filteredMemoriesCount: number;
  filteredDecisionsCount: number;
  filteredTasksCount: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  module?: string;
  count?: number | null;
  disabled?: boolean;
  subItems?: MenuItem[];
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export default function BetaSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  activeTab,
  setActiveTab,
  isLeftSidebarCollapsed,
  setIsLeftSidebarCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  isWorkspaceExpanded,
  setIsWorkspaceExpanded,
  isElectoralExpanded,
  setIsElectoralExpanded,
  isLicitaExpanded,
  setIsLicitaExpanded,
  isGovExpanded,
  setIsGovExpanded,
  isModuleActive,
  totalProjects,
  filteredMemoriesCount,
  filteredDecisionsCount,
  filteredTasksCount
}: BetaSidebarProps) {
  const menuGroups: MenuGroup[] = getNavigationGroups({
    selectedProjectId,
    filteredMemoriesCount,
    filteredDecisionsCount,
    filteredTasksCount,
  });

  const activeGroups = menuGroups
    .map(group => {
      const visibleItems = group.items.filter(item => {
        if (item.module) {
          return isModuleActive(item.module);
        }
        return true;
      });
      return { ...group, items: visibleItems };
    })
    .filter(group => group.items.length > 0);

  const getSubmenuExpanded = (itemId: string) => {
    if (itemId === 'beta_electoral') return isElectoralExpanded;
    if (itemId === 'beta_licita') return isLicitaExpanded;
    if (itemId === 'beta_gov') return isGovExpanded;
    return isWorkspaceExpanded;
  };

  const handleParentClick = (item: MenuItem) => {
    if (!item.subItems) {
      setActiveTab(item.id);
      setIsMobileSidebarOpen(false);
      return;
    }

    if (item.id === 'beta_electoral') {
      setIsElectoralExpanded(!isElectoralExpanded);
      if (!item.subItems.some(sub => activeTab === sub.id)) {
        setActiveTab('electoral_dashboard');
      }
      return;
    }

    if (item.id === 'beta_licita') {
      setIsLicitaExpanded(!isLicitaExpanded);
      if (!item.subItems.some(sub => activeTab === sub.id)) {
        setActiveTab('licita_dashboard');
      }
      return;
    }

    if (item.id === 'beta_gov') {
      setIsGovExpanded(!isGovExpanded);
      if (!item.subItems.some(sub => activeTab === sub.id)) {
        setActiveTab('gov_dashboard');
      }
      return;
    }

    setIsWorkspaceExpanded(!isWorkspaceExpanded);
    if (!item.subItems.some(sub => activeTab === sub.id)) {
      setActiveTab('projects');
    }
  };

  return (
    <>
      <div
        className={`bg-[var(--bg-sidebar)] text-[var(--text-secondary)] flex flex-col shrink-0 border-r border-[var(--border-color)] transition-all duration-300 z-30 absolute lg:relative h-full ${
          isMobileSidebarOpen
            ? 'w-[280px] translate-x-0'
            : 'translate-x-0 ' + (isLeftSidebarCollapsed ? 'lg:w-[64px]' : 'lg:w-[280px]')
        } ${isMobileSidebarOpen ? 'left-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
          {!isLeftSidebarCollapsed ? (
            <div className="flex items-center gap-2">
              <div className="bg-[var(--blue-accent)] text-white p-1.5 rounded-lg shadow-inner">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-[var(--text-main)] text-sm tracking-widest block font-sans">OI BETA</span>
                <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">TECNOLOGIA</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto bg-[var(--blue-accent)] text-white p-1.5 rounded-lg shadow-inner">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] cursor-pointer text-xs"
            title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isLeftSidebarCollapsed ? '→' : '←'}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isLeftSidebarCollapsed && (
          <div className="px-4 py-2 text-[11px] font-mono font-extrabold text-[var(--text-main)] border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-card)]/40">
            <svg className="w-3.5 h-3.5 text-[var(--blue-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="truncate">Oi Beta Tecnologia</span>
          </div>
        )}

        {!isLeftSidebarCollapsed && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest font-mono">Projetos</span>
              <span className="text-[9px] bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] px-1.5 py-0.2 rounded font-mono font-bold leading-none">{totalProjects}</span>
            </div>

            <div className="px-2 space-y-0.5 max-h-[160px] overflow-y-auto">
              {projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      if (activeTab === 'settings') {
                        setActiveTab('dashboard');
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded-md transition duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-semibold border border-[var(--border-color)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/45 hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      p.status === 'completed'
                        ? 'bg-[var(--green-accent)]'
                        : p.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-[var(--blue-accent)]'
                    }`} />
                    <span className="truncate flex-1 font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!isLeftSidebarCollapsed && (
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest font-mono">Menu Corporativo</span>
          </div>
        )}

        <nav className="flex-1 px-2 pb-4 pt-2 space-y-4 overflow-y-auto">
          {isLeftSidebarCollapsed ? (
            <div className="space-y-4">
              {activeGroups.flatMap(g => g.items).map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-bold border border-[var(--blue-accent)]/30'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {activeGroups.map(group => (
                <div key={group.id} className="space-y-1">
                  <span className="px-3 text-[9px] font-black text-[var(--text-secondary)]/75 uppercase tracking-widest font-mono block select-none mb-1.5">{group.label}</span>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isSelected = activeTab === item.id || Boolean(item.subItems?.some(sub => activeTab === sub.id));
                      return (
                        <div key={item.id} className="space-y-0.5">
                          <button
                            onClick={() => handleParentClick(item)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-bold border border-[var(--blue-accent)]/20'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--blue-accent)]' : ''}`} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold leading-none bg-[var(--green-accent)]/10 text-[var(--green-accent)] border border-[var(--green-accent)]/20">{item.badge}</span>
                            )}
                          </button>

                          {item.subItems && getSubmenuExpanded(item.id) && (
                            <div className="ml-4 pl-3.5 border-l border-[var(--border-color)]/50 mt-1 space-y-1">
                              {item.subItems.map(sub => {
                                const SubIcon = sub.icon;
                                const isSubSelected = activeTab === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => {
                                      if (sub.disabled) {
                                        alert('Selecione um projeto na lista primeiro!');
                                        return;
                                      }
                                      setActiveTab(sub.id);
                                      setIsMobileSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium rounded-md transition duration-150 cursor-pointer ${
                                      sub.disabled ? 'opacity-40 cursor-not-allowed' : ''
                                    } ${
                                      isSubSelected
                                        ? 'bg-[var(--blue-accent)]/8 text-[var(--blue-accent)] font-bold'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{sub.label}</span>
                                    </div>
                                    {sub.count !== undefined && sub.count !== null && (
                                      <span className="text-[9px] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] px-1.5 rounded font-mono font-semibold">{sub.count}</span>
                                    )}
                                    {sub.badge && (
                                      <span className="text-[8.5px] px-1 py-0.2 rounded font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">{sub.badge}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        {!isLeftSidebarCollapsed && (
          <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card)]/15 text-[10px] space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[var(--text-main)] font-semibold">Oi Beta GovTech Node</span>
            </div>
            <span className="text-[9px] text-[var(--text-secondary)] block font-mono">SUPABASE DB: INTEGRADO</span>
          </div>
        )}
      </div>

      {isMobileSidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-25 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </>
  );
}
