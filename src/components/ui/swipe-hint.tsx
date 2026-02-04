/**
 * SwipeHint Component
 * 
 * A dismissable tooltip that hints mobile users about swipe navigation.
 * Uses localStorage to persist dismissal state with 24h expiry.
 * 
 * IMPORTANT: This component has a built-in delay to prevent flash on initial render.
 * It only shows after the page has fully stabilized (~2s after mount).
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWIPE_HINT_DISMISSED_PREFIX = 'xlama_swipe_hint_dismissed_';
const PAGE_READY_DELAY_MS = 2000; // Wait 2s for page to fully stabilize
const AUTO_DISMISS_MS = 10000; // Auto-dismiss after 10s
const DISMISS_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  
  // Use refs to persist state across re-renders without triggering effects
  const hasInitializedRef = useRef(false);
  const hasShownRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  
  const [showHint, setShowHint] = useState(false);
  
  // Single effect that handles the entire lifecycle
  useEffect(() => {
    if (!isMobile) return;
    
    // Only run initialization once per component instance
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    // Check if already dismissed recently (within 24h)
    const dismissedAt = localStorage.getItem(storageKey);
    const now = Date.now();
    const shouldShow = !dismissedAt || (now - parseInt(dismissedAt, 10)) > DISMISS_EXPIRY_MS;
    
    if (!shouldShow) return;
    
    // Wait for page to stabilize before showing
    const showTimer = setTimeout(() => {
      // Double-check we haven't been dismissed or already shown
      if (hasShownRef.current) return;
      hasShownRef.current = true;
      setShowHint(true);
    }, PAGE_READY_DELAY_MS);
    
    return () => clearTimeout(showTimer);
  }, [isMobile, storageKey]);
  
  // Separate effect for auto-dismiss (only runs when showHint becomes true)
  useEffect(() => {
    if (!showHint) return;
    
    const dismissTimer = setTimeout(() => {
      setShowHint(false);
      localStorage.setItem(storageKey, Date.now().toString());
    }, AUTO_DISMISS_MS);
    
    return () => clearTimeout(dismissTimer);
  }, [showHint, storageKey]);
  
  const dismissHint = useCallback(() => {
    setShowHint(false);
    localStorage.setItem(storageKey, Date.now().toString());
  }, [storageKey]);
  
  // Don't render until we're ready to show
  if (!showHint || !isMobile) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 py-2.5 px-4 mt-2 text-xs",
        "text-primary bg-primary/10 border border-primary/20 rounded-lg",
        "animate-fade-in cursor-pointer transition-all hover:bg-primary/15",
        "touch-manipulation min-h-[44px]",
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
