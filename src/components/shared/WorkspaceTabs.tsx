import React from 'react';

export interface WorkspaceTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function WorkspaceTabs({ tabs, activeTab, onTabChange }: WorkspaceTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-1 border-b border-[var(--border-color)]/50 select-none scrollbar-none">
      {tabs.map((item) => {
        const TabIcon = item.icon;
        const isSelected = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] border border-[var(--blue-accent)]/30 font-extrabold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/40 border border-transparent'
            }`}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
