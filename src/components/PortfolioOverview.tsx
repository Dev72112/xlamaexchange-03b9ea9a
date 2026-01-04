import { useState, useEffect, useMemo } from 'react';
import { Wallet, RefreshCw, ChevronDown, ChevronUp, TrendingUp, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { SUPPORTED_CHAINS, Chain } from '@/data/chains';
import { cn } from '@/lib/utils';

interface PortfolioOverviewProps {
  className?: string;
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  const { isConnected, activeAddress } = useMultiWallet();
  const [totalValue, setTotalValue] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Get chain indices for fetching
  const chainIndices = useMemo(() => 
    SUPPORTED_CHAINS.slice(0, 10).map(c => c.chainIndex).join(','), 
    []
  );

  const fetchPortfolio = async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    try {
      // Fetch portfolio value and balances in parallel
      const [valueResult, balancesResult] = await Promise.all([
        okxDexService.getPortfolioValue(activeAddress, chainIndices),
        okxDexService.getWalletBalances(activeAddress, chainIndices),
      ]);

      if (valueResult?.totalValue) {
        setTotalValue(valueResult.totalValue);
      }
      
      // Sort by USD value
      const sortedBalances = balancesResult.sort((a, b) => 
        parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0') - 
        parseFloat(a.tokenPrice || '0') * parseFloat(a.balance || '0')
      );
      setBalances(sortedBalances.slice(0, 5)); // Top 5
      setLastFetched(new Date());
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchPortfolio();
    } else {
      setTotalValue(null);
      setBalances([]);
    }
  }, [isConnected, activeAddress]);

  // Group balances by chain
  const chainBalances = useMemo(() => {
    const grouped: Record<string, { chain: Chain; total: number }> = {};
    
    balances.forEach(b => {
      const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === b.chainIndex);
      if (!chain) return;
      
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      if (!grouped[b.chainIndex]) {
        grouped[b.chainIndex] = { chain, total: 0 };
      }
      grouped[b.chainIndex].total += value;
    });

    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [balances]);

  const formatUsd = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return '$0.00';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (!isConnected) return null;

  return (
    <section className={cn("py-6", className)}>
      <div className="container px-4 sm:px-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="bg-card border-border overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full text-left">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Portfolio Value</p>
                        {isLoading ? (
                          <Skeleton className="h-7 w-28 mt-0.5" />
                        ) : (
                          <p className="text-xl sm:text-2xl font-bold">
                            {totalValue ? formatUsd(totalValue) : '$0.00'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchPortfolio();
                        }}
                        disabled={isLoading}
                        className="h-8 w-8"
                      >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                      </Button>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-border p-4 sm:p-5">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : chainBalances.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers className="w-4 h-4" />
                      <span>By Chain</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {chainBalances.map(({ chain, total }) => {
                        const totalNum = parseFloat(totalValue || '1');
                        const percentage = totalNum > 0 ? (total / totalNum) * 100 : 0;
                        
                        return (
                          <div
                            key={chain.chainIndex}
                            className="p-3 rounded-lg bg-secondary/30 border border-border/50"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <img
                                src={chain.icon}
                                alt={chain.name}
                                className="w-5 h-5 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=6366f1&color=fff`;
                                }}
                              />
                              <span className="text-sm font-medium truncate">{chain.shortName}</span>
                            </div>
                            <p className="text-sm font-bold">{formatUsd(total)}</p>
                            <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all" 
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}%</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Top Holdings */}
                    {balances.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <TrendingUp className="w-4 h-4" />
                          <span>Top Holdings</span>
                        </div>
                        <div className="space-y-2">
                          {balances.slice(0, 3).map((b, i) => {
                            const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === b.chainIndex);
                            const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
                            
                            return (
                              <div key={`${b.chainIndex}-${b.tokenContractAddress}-${i}`} className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{b.symbol}</span>
                                  {chain && (
                                    <img
                                      src={chain.icon}
                                      alt={chain.name}
                                      className="w-3.5 h-3.5 rounded-full opacity-60"
                                    />
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatUsd(value)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {parseFloat(b.balance).toFixed(4)} {b.symbol}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>No assets found</p>
                    <p className="text-xs mt-1">Connect wallet to view portfolio</p>
                  </div>
                )}

                {lastFetched && (
                  <p className="text-xs text-muted-foreground/60 text-center mt-4">
                    Updated {lastFetched.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </section>
  );
}