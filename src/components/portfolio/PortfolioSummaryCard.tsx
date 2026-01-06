import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Coins, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletTokenBalance } from '@/services/okxdex';
import { cn } from '@/lib/utils';

interface PortfolioSummaryCardProps {
  totalValue: number;
  previousValue?: number;
  balances: WalletTokenBalance[];
  isLoading: boolean;
  className?: string;
}

// Common stablecoins
const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'USDD', 'GUSD', 'PYUSD'];

export function PortfolioSummaryCard({
  totalValue,
  previousValue,
  balances,
  isLoading,
  className
}: PortfolioSummaryCardProps) {
  // Calculate stablecoin vs other split
  const { stablecoinValue, otherValue, stablecoinPercentage } = useMemo(() => {
    let stableTotal = 0;
    let otherTotal = 0;

    balances.forEach(b => {
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      if (STABLECOINS.includes(b.symbol.toUpperCase())) {
        stableTotal += value;
      } else {
        otherTotal += value;
      }
    });

    return {
      stablecoinValue: stableTotal,
      otherValue: otherTotal,
      stablecoinPercentage: totalValue > 0 ? (stableTotal / totalValue) * 100 : 0,
    };
  }, [balances, totalValue]);

  // Calculate 24h change (if we have previous value)
  const change = useMemo(() => {
    if (!previousValue || previousValue === 0) return null;
    const absoluteChange = totalValue - previousValue;
    const percentChange = ((totalValue - previousValue) / previousValue) * 100;
    return { absoluteChange, percentChange };
  }, [totalValue, previousValue]);

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-card to-secondary/20 border-border", className)}>
      <CardContent className="py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Total Value */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" />
              Total Value
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalValue)}</p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                change.absoluteChange >= 0 ? "text-success" : "text-destructive"
              )}>
                {change.absoluteChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {change.absoluteChange >= 0 ? '+' : ''}
                  {formatUsd(change.absoluteChange)} ({change.percentChange.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Assets Count */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5" />
              Assets
            </div>
            <p className="text-2xl font-bold">{balances.length}</p>
            <p className="text-xs text-muted-foreground">
              tokens tracked
            </p>
          </div>

          {/* Stablecoin Split */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Stablecoins
            </div>
            <p className="text-2xl font-bold">{formatUsd(stablecoinValue)}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {stablecoinPercentage.toFixed(0)}%
              </Badge>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stablecoinPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Volatile Assets */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Volatile
            </div>
            <p className="text-2xl font-bold">{formatUsd(otherValue)}</p>
            <Badge variant="secondary" className="text-[10px]">
              {(100 - stablecoinPercentage).toFixed(0)}% risk exposure
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
