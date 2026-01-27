/**
 * TokenInputPanel Component
 * 
 * Reusable token input section for the ExchangeWidget.
 * Handles token selection, amount input, balance display, and USD values.
 */

import { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { OkxToken } from '@/services/okxdex';
import { DexTokenSelector } from '../DexTokenSelector';
import { CurrencySelector } from '../CurrencySelector';
import { Currency } from '@/data/currencies';
import { Chain } from '@/data/chains';

export interface TokenInputPanelProps {
  // Mode
  mode: 'instant' | 'dex';
  position: 'from' | 'to';
  
  // Common props
  amount: string;
  onAmountChange?: (amount: string) => void;
  usdValue?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  
  // Instant mode props
  currency?: Currency;
  currencies?: Currency[];
  onCurrencyChange?: (currency: Currency) => void;
  currenciesLoading?: boolean;
  
  // DEX mode props
  token?: OkxToken | null;
  tokens?: OkxToken[];
  onTokenChange?: (token: OkxToken | null) => void;
  tokensLoading?: boolean;
  chain?: Chain;
  
  // Balance (for "from" position)
  balance?: string | null;
  balanceLoading?: boolean;
  onMaxClick?: () => void;
  hasInsufficientBalance?: boolean;
}

export const TokenInputPanel = memo(function TokenInputPanel({
  mode,
  position,
  amount,
  onAmountChange,
  usdValue,
  isLoading,
  disabled,
  // Instant mode
  currency,
  currencies,
  onCurrencyChange,
  currenciesLoading,
  // DEX mode
  token,
  tokens,
  onTokenChange,
  tokensLoading,
  chain,
  // Balance
  balance,
  balanceLoading,
  onMaxClick,
  hasInsufficientBalance,
}: TokenInputPanelProps) {
  const isFrom = position === 'from';
  const isReadOnly = position === 'to';
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, numbers, and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onAmountChange?.(value);
    }
  }, [onAmountChange]);

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">
          {isFrom ? 'You pay' : 'You receive'}
        </span>
        {isFrom && mode === 'dex' && balance !== undefined && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-xs">Balance:</span>
            {balanceLoading ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className={hasInsufficientBalance ? 'text-destructive' : ''}>
                {balance || '0'}
              </span>
            )}
            {balance && balance !== '0' && balance !== '< 0.000001' && onMaxClick && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs text-primary hover:text-primary/80"
                onClick={onMaxClick}
              >
                MAX
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Input and selector row */}
      <div className="flex items-center gap-3">
        {/* Token/Currency Selector */}
        <div className="shrink-0">
          {mode === 'instant' ? (
            <CurrencySelector
              currencies={currencies || []}
              value={currency!}
              onChange={onCurrencyChange!}
              isLoading={currenciesLoading}
            />
          ) : (
            <DexTokenSelector
              tokens={tokens || []}
              nativeToken={tokens?.find(t => t.tokenContractAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') || null}
              value={token || null}
              onChange={onTokenChange!}
              isLoading={tokensLoading}
              chain={chain || null}
            />
          )}
        </div>

        {/* Amount Input */}
        <div className="flex-1 min-w-0">
          {isLoading && isReadOnly ? (
            <div className="flex items-center justify-end h-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={amount}
              onChange={handleInputChange}
              placeholder="0.00"
              readOnly={isReadOnly || disabled}
              className={`
                text-right text-xl sm:text-2xl font-semibold h-12 
                border-0 bg-transparent px-0
                focus-visible:ring-0 focus-visible:ring-offset-0
                ${isReadOnly ? 'text-foreground/80' : ''}
                ${hasInsufficientBalance && isFrom ? 'text-destructive' : ''}
              `}
            />
          )}
        </div>
      </div>

      {/* USD Value */}
      {usdValue && (
        <div className="text-right text-sm text-muted-foreground">
          ≈ {usdValue}
        </div>
      )}
    </div>
  );
});
