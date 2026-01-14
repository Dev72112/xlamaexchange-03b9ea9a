import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Repeat, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTokenWatchlist, WatchlistToken } from '@/hooks/useTokenWatchlist';
import { SUPPORTED_CHAINS, getChainIcon, isNonEvmChain } from '@/data/chains';
import { WalletTokenBalance } from '@/services/okxdex';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TokenImage, ChainImage } from '@/components/ui/token-image';

interface PortfolioHoldingsTableProps {
  balances: WalletTokenBalance[];
  isLoading: boolean;
  className?: string;
}

type SortKey = 'value' | 'symbol' | 'balance' | 'price';
type SortDir = 'asc' | 'desc';

export function PortfolioHoldingsTable({ balances, isLoading, className }: PortfolioHoldingsTableProps) {
  const navigate = useNavigate();
  const { addToken, removeToken, isInWatchlist } = useTokenWatchlist();
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
      const aValue = parseFloat(a.tokenPrice || '0') * parseFloat(a.balance || '0');
      const bValue = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      const aPrice = parseFloat(a.tokenPrice || '0');
      const bPrice = parseFloat(b.tokenPrice || '0');
      const aBalance = parseFloat(a.balance || '0');
      const bBalance = parseFloat(b.balance || '0');

      let comparison = 0;
      switch (sortKey) {
        case 'value':
          comparison = aValue - bValue;
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'balance':
          comparison = aBalance - bBalance;
          break;
        case 'price':
          comparison = aPrice - bPrice;
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
  }, [balances, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleSwap = (balance: WalletTokenBalance) => {
    // Navigate to home with swap pre-filled via URL params
    navigate(`/?fromToken=${balance.tokenContractAddress}&chain=${balance.chainIndex}`);
    toast.success(`${balance.symbol} loaded in swap`);
  };

  const handleWatchlistToggle = (balance: WalletTokenBalance) => {
    const inWatchlist = isInWatchlist(balance.chainIndex, balance.tokenContractAddress);

    if (inWatchlist) {
      removeToken(balance.chainIndex, balance.tokenContractAddress);
      toast.success(`${balance.symbol} removed from watchlist`);
    } else {
      const watchlistToken: WatchlistToken = {
        chainIndex: balance.chainIndex,
        tokenContractAddress: balance.tokenContractAddress,
        tokenSymbol: balance.symbol,
        tokenName: balance.symbol,
        tokenLogoUrl: '',
        decimals: '18',
      };
      addToken(watchlistToken);
      toast.success(`${balance.symbol} added to watchlist`);
    }
  };

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    if (value < 0.01 && value > 0) return '< $0.01';
    return `$${value.toFixed(2)}`;
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num) || num === 0) return '—';
    if (num >= 1) return `$${num.toFixed(2)}`;
    if (num >= 0.001) return `$${num.toFixed(4)}`;
    return `$${num.toExponential(2)}`;
  };

  const formatBalance = (balance: string, symbol: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M ${symbol}`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K ${symbol}`;
    if (num >= 1) return `${num.toFixed(2)} ${symbol}`;
    return `${num.toFixed(6)} ${symbol}`;
  };

  const SortButton = ({ field, label }: { field: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === field ? (
        sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="py-8">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No holdings found</p>
          <p className="text-xs text-muted-foreground mt-1">Connect wallet to view assets</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card border-border sweep-effect shadow-premium-hover performance-critical overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Holdings</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {balances.length} assets
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {/* Mobile-friendly table scroll wrapper */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Sort Headers */}
          <div className="grid grid-cols-[minmax(100px,1fr),auto,auto,auto] gap-2 px-2 pb-2 border-b border-border mb-2 min-w-[320px]">
            <SortButton field="symbol" label="Token" />
            <SortButton field="balance" label="Balance" />
            <SortButton field="price" label="Price" />
            <SortButton field="value" label="Value" />
          </div>

        <ScrollArea className="h-[350px]">
          <div className="space-y-1">
            {sortedBalances.map((balance, idx) => {
              const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === balance.chainIndex);
              const value = parseFloat(balance.tokenPrice || '0') * parseFloat(balance.balance || '0');
              const tokenInWatchlist = isInWatchlist(balance.chainIndex, balance.tokenContractAddress);

              return (
                <div
                  key={`${balance.chainIndex}-${balance.tokenContractAddress}-${idx}`}
                  className="group grid grid-cols-[minmax(100px,1fr),auto,auto,auto] gap-2 items-center p-2 rounded-lg hover:bg-secondary/30 transition-colors min-w-[320px]"
                >
                  {/* Token Info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <TokenImage
                        src={undefined}
                        alt={balance.symbol}
                        fallbackText={balance.symbol}
                        className="w-8 h-8"
                      />
                      {chain && (
                        <ChainImage
                          src={getChainIcon(chain)}
                          alt={chain.name}
                          fallbackText={chain.shortName}
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border border-background"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{balance.symbol}</p>
                      {chain && (
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-[10px] px-1 rounded",
                            chain.isEvm ? "bg-primary/10 text-primary" : "bg-chart-2/20 text-chart-2"
                          )}>
                            {chain.isEvm ? 'EVM' : chain.shortName}
                          </span>
                          <p className="text-xs text-muted-foreground truncate">{chain.name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatBalance(balance.balance, balance.symbol)}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xs">{formatPrice(balance.tokenPrice || '0')}</p>
                  </div>

                  {/* Value + Actions */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium min-w-[60px] text-right">{formatUsd(value)}</p>
                    
                    {/* Quick Actions (visible on hover) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleSwap(balance)}
                            >
                              <Repeat className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Swap</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn("h-7 w-7", tokenInWatchlist && "text-yellow-500")}
                              onClick={() => handleWatchlistToggle(balance)}
                            >
                              <Star className={cn("w-3.5 h-3.5", tokenInWatchlist && "fill-current")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {tokenInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
