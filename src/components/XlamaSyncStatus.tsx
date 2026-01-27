import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Check, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useXlamaWalletSync } from '@/hooks/useXlamaWalletSync';
import { useDataSource } from '@/contexts/DataSourceContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface XlamaSyncStatusProps {
  compact?: boolean;
  className?: string;
  showButton?: boolean;
}

export const XlamaSyncStatus: React.FC<XlamaSyncStatusProps> = ({
  compact = false,
  className,
  showButton = true,
}) => {
  const { isXlamaEnabled } = useDataSource();
  const {
    isRegistered,
    isSyncing,
    isRegistering,
    lastSyncedAt,
    syncTransactions,
    registerWallet,
    syncError,
    registerError,
  } = useXlamaWalletSync();

  // Only show when xLama is enabled
  if (!isXlamaEnabled) return null;

  // Status display
  const getSyncStatus = () => {
    if (isSyncing || isRegistering) {
      return {
        icon: Loader2,
        label: isRegistering ? 'Registering...' : 'Syncing...',
        variant: 'default' as const,
        animate: true,
      };
    }
    if (syncError || registerError) {
      return {
        icon: AlertCircle,
        label: 'Sync Error',
        variant: 'destructive' as const,
        animate: false,
      };
    }
    if (!isRegistered) {
      return {
        icon: Clock,
        label: 'Not Registered',
        variant: 'secondary' as const,
        animate: false,
      };
    }
    if (lastSyncedAt) {
      return {
        icon: Check,
        label: `Synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`,
        variant: 'secondary' as const,
        animate: false,
      };
    }
    return {
      icon: Clock,
      label: 'Pending Sync',
      variant: 'secondary' as const,
      animate: false,
    };
  };

  const status = getSyncStatus();
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isRegistered ? syncTransactions() : registerWallet()}
            disabled={isSyncing || isRegistering}
            className={cn("h-8 w-8", className)}
          >
            <StatusIcon className={cn("w-4 h-4", status.animate && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.label}</p>
          {showButton && !isSyncing && !isRegistering && (
            <p className="text-xs text-muted-foreground">Click to {isRegistered ? 'sync' : 'register'}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={status.variant} className="gap-1.5 py-1 px-2">
        <StatusIcon className={cn("w-3 h-3", status.animate && "animate-spin")} />
        <span className="text-xs">{status.label}</span>
      </Badge>
      
      {showButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => isRegistered ? syncTransactions() : registerWallet()}
          disabled={isSyncing || isRegistering}
          className="h-7 px-2 text-xs gap-1"
        >
          <RefreshCw className={cn("w-3 h-3", (isSyncing || isRegistering) && "animate-spin")} />
          {isRegistered ? 'Sync' : 'Register'}
        </Button>
      )}
    </div>
  );
};

export default XlamaSyncStatus;
