import { useMemo } from 'react';
import { normalizeGovTab } from '../constants/navigation';

export function useGovNavigation(
  activeTab: string,
  setActiveTab: (tab: string) => void
) {
  const currentTab = useMemo(() => normalizeGovTab(activeTab), [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(normalizeGovTab(tabId));
  };

  return {
    currentTab,
    handleTabChange,
  };
}
