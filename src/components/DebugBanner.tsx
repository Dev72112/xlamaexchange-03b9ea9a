/**
 * DebugBanner - Shows when debug mode is active
 * Indicates simulated wallet connection for testing
 */
import { memo } from 'react';
import { Bug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';

export const DebugBanner = memo(function DebugBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === 'wallet';
  
  if (!isDebugMode) return null;
  
  const handleClose = () => {
    searchParams.delete('debug');
    setSearchParams(searchParams);
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
