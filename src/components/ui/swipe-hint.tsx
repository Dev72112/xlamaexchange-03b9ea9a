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
  
  // Check localStorage on mount
  useEffect(() => {
    if (isMobile) {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        setShowHint(true);
        // Auto-dismiss after 6 seconds
        const timer = setTimeout(() => {
          dismissHint();
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [isMobile, storageKey]);
  
  const dismissHint = useCallback(() => {
    setShowHint(false);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);
  
  if (!showHint || !isMobile) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-4 mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg animate-fade-in cursor-pointer",
        className
      )}
      onClick={dismissHint}
      role="button"
      tabIndex={0}
      aria-label="Dismiss swipe hint"
    >
      <ChevronLeft className="w-3 h-3 animate-pulse" />
      <span>{text}</span>
      <ChevronRight className="w-3 h-3 animate-pulse" />
      <X className="w-3 h-3 ml-2 opacity-50" />
    </div>
  );
});
