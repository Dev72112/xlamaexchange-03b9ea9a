/**
 * DebugBanner - Shows when debug mode is active
 * Indicates simulated wallet connection for testing
 */
import { memo, useState, useEffect } from 'react';
import { Bug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to detect debug mode from URL (works outside Router context)
function getDebugModeFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === 'wallet';
}

export const DebugBanner = memo(function DebugBanner() {
  const [isDebugMode, setIsDebugMode] = useState(() => getDebugModeFromUrl());
  
  // Listen for URL changes
  useEffect(() => {
    const handleLocationChange = () => setIsDebugMode(getDebugModeFromUrl());
    window.addEventListener('popstate', handleLocationChange);
    // Also check on navigation (for pushState)
    const interval = setInterval(() => {
      const current = getDebugModeFromUrl();
      if (current !== isDebugMode) setIsDebugMode(current);
    }, 500);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [isDebugMode]);
  
  if (!isDebugMode) return null;
  
  const handleClose = () => {
    // Remove debug param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.history.replaceState({}, '', url.toString());
    setIsDebugMode(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning/95 text-warning-foreground py-1.5 px-4">
      <div className="container flex items-center justify-center gap-2 text-xs font-medium">
        <Bug className="w-3.5 h-3.5" />
        <span>Debug Mode: Simulated wallet connection - Data is mocked</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 w-5 p-0 ml-2 hover:bg-warning-foreground/20"
          onClick={handleClose}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});
