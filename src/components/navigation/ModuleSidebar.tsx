import React, { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { CoreItems } from './CoreMenu';
import { GovItems } from './GovMenu';
import { LicitaItems } from './LicitaMenu';
import { ElectoralItems } from './ElectoralMenu';
import { AdminItems } from './AdminMenu';
import { SystemItems } from './SystemMenu';
import { MenuGroup } from './types';

interface ModuleSidebarProps {
  isLeftSidebarCollapsed: boolean;
  setIsLeftSidebarCollapsed: (collapsed: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isModuleActive: (code: string) => boolean;
}

export default function ModuleSidebar({
  isLeftSidebarCollapsed,
  setIsLeftSidebarCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  activeTab,
  setActiveTab,
  isModuleActive
}: ModuleSidebarProps) {

  const menuGroups: MenuGroup[] = [
    { id: 'core', label: 'CORE', items: CoreItems },
    { id: 'govtech', label: 'GOVTECH', items: [...GovItems, ...SystemItems, ...LicitaItems] },
    { id: 'politico', label: 'POLÍTICO', items: ElectoralItems },
    { id: 'administracao', label: 'ADMINISTRAÇÃO', items: AdminItems }
  ];

  const activeGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.module ? isModuleActive(item.module) : true)
  })).filter(g => g.items.length > 0);

  // States for submenus
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`bg-[var(--bg-sidebar)] text-[var(--text-secondary)] flex flex-col shrink-0 border-r border-[var(--border-color)] transition-all duration-300 z-30 absolute lg:relative h-full ${
      isMobileSidebarOpen ? 'w-[280px] translate-x-0' : 'translate-x-0 ' + (isLeftSidebarCollapsed ? 'lg:w-[64px]' : 'lg:w-[280px]')
    } ${isMobileSidebarOpen ? 'left-0' : '-translate-x-full lg:translate-x-0'}`}>
      
      <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        {!isLeftSidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-[var(--blue-accent)] text-white p-1.5 rounded-lg shadow-inner"><Building2 className="w-4 h-4" /></div>
            <div>
              <span className="font-extrabold text-[var(--text-main)] text-sm tracking-widest block font-sans">OI BETA</span>
              <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">TECNOLOGIA</span>
            </div>
          </div>
        )}
        <button className="hidden lg:flex p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-xs" onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}>
          {isLeftSidebarCollapsed ? "→" : "←"}
        </button>
        <button className="lg:hidden p-1.5 rounded-lg border border-[var(--border-color)]" onClick={() => setIsMobileSidebarOpen(false)}><X className="w-4 h-4" /></button>
      </div>

      <nav className="flex-1 px-2 pb-4 pt-2 space-y-4 overflow-y-auto">
        {activeGroups.map(group => (
          <div key={group.id} className="space-y-1">
            {!isLeftSidebarCollapsed && <span className="px-3 text-[9px] font-black text-[var(--text-secondary)]/75 uppercase tracking-widest font-mono block mb-1.5">{group.label}</span>}
            {group.items.map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id || (item.subItems?.some(s => s.id === activeTab));
              return (
                <div key={item.id}>
                  <button
                    onClick={() => item.subItems ? toggleItem(item.id) : setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-md transition ${isSelected ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)]' : 'hover:bg-[var(--bg-card)]'}`}
                  >
                    <div className="flex items-center gap-2"><Icon className="w-4 h-4" />{!isLeftSidebarCollapsed && item.label}</div>
                  </button>
                  {item.subItems && expandedItems[item.id] && !isLeftSidebarCollapsed && (
                    <div className="ml-6 pl-2 border-l border-[var(--border-color)] mt-1 space-y-0.5">
                      {item.subItems.map(sub => (
                        <button key={sub.id} onClick={() => setActiveTab(sub.id)} className={`w-full text-left px-2 py-1 text-xs ${activeTab === sub.id ? 'text-[var(--blue-accent)]' : ''}`}>{sub.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
