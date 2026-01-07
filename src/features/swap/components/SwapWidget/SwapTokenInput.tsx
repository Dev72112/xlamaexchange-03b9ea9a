/**
 * SwapTokenInput Component
 * Token amount input with balance display and max button
 */

import { memo } from 'react';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DexTokenSelector } from '@/components/exchange/DexTokenSelector';
import { OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';

interface SwapTokenInputProps {
  label: string;
  token: OkxToken | null;
  amount: string;
  balance?: string;
  usdValue?: string;
  isLoading?: boolean;
  balanceLoading?: boolean;
  readOnly?: boolean;
  hasError?: boolean;
  onAmountChange?: (amount: string) => void;
  onTokenSelect: (token: OkxToken) => void;
  onMaxClick?: () => void;
  tokens: OkxToken[];
  nativeToken: OkxToken | null;
  tokensLoading?: boolean;
  chain: Chain;
  className?: string;
}

export const SwapTokenInput = memo(function SwapTokenInput({
  label,
  token,
  amount,
  balance,
  usdValue,
  isLoading,
  balanceLoading,
  readOnly,
  hasError,
  onAmountChange,
  onTokenSelect,
  onMaxClick,
  tokens,
  nativeToken,
  tokensLoading,
  chain,
  className,
}: SwapTokenInputProps) {
  const hasBalance = balance && balance !== '0' && balance !== '< 0.000001';
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Label and Balance */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        {balance !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Balance:</span>
            {balanceLoading ? (
              <Skeleton className="h-3 w-12" />
            ) : (
              <span className={cn(hasError && "text-destructive")}>
                {balance}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Token Selector + Amount Input */}
      <div className="flex gap-2">
        <DexTokenSelector
          tokens={tokens}
          value={token}
          onChange={onTokenSelect}
          nativeToken={nativeToken}
          isLoading={tokensLoading}
          chain={chain}
        />
        <div className="flex-1 relative">
          <Input
            type="number"
            placeholder="0.0"
            value={isLoading ? '' : amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            readOnly={readOnly}
            className={cn(
              "text-right font-mono text-lg pr-14",
              readOnly && "bg-muted/30",
              hasError && "border-destructive"
            )}
          />
          {!readOnly && hasBalance && onMaxClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMaxClick}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs px-2 font-semibold text-primary hover:text-primary"
            >
              MAX
            </Button>
          )}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Skeleton className="h-5 w-16" />
            </div>
          )}
        </div>
      </div>

      {/* USD Value */}
      {usdValue && parseFloat(usdValue.replace(/[^0-9.-]/g, '')) > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
          <DollarSign className="w-3 h-3" />
          <span>{usdValue}</span>
        </div>
      )}
    </div>
  );
});
