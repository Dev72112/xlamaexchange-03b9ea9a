/**
 * SwapActions Component
 * Connect/Approve/Swap buttons with loading states
 */

import { memo } from 'react';
import { Loader2, Wallet, Lock, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MultiWalletButton } from '@/components/wallet/MultiWalletButton';
import { cn } from '@/lib/utils';

interface SwapActionsProps {
  isConnected: boolean;
  isLoading: boolean;
  isQuoteLoading?: boolean;
  canSwap: boolean;
  hasInsufficientBalance: boolean;
  needsChainSwitch?: boolean;
  chainName?: string;
  quoteError?: string | null;
  onSwap: () => void;
  onSwitchChain?: () => void;
  buttonText?: string;
  className?: string;
}

export const SwapActions = memo(function SwapActions({
  isConnected,
  isLoading,
  isQuoteLoading,
  canSwap,
  hasInsufficientBalance,
  needsChainSwitch,
  chainName,
  quoteError,
  onSwap,
  onSwitchChain,
  buttonText,
  className,
}: SwapActionsProps) {
  // Not connected - show connect button
  if (!isConnected) {
    return (
      <div className={cn("w-full", className)}>
        <MultiWalletButton />
      </div>
    );
  }

  // Need to switch chain
  if (needsChainSwitch && onSwitchChain) {
    return (
      <Button
        size="lg"
        onClick={onSwitchChain}
        className={cn(
          "w-full gradient-primary text-primary-foreground sweep-effect sweep-effect-fast",
          className
        )}
      >
        <Lock className="w-4 h-4 mr-2" />
        Switch to {chainName}
      </Button>
    );
  }

  // Quote loading
  if (isQuoteLoading) {
    return (
      <Button
        size="lg"
        disabled
        className={cn("w-full", className)}
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Getting Quote...
      </Button>
    );
  }

  // Quote error
  if (quoteError) {
    return (
      <Button
        size="lg"
        disabled
        variant="destructive"
        className={cn("w-full opacity-70", className)}
      >
        <AlertCircle className="w-4 h-4 mr-2" />
        {quoteError.length > 30 ? 'Quote unavailable' : quoteError}
      </Button>
    );
  }

  // Insufficient balance
  if (hasInsufficientBalance) {
    return (
      <Button
        size="lg"
        disabled
        variant="destructive"
        className={cn("w-full opacity-70 min-w-0 max-w-full overflow-hidden", className)}
      >
        <Wallet className="w-4 h-4 mr-2 shrink-0" />
        <span className="truncate">Insufficient Balance</span>
      </Button>
    );
  }

  // Main swap button with premium sweep animation
  return (
    <Button
      size="lg"
      onClick={onSwap}
      disabled={!canSwap || isLoading}
      className={cn(
        "w-full gradient-primary text-primary-foreground disabled:opacity-50",
        "sweep-effect sweep-effect-fast shadow-premium-hover",
        "transition-all duration-200 min-w-0 max-w-full overflow-hidden",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" style={{ willChange: 'transform' }} />
          <span className="truncate">Swapping...</span>
        </>
      ) : (
        <>
          <ArrowRightLeft className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{buttonText || 'Swap'}</span>
        </>
      )}
    </Button>
  );
});
