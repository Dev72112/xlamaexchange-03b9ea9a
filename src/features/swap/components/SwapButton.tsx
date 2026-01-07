/**
 * SwapButton - Main swap action button with state-based rendering
 */
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwapButtonProps {
  mode: 'instant' | 'dex';
  isConnected: boolean;
  isOnCorrectChain: boolean;
  chainName: string;
  isEvmChain: boolean;
  hasInsufficientBalance: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  pairUnavailable?: boolean;
  onClick: () => void;
  className?: string;
}

export function SwapButton({
  mode,
  isConnected,
  isOnCorrectChain,
  chainName,
  isEvmChain,
  hasInsufficientBalance,
  isLoading,
  isDisabled,
  pairUnavailable = false,
  onClick,
  className,
}: SwapButtonProps) {
  const getButtonContent = () => {
    if (mode === 'dex') {
      if (!isConnected) {
        return 'Connect Wallet';
      }
      if (!isOnCorrectChain) {
        if (isEvmChain) {
          return `Switch to ${chainName}`;
        }
        return `Connect ${chainName} Wallet`;
      }
      if (hasInsufficientBalance) {
        return 'Insufficient Balance';
      }
      if (isLoading) {
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Swapping...
          </>
        );
      }
      return 'Swap';
    }

    if (pairUnavailable) {
      return 'Pair Unavailable';
    }
    return 'Convert';
  };

  return (
    <Button
      size="lg"
      className={cn(
        'flex-1 h-12 font-medium rounded-xl',
        hasInsufficientBalance && mode === 'dex'
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'bg-foreground text-background hover:bg-foreground/90',
        className
      )}
      onClick={onClick}
      disabled={isDisabled}
    >
      {getButtonContent()}
    </Button>
  );
}
