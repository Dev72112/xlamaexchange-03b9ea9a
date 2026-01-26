/**
 * SwipeableTabs Component
 * 
 * A reusable tab component with built-in swipe gesture support for mobile,
 * haptic feedback, and optional swipe hint for first-time users.
 */

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
  /** Optional indicator (e.g., notification dot) */
  indicator?: ReactNode;
}

interface SwipeableTabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Custom class for the tabs container */
  className?: string;
  /** Custom class for the tab list */
  listClassName?: string;
  /** Custom class for individual triggers */
  triggerClassName?: string;
  /** Custom class for content area */
  contentClassName?: string;
  /** Enable swipe hint for first-time users */
  showSwipeHint?: boolean;
  /** LocalStorage key for dismissing swipe hint */
  swipeHintKey?: string;
  /** Disable haptic feedback */
  disableHaptics?: boolean;
}

const SWIPE_HINT_DISMISSED_PREFIX = 'xlama_swipe_hint_dismissed_';

export function SwipeableTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  listClassName,
  triggerClassName,
  contentClassName,
  showSwipeHint = false,
  swipeHintKey = 'default',
  disableHaptics = false,
}: SwipeableTabsProps) {
  const isMobile = useIsMobile();
  const { trigger } = useHapticFeedback();
  
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue || tabs[0]?.value || '');
  const activeValue = controlledValue !== undefined ? controlledValue : internalValue;
  
  // Swipe hint state
  const storageKey = `${SWIPE_HINT_DISMISSED_PREFIX}${swipeHintKey}`;
  const [showHint, setShowHint] = useState(false);
  
  // Check localStorage for hint dismissal
  useEffect(() => {
    if (showSwipeHint && isMobile) {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        setShowHint(true);
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          dismissHint();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [showSwipeHint, isMobile, storageKey]);
  
  const dismissHint = useCallback(() => {
    setShowHint(false);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);
  
  // Handle value change
  const handleValueChange = useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [controlledValue, onValueChange]);
  
  // Get tab order for swipe navigation
  const tabValues = tabs.map(t => t.value);
  const currentIndex = tabValues.indexOf(activeValue);
  
  // Swipe handlers
  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < tabValues.length - 1) {
      const newValue = tabValues[currentIndex + 1];
      handleValueChange(newValue);
      if (!disableHaptics) trigger('light');
      dismissHint();
    }
  }, [currentIndex, tabValues, handleValueChange, disableHaptics, trigger, dismissHint]);
  
  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      const newValue = tabValues[currentIndex - 1];
      handleValueChange(newValue);
      if (!disableHaptics) trigger('light');
      dismissHint();
    }
  }, [currentIndex, tabValues, handleValueChange, disableHaptics, trigger, dismissHint]);
  
  const { handlers: swipeHandlers } = useSwipeGesture(handleSwipeLeft, handleSwipeRight);
  
  return (
    <Tabs
      value={activeValue}
      onValueChange={handleValueChange}
      className={cn('space-y-4', className)}
    >
      <TabsList className={cn('w-full', listClassName)}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn('relative', triggerClassName)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
            {tab.indicator}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {/* Swipe hint overlay */}
      {showHint && isMobile && (
        <div 
          className="flex items-center justify-center gap-2 py-2 px-4 text-xs text-muted-foreground bg-secondary/50 rounded-lg animate-fade-in"
          onClick={dismissHint}
        >
          <ChevronLeft className="w-3 h-3 animate-pulse" />
          <span>Swipe to navigate tabs</span>
          <ChevronRight className="w-3 h-3 animate-pulse" />
        </div>
      )}
      
      {/* Content area with swipe handlers on mobile */}
      <div {...(isMobile ? swipeHandlers : {})}>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={contentClassName}
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

/**
 * Hook variant for adding swipe to existing Tabs
 */
export function useSwipeableTabs<T extends string>(
  tabs: T[],
  currentTab: T,
  setTab: (tab: T) => void,
  options?: { disableHaptics?: boolean }
) {
  const isMobile = useIsMobile();
  const { trigger } = useHapticFeedback();
  
  const currentIndex = tabs.indexOf(currentTab);
  
  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < tabs.length - 1) {
      setTab(tabs[currentIndex + 1]);
      if (!options?.disableHaptics) trigger('light');
    }
  }, [currentIndex, tabs, setTab, options?.disableHaptics, trigger]);
  
  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      setTab(tabs[currentIndex - 1]);
      if (!options?.disableHaptics) trigger('light');
    }
  }, [currentIndex, tabs, setTab, options?.disableHaptics, trigger]);
  
  const { handlers } = useSwipeGesture(handleSwipeLeft, handleSwipeRight);
  
  return {
    swipeHandlers: isMobile ? handlers : {},
    canSwipeLeft: currentIndex < tabs.length - 1,
    canSwipeRight: currentIndex > 0,
  };
}
