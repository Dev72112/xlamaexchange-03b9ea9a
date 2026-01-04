import { useEffect, useState } from 'react';
import { Scale, RefreshCw, ArrowRight, Percent, Zap, RotateCcw, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortfolioRebalance, TokenAllocation, RebalanceTrade } from '@/hooks/usePortfolioRebalance';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PortfolioRebalancerProps {
  className?: string;
}

export function PortfolioRebalancer({ className }: PortfolioRebalancerProps) {
  const {
    isConnected,
    isLoading,
    balances,
    targetAllocations,
    rebalanceResult,
    fetchCurrentPortfolio,
    setTargetAllocation,
    calculateRebalance,
    applyEqualWeight,
    applyMarketCapWeight,
    resetTargets,
  } = usePortfolioRebalance();

  const [showTrades, setShowTrades] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchCurrentPortfolio();
    }
  }, [isConnected, fetchCurrentPortfolio]);

  const handleCalculate = () => {
    setIsCalculating(true);
    const result = calculateRebalance();
    setIsCalculating(false);
    if (result) {
      setShowTrades(true);
      toast.success('Rebalance plan calculated');
    }
  };

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getChainIcon = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain?.icon;
  };

  const totalTargetPercentage = Object.values(targetAllocations).reduce((sum, p) => sum + p, 0);
  const isValidAllocation = Math.abs(totalTargetPercentage - 100) < 0.1 || Object.keys(targetAllocations).length === 0;

  if (!isConnected) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="py-8 text-center">
          <Scale className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Connect wallet to rebalance portfolio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Portfolio Rebalancer
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchCurrentPortfolio}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={applyEqualWeight}
            disabled={balances.length === 0}
            className="flex-1 text-xs"
          >
            <Percent className="w-3.5 h-3.5 mr-1.5" />
            Equal Weight
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={applyMarketCapWeight}
            disabled={balances.length === 0}
            className="flex-1 text-xs"
          >
            <Scale className="w-3.5 h-3.5 mr-1.5" />
            Keep Current
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetTargets}
            disabled={Object.keys(targetAllocations).length === 0}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Allocation Sliders */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No assets found in portfolio</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-3">
              {balances.slice(0, 10).map((balance) => {
                const tokenKey = `${balance.chainIndex}-${balance.tokenContractAddress}`;
                const currentValue = parseFloat(balance.tokenPrice || '0') * parseFloat(balance.balance || '0');
                const totalValue = balances.reduce((sum, b) => 
                  sum + parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0'), 0
                );
                const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
                const targetPercentage = targetAllocations[tokenKey] ?? currentPercentage;
                const difference = targetPercentage - currentPercentage;

                return (
                  <div key={tokenKey} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={getChainIcon(balance.chainIndex)} 
                          alt="" 
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="font-medium text-sm">{balance.symbol}</span>
                        <span className="text-xs text-muted-foreground">{formatUsd(currentValue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {currentPercentage.toFixed(1)}%
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className={cn(
                          "text-xs font-medium",
                          Math.abs(difference) > 0.5 && (difference > 0 ? "text-primary" : "text-destructive")
                        )}>
                          {targetPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[targetPercentage]}
                      onValueChange={([value]) => setTargetAllocation(tokenKey, value)}
                      max={100}
                      step={0.5}
                      className="py-1"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Total Allocation Indicator */}
        {Object.keys(targetAllocations).length > 0 && (
          <div className={cn(
            "flex items-center justify-between p-2 rounded-lg text-sm",
            isValidAllocation ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            <span>Total Allocation</span>
            <span className="font-medium">{totalTargetPercentage.toFixed(1)}%</span>
          </div>
        )}

        {/* Calculate Button */}
        <Button 
          onClick={handleCalculate}
          disabled={!isValidAllocation || balances.length === 0 || isCalculating}
          className="w-full"
        >
          {isCalculating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Calculate Rebalance
        </Button>

        {/* Rebalance Trades */}
        {rebalanceResult && rebalanceResult.trades.length > 0 && (
          <Collapsible open={showTrades} onOpenChange={setShowTrades}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                <span className="text-xs flex items-center gap-2">
                  Suggested Trades
                  <Badge variant="secondary" className="text-[10px]">
                    {rebalanceResult.trades.length}
                  </Badge>
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showTrades && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {rebalanceResult.trades.map((trade, i) => (
                  <TradeCard key={i} trade={trade} getChainIcon={getChainIcon} formatUsd={formatUsd} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Execute trades manually in the exchange widget
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {rebalanceResult && rebalanceResult.trades.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Portfolio is already balanced ✓
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TradeCard({ 
  trade, 
  getChainIcon, 
  formatUsd 
}: { 
  trade: RebalanceTrade;
  getChainIcon: (chainIndex: string) => string | undefined;
  formatUsd: (value: number) => string;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <img src={getChainIcon(trade.fromToken.chainIndex)} alt="" className="w-3.5 h-3.5 rounded-full" />
          <span className="text-xs font-medium">{trade.fromToken.symbol}</span>
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <div className="flex items-center gap-1">
          <img src={getChainIcon(trade.toToken.chainIndex)} alt="" className="w-3.5 h-3.5 rounded-full" />
          <span className="text-xs font-medium">{trade.toToken.symbol}</span>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {formatUsd(trade.amountUsd)}
      </Badge>
    </div>
  );
}
