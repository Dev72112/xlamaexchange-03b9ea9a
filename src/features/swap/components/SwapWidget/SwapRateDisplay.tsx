/**
 * SwapRateDisplay Component
 * Shows exchange rate, price impact, and last update time
 */

import { memo } from 'react';
import { RefreshCw, AlertTriangle, Clock, TrendingUp, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SwapRateDisplayProps {
  fromSymbol: string;
  toSymbol: string;
  exchangeRate: number | null;
  priceImpact?: string;
  gasCostUsd?: string;
  lastUpdated?: Date | null;
  isLoading?: boolean;
  countdown?: number;
  onRefresh?: () => void;
  className?: string;
}

export const SwapRateDisplay = memo(function SwapRateDisplay({
  fromSymbol,
  toSymbol,
  exchangeRate,
  priceImpact,
  gasCostUsd,
  lastUpdated,
  isLoading,
  countdown,
  onRefresh,
  className,
}: SwapRateDisplayProps) {
  if (!exchangeRate) return null;

  const priceImpactNum = priceImpact ? parseFloat(priceImpact) : 0;
  const isHighImpact = priceImpactNum > 3;
  const isVeryHighImpact = priceImpactNum > 5;

  return (
    <div className={cn("rounded-lg bg-secondary/30 border border-border/50", className)}>
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-sm hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono">
              1 {fromSymbol} = {exchangeRate.toFixed(6)} {toSymbol}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {countdown !== undefined && countdown > 0 && (
              <span className="text-xs text-muted-foreground">
                {countdown}s
              </span>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isLoading}
                className="h-6 w-6"
              >
                <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 text-sm">
            {/* Price Impact */}
            {priceImpact && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={cn(
                  "font-medium",
                  isVeryHighImpact && "text-destructive",
                  isHighImpact && !isVeryHighImpact && "text-warning"
                )}>
                  {isHighImpact && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {priceImpact}%
                </span>
              </div>
            )}

            {/* Gas Estimate */}
            {gasCostUsd && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fuel className="w-3 h-3" />
                  Est. Gas
                </span>
                <span className="font-mono">${gasCostUsd}</span>
              </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated
                </span>
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}

            {/* High Impact Warning */}
            {isHighImpact && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "w-full justify-center py-1",
                  isVeryHighImpact 
                    ? "bg-destructive/10 text-destructive border-destructive/20" 
                    : "bg-warning/10 text-warning border-warning/20"
                )}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {isVeryHighImpact ? 'Very high price impact!' : 'High price impact'}
              </Badge>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
