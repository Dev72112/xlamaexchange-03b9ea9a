/**
 * Tab Persistence Hook
 * Remembers user's last selected tab per page
 */

import { useState, useCallback } from 'react';

const TAB_STORAGE_KEY = 'xlama-active-tabs';

type PageKey = 'portfolio' | 'analytics' | 'history' | 'orders';

export function useTabPersistence(page: PageKey, defaultTab: string) {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultTab;
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored) {
        const tabs = JSON.parse(stored);
        return tabs[page] || defaultTab;
      }
    } catch (e) {
      console.warn('[useTabPersistence] Failed to read from localStorage:', e);
    }
    return defaultTab;
  });

  const setTab = useCallback((tab: string) => {
    setActiveTab(tab);
    try {
      const stored = JSON.parse(localStorage.getItem(TAB_STORAGE_KEY) || '{}');
      stored[page] = tab;
      localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.warn('[useTabPersistence] Failed to save to localStorage:', e);
    }
  }, [page]);

  return [activeTab, setTab] as const;
}

export default useTabPersistence;
