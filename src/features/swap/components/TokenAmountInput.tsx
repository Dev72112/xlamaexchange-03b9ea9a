/**
 * TokenAmountInput - Reusable token amount input with optional USD value display
 */
import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TokenAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  usdValue?: string;
  balance?: string;
  tokenSymbol?: string;
  showBalance?: boolean;
  showMax?: boolean;
  hasInsufficientBalance?: boolean;
  balanceLoading?: boolean;
  onMaxClick?: () => void;
  className?: string;
}

export const TokenAmountInput = forwardRef<HTMLInputElement, TokenAmountInputProps>(
  (
    {
      value,
      onChange,
      placeholder = '0',
      disabled = false,
      readOnly = false,
      usdValue,
      balance,
      tokenSymbol,
      showBalance = false,
      showMax = false,
      hasInsufficientBalance = false,
      balanceLoading = false,
      onMaxClick,
      className,
    },
    ref
  ) => {
    return (
      <div className={cn('flex-1 min-w-0 overflow-hidden', className)}>
        {readOnly ? (
          <div className="text-right text-xl sm:text-2xl md:text-3xl font-medium font-mono truncate">
            {value ? (
              <span className="animate-fade-in truncate block">
                {parseFloat(value).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </div>
        ) : (
          <Input
            ref={ref}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="border-0 bg-transparent text-right text-xl sm:text-2xl md:text-3xl font-medium focus-visible:ring-0 p-0 h-auto w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        )}
        
        {usdValue && (
          <div className="text-right text-xs text-muted-foreground mt-0.5 truncate">
            {usdValue}
          </div>
        )}
        
        {showBalance && tokenSymbol && (
          <div className="flex items-center justify-between mt-2">
            <span
              className={cn(
                'text-xs',
                hasInsufficientBalance ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              Balance: {balanceLoading ? '...' : balance} {tokenSymbol}
              {hasInsufficientBalance && ' (Insufficient)'}
            </span>
            {showMax && onMaxClick && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:text-primary"
                onClick={onMaxClick}
                disabled={!balance || balance === '0'}
              >
                MAX
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

TokenAmountInput.displayName = 'TokenAmountInput';
