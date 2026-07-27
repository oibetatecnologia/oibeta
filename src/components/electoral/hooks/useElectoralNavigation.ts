import { useEffect, useState } from 'react';
import {
  ACTIVE_TAB_TO_ELECTORAL_TAB,
  ELECTORAL_TAB_TO_ACTIVE_TAB,
  type ElectoralSubTab,
} from '../constants/navigation';

/**
 * useElectoralNavigation
 *
 * Centraliza a sincronização entre activeTab global e subaba interna
 * do módulo Beta Electoral.
 */
export function useElectoralNavigation(
  activeTab: string,
  setActiveTab: (tab: string) => void
) {
  const [currentSubTab, setCurrentSubTab] = useState<ElectoralSubTab>('dashboard');

  useEffect(() => {
    const mappedTab = ACTIVE_TAB_TO_ELECTORAL_TAB[activeTab];
    if (mappedTab) {
      setCurrentSubTab(mappedTab);
    }
  }, [activeTab]);

  const handleSubTabChange = (tabId: string) => {
    const nextSubTab = tabId as ElectoralSubTab;
    setCurrentSubTab(nextSubTab);

    const nextActiveTab = ELECTORAL_TAB_TO_ACTIVE_TAB[nextSubTab];
    if (nextActiveTab) {
      setActiveTab(nextActiveTab);
    }
  };

  return {
    currentSubTab,
    handleSubTabChange,
  };
}
