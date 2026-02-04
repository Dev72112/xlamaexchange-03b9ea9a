/**
 * SwipeHint Component
 * 
 * A dismissable tooltip that hints mobile users about swipe navigation.
 * Uses localStorage to persist dismissal state.
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWIPE_HINT_DISMISSED_PREFIX = 'xlama_swipe_hint_dismissed_';

interface SwipeHintProps {
  /** Unique key for localStorage persistence */
  hintKey: string;
  /** Custom text (default: "Swipe to navigate tabs") */
  text?: string;
  /** Additional className */
  className?: string;
}

export const SwipeHint = memo(function SwipeHint({ 
  hintKey, 
  text = 'Swipe to navigate tabs',
  className,
}: SwipeHintProps) {
  const isMobile = useIsMobile();
  const storageKey = `${SWIPE_HINT_DISMISSED_PREFIX}${hintKey}`;
  const [showHint, setShowHint] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Wait for page to be fully loaded before showing hint
  useEffect(() => {
    // Delay checking until React has fully hydrated and page is stable
    const readyTimer = setTimeout(() => {
      setIsPageReady(true);
    }, 1500); // Wait 1.5s for page to settle
    
    return () => clearTimeout(readyTimer);
  }, []);
  
  // Check localStorage after page is ready
  useEffect(() => {
    if (!isPageReady || !isMobile) return;
    
    const dismissedAt = localStorage.getItem(storageKey);
    const now = Date.now();
    // Show hint if never dismissed or if dismissed more than 24 hours ago
    const shouldShow = !dismissedAt || (now - parseInt(dismissedAt, 10)) > 24 * 60 * 60 * 1000;
    
    if (shouldShow) {
      setShowHint(true);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        dismissHint();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isPageReady, isMobile, storageKey]);
  
  const dismissHint = useCallback(() => {
    setShowHint(false);
    // Store timestamp instead of boolean for 24h expiry
    localStorage.setItem(storageKey, Date.now().toString());
  }, [storageKey]);
  
  // Don't render until page is ready AND we should show
  if (!showHint || !isMobile || !isPageReady) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 py-2.5 px-4 mt-2 text-xs",
        "text-primary bg-primary/10 border border-primary/20 rounded-lg",
        "animate-fade-in cursor-pointer transition-all hover:bg-primary/15",
        className
      )}
      onClick={dismissHint}
      role="button"
      tabIndex={0}
      aria-label="Dismiss swipe hint"
    >
      <ChevronLeft className="w-3.5 h-3.5 animate-pulse" />
      <span className="font-medium">{text}</span>
      <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
      <X className="w-3.5 h-3.5 ml-2 opacity-60" />
    </div>
  );
});
