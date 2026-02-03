/**
 * Chain Activity Heatmap
 * Visual display of trading activity per chain with intensity-based coloring
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChainActivity {
  chain: string;
  chainIndex: string;
  trades: number;
  volume: number;
  lastActive?: Date;
}

interface ChainHeatmapProps {
  chainData: ChainActivity[];
  isLoading?: boolean;
  onChainClick?: (chainIndex: string) => void;
  className?: string;
}

const formatVolume = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export const ChainHeatmap = memo(function ChainHeatmap({
  chainData,
  isLoading = false,
  onChainClick,
  className,
}: ChainHeatmapProps) {
  // Calculate intensity (0-1) for each chain based on trade count
  const dataWithIntensity = useMemo(() => {
    if (chainData.length === 0) return [];
    
    const maxTrades = Math.max(...chainData.map(c => c.trades));
    return chainData.map(c => ({
      ...c,
      intensity: maxTrades > 0 ? c.trades / maxTrades : 0,
    })).sort((a, b) => b.trades - a.trades);
  }, [chainData]);

  if (isLoading) {
    return (
      <Card className={cn("glass border-border/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Chain Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dataWithIntensity.length === 0) {
    return null;
  }

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Chain Activity
          <Badge variant="outline" className="text-[10px] py-0">
            <Activity className="w-2.5 h-2.5 mr-1" />
            Heatmap
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {dataWithIntensity.map((chain) => {
              // Map intensity to color opacity
              const opacity = 0.15 + (chain.intensity * 0.85);
              
              return (
                <Tooltip key={chain.chainIndex}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onChainClick?.(chain.chainIndex)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
                        "hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50",
                        onChainClick ? "cursor-pointer" : "cursor-default"
                      )}
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${opacity})`,
                        borderColor: `hsl(var(--primary) / ${Math.min(opacity + 0.2, 1)})`,
                      }}
                    >
                      <span className="text-xs font-medium truncate max-w-full">
                        {chain.chain}
                      </span>
                      <span className="text-lg font-bold font-mono">
                        {chain.trades}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        trades
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{chain.chain}</p>
                      <p>Trades: {chain.trades}</p>
                      <p>Volume: {formatVolume(chain.volume)}</p>
                      {chain.lastActive && (
                        <p className="text-muted-foreground">
                          Last: {chain.lastActive.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }} />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.6)' }} />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 1)' }} />
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default ChainHeatmap;
