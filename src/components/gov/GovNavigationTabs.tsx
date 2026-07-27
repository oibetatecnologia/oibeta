import React from 'react';
import { GOV_NAVIGATION_TABS, type GovTab } from './constants/navigation';

interface GovNavigationTabsProps {
  currentTab: GovTab;
  onNavigate: (tabId: string) => void;
}

export default function GovNavigationTabs({
  currentTab,
  onNavigate,
}: GovNavigationTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-1 pb-1 border-b border-[var(--border-color)]/50 select-none scrollbar-none">
      {GOV_NAVIGATION_TABS.map((item) => {
        const TabIcon = item.icon;
        const isSelected = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-extrabold shadow-sm'
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
