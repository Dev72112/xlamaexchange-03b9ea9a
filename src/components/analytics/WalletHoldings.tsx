import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Wallet, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletHolding } from '@/hooks/useTradeVsHodl';
import { SUPPORTED_CHAINS } from '@/data/chains';

// Get chain icon by chainIndex string
const getChainIconByIndex = (chainIndex: string): string | undefined => {
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  return chain?.icon;
};

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(3)}`;
  if (value >= 0.0001) return `$${value.toFixed(4)}`;
  if (value === 0) return '$0.00';
  return `$${value.toExponential(2)}`;
};

const formatBalance = (balance: number) => {
  if (balance >= 1000000) return `${(balance / 1000000).toFixed(2)}M`;
  if (balance >= 1000) return `${(balance / 1000).toFixed(2)}K`;
  if (balance >= 1) return balance.toFixed(4);
  if (balance >= 0.0001) return balance.toFixed(6);
  return balance.toExponential(2);
};

interface WalletHoldingsProps {
  holdings: WalletHolding[];
  isLoading: boolean;
  totalValue: number;
}

export const WalletHoldings = memo(function WalletHoldings({ 
  holdings, 
  isLoading,
  totalValue 
}: WalletHoldingsProps) {
  // Calculate chain distribution
  const chainBreakdown = holdings.reduce((acc, h) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === h.chainIndex);
    const chainName = chain?.name || 'Unknown';
    const existing = acc.find(c => c.chainIndex === h.chainIndex);
    if (existing) {
      existing.valueUsd += h.valueUsd;
      existing.count += 1;
    } else {
      acc.push({
        chainIndex: h.chainIndex,
        chainName,
        valueUsd: h.valueUsd,
        count: 1,
      });
    }
    return acc;
  }, [] as Array<{ chainIndex: string; chainName: string; valueUsd: number; count: number }>)
    .sort((a, b) => b.valueUsd - a.valueUsd);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Wallet Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Wallet Holdings
          </CardTitle>
          <CardDescription>Your current token balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Coins className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No holdings found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Connect your wallet to see your token balances
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Wallet Holdings
            </CardTitle>
            <CardDescription>Your current token balances</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold font-mono">{formatUsd(totalValue)}</p>
            <p className="text-xs text-muted-foreground">{holdings.length} tokens</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chain Distribution */}
        {chainBreakdown.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {chainBreakdown.slice(0, 5).map(chain => {
              const icon = getChainIconByIndex(chain.chainIndex);
              const percentage = totalValue > 0 ? (chain.valueUsd / totalValue) * 100 : 0;
              return (
                <Badge 
                  key={chain.chainIndex} 
                  variant="secondary" 
                  className="text-xs gap-1.5 py-1"
                >
                  {icon && <img src={icon} alt="" className="w-3 h-3 rounded-full" />}
                  {chain.chainName}: {percentage.toFixed(0)}%
                </Badge>
              );
            })}
          </div>
        )}

        {/* Token List */}
        <ScrollArea className="h-[280px] pr-2">
          <div className="space-y-2">
            {holdings.slice(0, 20).map((holding, index) => {
              const percentage = totalValue > 0 ? (holding.valueUsd / totalValue) * 100 : 0;
              const chainIcon = getChainIconByIndex(holding.chainIndex);
              
              return (
                <div 
                  key={`${holding.chainIndex}-${holding.tokenAddress}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {holding.symbol.slice(0, 2)}
                        </span>
                      </div>
                      {chainIcon && (
                        <img 
                          src={chainIcon} 
                          alt="" 
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-background"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{holding.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBalance(holding.balance)} @ {formatUsd(holding.price)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium font-mono">{formatUsd(holding.valueUsd)}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {holdings.length > 20 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing top 20 of {holdings.length} tokens
          </p>
        )}
      </CardContent>
    </Card>
  );
});
