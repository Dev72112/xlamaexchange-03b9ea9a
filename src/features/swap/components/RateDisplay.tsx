/**
 * RateDisplay - Exchange rate display with refresh and countdown
 */
import { Lock, Info, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RateDisplayProps {
  mode: 'instant' | 'dex';
  rate: number;
  fromSymbol: string;
  toSymbol: string;
  isFixed?: boolean;
  countdown?: number;
  isLoading?: boolean;
  onRefresh: () => void;
}

export function RateDisplay({
  mode,
  rate,
  fromSymbol,
  toSymbol,
  isFixed = false,
  countdown,
  isLoading = false,
  onRefresh,
}: RateDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {mode === 'instant' && isFixed && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
        <span>
          1 {fromSymbol} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toSymbol}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="inline-flex">
              <Info className="w-3.5 h-3.5 cursor-help" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px]">
            {mode === 'instant' ? (
              isFixed ? (
                <p className="text-xs">
                  <strong className="text-primary">Fixed rate</strong> - This rate is guaranteed for 10 minutes.
                </p>
              ) : (
                <p className="text-xs">
                  <strong className="text-warning">Floating rate</strong> - Rate follows the market.
                </p>
              )
            ) : (
              <p className="text-xs">
                <strong className="text-primary">DEX rate</strong> - Best rate aggregated from multiple DEXs.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Refresh rate"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>
      {countdown !== undefined && (
        <p className="text-center text-xs text-muted-foreground/60">
          Auto-refresh in {countdown}s
        </p>
      )}
    </div>
  );
}
