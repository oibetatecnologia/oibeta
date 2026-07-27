import React from 'react';
import { ELECTORAL_NAVIGATION_TABS, type ElectoralSubTab } from './constants/navigation';

interface ElectoralNavigationTabsProps {
  currentSubTab: ElectoralSubTab;
  onNavigate: (tabId: string) => void;
}

/**
 * ElectoralNavigationTabs
 *
 * Navegação interna oficial do Beta Electoral.
 */
export default function ElectoralNavigationTabs({
  currentSubTab,
  onNavigate,
}: ElectoralNavigationTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-1 border-b border-[var(--border-color)]/50 select-none scrollbar-none">
      {ELECTORAL_NAVIGATION_TABS.map((item) => {
        const TabIcon = item.icon;
        const isSelected = currentSubTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
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
