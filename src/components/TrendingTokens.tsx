import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp, TrendingDown, Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chain, getEvmChains, getPrimaryChain, getChainIcon } from "@/data/chains";
import { okxDexService, TrendingTokenData } from "@/services/okxdex";
import { cn } from "@/lib/utils";

interface TrendingTokensProps {
  onSelectToken?: (symbol: string, address?: string, chainIndex?: string) => void;
}

type SortBy = '2' | '5' | '6'; // 2=price change, 5=volume, 6=market cap
type TimeFrame = '1' | '2' | '3' | '4'; // 1=5m, 2=1h, 3=4h, 4=24h

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: '2', label: 'Price Change' },
  { value: '5', label: 'Volume' },
  { value: '6', label: 'Market Cap' },
];

const TIME_OPTIONS: { value: TimeFrame; label: string }[] = [
  { value: '1', label: '5m' },
  { value: '2', label: '1h' },
  { value: '3', label: '4h' },
  { value: '4', label: '24h' },
];

export function TrendingTokens({ onSelectToken }: TrendingTokensProps) {
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());
  const [tokens, setTokens] = useState<TrendingTokenData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('2');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('4');
  
  const evmChains = getEvmChains().slice(0, 6); // Show top 6 chains

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const data = await okxDexService.getTokenRanking(
        selectedChain.chainIndex,
        sortBy,
        timeFrame
      );
      
      // Take top 8 tokens
      setTokens(data.slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch trending tokens:', err);
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChain.chainIndex, sortBy, timeFrame]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0.00';
    if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (num >= 1) return `$${num.toFixed(2)}`;
    if (num >= 0.0001) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(6)}`;
  };

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (isNaN(num)) return '$0';
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatChange = (change: string) => {
    const num = parseFloat(change);
    if (isNaN(num)) return '0.00';
    return Math.abs(num).toFixed(2);
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 shrink-0">
                      <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <span className="truncate">Trending Tokens</span>
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Top movers on {selectedChain.name}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20 shrink-0 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live
                </Badge>
              </div>

              {/* Chain Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {evmChains.map((chain) => (
                  <Button
                    key={chain.chainIndex}
                    variant={selectedChain.chainIndex === chain.chainIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChain(chain)}
                    className="shrink-0 gap-2"
                  >
                    <img 
                      src={getChainIcon(chain)} 
                      alt={chain.name}
                      className="w-4 h-4 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=random&size=32`;
                      }}
                    />
                    <span className="hidden sm:inline">{chain.shortName}</span>
                  </Button>
                ))}
              </div>

              {/* Sort & Time Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex gap-0.5 sm:gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto">
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={sortBy === option.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy(option.value)}
                      className="h-9 sm:h-7 text-xs px-2 sm:px-3 min-w-[44px] shrink-0"
                    >
                      <span className="hidden sm:inline">{option.label}</span>
                      <span className="sm:hidden">{option.label.split(' ')[0]}</span>
                    </Button>
                  ))}
                </div>
                <div className="flex gap-0.5 sm:gap-1 bg-secondary/50 rounded-lg p-1">
                  {TIME_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={timeFrame === option.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTimeFrame(option.value)}
                      className="h-9 sm:h-7 text-xs px-3 sm:px-2 min-w-[44px]"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-2">
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="w-16 h-4" />
                        <Skeleton className="w-20 h-3" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="w-16 h-4 ml-auto" />
                      <Skeleton className="w-12 h-3 ml-auto" />
                    </div>
                  </div>
                ))
              ) : tokens.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No trending tokens found</p>
                </div>
              ) : (
                tokens.map((token, index) => {
                  const change = parseFloat(token.change);
                  const isPositive = change >= 0;
                  
                  return (
                    <button
                      key={`${token.tokenContractAddress}-${index}`}
                      onClick={() => onSelectToken?.(token.tokenSymbol, token.tokenContractAddress, token.chainIndex)}
                      className="group relative flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all duration-200 text-left w-full cursor-pointer sweep-effect"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img
                            src={token.tokenLogoUrl}
                            alt={token.tokenSymbol}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
                            }}
                          />
                          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm uppercase">{token.tokenSymbol}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            Vol: {formatVolume(token.volume)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-medium">{formatPrice(token.price)}</div>
                        <div className={cn(
                          "text-xs font-medium flex items-center justify-end gap-0.5",
                          isPositive ? "text-success" : "text-destructive"
                        )}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {formatChange(token.change)}%
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
