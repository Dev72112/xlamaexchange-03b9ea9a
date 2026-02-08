import { memo, useState } from 'react';
import { Fuel, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMultiChainGas } from '@/hooks/useMultiChainGas';
import { getEvmChains } from '@/data/chains';
import { cn } from '@/lib/utils';

const ALL_EVM_CHAINS = getEvmChains();

interface GasEstimatorProps {
  standalone?: boolean;
}

export const GasEstimator = memo(function GasEstimator({ standalone = false }: GasEstimatorProps) {
  const { gasData, isLoading, refetch } = useMultiChainGas(ALL_EVM_CHAINS);
  const [isOpen, setIsOpen] = useState(false);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-destructive" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-primary" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const formatGwei = (gwei: number) => {
    if (gwei < 1) return gwei.toFixed(3);
    if (gwei < 10) return gwei.toFixed(2);
    return Math.round(gwei).toString();
  };

  const gasGrid = (
    <>
      <ScrollArea className="h-[400px] [&>[data-radix-scroll-area-viewport]]:!overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
          {gasData.map((chain) => (
            <div
              key={chain.chainIndex}
              className="flex flex-col gap-1.5 p-3 rounded-lg bg-secondary/30 border border-border/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{chain.chainName}</span>
                {getTrendIcon(chain.trend)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold font-mono">
                  {formatGwei(chain.gasPriceGwei)}
                </span>
                <span className="text-xs text-muted-foreground">Gwei</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {chain.tiers.map((tier) => (
                  <Badge
                    key={tier.label}
                    variant="outline"
                    className={cn(
                      "text-[11px] px-2 py-0.5",
                      tier.label === 'Fast' && "border-primary/30 text-primary",
                      tier.label === 'Slow' && "border-muted-foreground/30"
                    )}
                  >
                    {tier.label}: {formatGwei(tier.gwei)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {gasData.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center mt-3 pt-2 border-t border-border/30">
          Showing {gasData.length} EVM chains • Updated {gasData[0]?.lastUpdated?.toLocaleTimeString()} • Auto-refreshes every 15s
        </p>
      )}
    </>
  );

  if (standalone) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" />
            Gas Prices
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
        {gasGrid}
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Fuel className="w-4 h-4 text-primary" />
                Gas Tracker
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); refetch(); }}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {gasGrid}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
