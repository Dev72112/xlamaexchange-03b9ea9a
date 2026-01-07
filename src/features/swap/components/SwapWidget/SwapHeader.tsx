/**
 * SwapHeader Component
 * Mode toggle and settings for the swap widget
 */

import { memo } from 'react';
import { Star, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ModeToggle, ExchangeMode } from '@/components/exchange/ModeToggle';
import { ChainSelector } from '@/components/exchange/ChainSelector';
import { SlippageSettings } from '@/components/exchange/SlippageSettings';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';

interface SwapHeaderProps {
  mode: ExchangeMode;
  onModeChange: (mode: ExchangeMode) => void;
  selectedChain: Chain;
  onChainChange: (chain: Chain) => void;
  slippage: string;
  onSlippageChange: (slippage: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onToggleChart?: () => void;
  showChart?: boolean;
  className?: string;
}

export const SwapHeader = memo(function SwapHeader({
  mode,
  onModeChange,
  selectedChain,
  onChainChange,
  slippage,
  onSlippageChange,
  isFavorite,
  onToggleFavorite,
  onToggleChart,
  showChart,
  className,
}: SwapHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Toggle */}
      <ModeToggle mode={mode} onModeChange={onModeChange} />

      {/* DEX Mode Header */}
      {mode === 'dex' && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <ChainSelector
              selectedChain={selectedChain}
              onChainSelect={onChainChange}
            />
            <Badge variant="secondary" className="shrink-0 text-xs bg-success/10 text-success border-success/20">
              0% Fee
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleChart && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleChart}
                    className={cn("h-8 w-8", showChart && "bg-primary/10 text-primary")}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Price Chart</TooltipContent>
              </Tooltip>
            )}
            <SlippageSettings slippage={slippage} onSlippageChange={onSlippageChange} />
          </div>
        </div>
      )}

      {/* Instant Mode Header */}
      {mode === 'instant' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              400+ Coins
            </Badge>
            <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
              Non-Custodial
            </Badge>
          </div>
          {onToggleFavorite && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleFavorite}
                  className="h-8 w-8"
                >
                  <Star className={cn("w-4 h-4", isFavorite && "fill-warning text-warning")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
});
