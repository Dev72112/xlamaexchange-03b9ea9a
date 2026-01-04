import { useState, useEffect, useCallback, useRef } from "react";
import { Flame, ArrowRight, Star, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { changeNowService } from "@/services/changenow";
import { defiLlamaService } from "@/services/defillama";
import { useFavoritePairs, FavoritePair } from "@/hooks/useFavoritePairs";
import { cn } from "@/lib/utils";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

interface TrendingPairsProps {
  onSelectPair?: (from: string, to: string) => void;
}

// Popular/trending pairs based on market data - curated for high volume
const trendingPairsData: FavoritePair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "sol", to: "usdterc20", fromName: "Solana", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "xrp", to: "usdterc20", fromName: "Ripple", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
];

interface TrendingRate {
  pair: FavoritePair;
  rate: number | null;
  loading: boolean;
  change24h?: number | null;
}

export function TrendingPairs({ onSelectPair }: TrendingPairsProps = {}) {
  const [rates, setRates] = useState<TrendingRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavoritePairs();
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchRates = useCallback(async () => {
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!mountedRef.current) return;
    
    setIsLoading(true);

    try {
      // Get unique tickers for price change data
      const uniqueTickers = [...new Set(trendingPairsData.flatMap(p => [p.from, p.to]))];
      
      // Fetch price changes from DeFiLlama (batched)
      const priceChanges = await defiLlamaService.getPricesWithChange(uniqueTickers);

      if (!mountedRef.current) return;

      const getRatePerOne = async (from: string, to: string): Promise<number> => {
        try {
          const estimate = await changeNowService.getExchangeAmount(from, to, 1, false);
          return estimate.estimatedAmount;
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes("deposit_too_small") || msg.includes("Out of min amount")) {
            const minData = await changeNowService.getMinAmount(from, to);
            const amountToUse = minData.minAmount;
            const estimate = await changeNowService.getExchangeAmount(from, to, amountToUse, false);
            return estimate.estimatedAmount / amountToUse;
          }
          throw err;
        }
      };

      const newRates = await Promise.all(
        trendingPairsData.map(async (pair) => {
          if (!mountedRef.current) return { pair, rate: null, loading: false, change24h: null };
          
          try {
            const rate = await getRatePerOne(pair.from, pair.to);
            const fromPriceData = priceChanges[pair.from];
            const change24h = fromPriceData?.change24h ?? null;
            return { pair, rate, loading: false, change24h };
          } catch (error) {
            console.error(`Failed to fetch rate for ${pair.from}/${pair.to}:`, error);
            return { pair, rate: null, loading: false, change24h: null };
          }
        })
      );

      if (mountedRef.current) {
        setRates(newRates);
        setIsLoading(false);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Failed to fetch trending pairs:', error);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchRates();
    
    // Reduced frequency: 2 minutes instead of 1
    intervalRef.current = setInterval(fetchRates, 120000);
    
    // Pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchRates();
        intervalRef.current = setInterval(fetchRates, 120000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRates]);

  const getDisplayTicker = (pair: FavoritePair, type: 'from' | 'to') => {
    if (type === 'from') return pair.displayFrom || pair.from;
    return pair.displayTo || pair.to;
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 shrink-0">
                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  </div>
                  <span className="truncate">Trending Pairs</span>
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Most popular exchanges right now
                </p>
              </div>
              <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20 shrink-0 text-xs">
                <Zap className="w-3 h-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex -space-x-2 shrink-0">
                        <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                        <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="w-16 sm:w-20 h-3 sm:h-4" />
                        <Skeleton className="w-12 sm:w-16 h-2 sm:h-3" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <Skeleton className="w-12 sm:w-16 h-4" />
                        <Skeleton className="w-8 h-3 ml-auto" />
                      </div>
                      <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                    </div>
                  </div>
                ))
              ) : (
                rates.map(({ pair, rate, change24h }, index) => (
                  <div
                    key={`${pair.from}-${pair.to}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPair?.(pair.from, pair.to)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectPair?.(pair.from, pair.to)}
                    className={cn(
                      "group relative flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all duration-200 overflow-hidden text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                      STAGGER_ITEM_CLASS
                    )}
                    style={getStaggerStyle(index)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="relative flex -space-x-2 shrink-0">
                        <img
                          src={pair.fromImage}
                          alt={pair.fromName}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.from}&background=random`;
                          }}
                        />
                        <img
                          src={pair.toImage}
                          alt={pair.toName}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.to}&background=random`;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 sm:gap-1.5 font-semibold text-xs sm:text-sm">
                          <span className="uppercase">{getDisplayTicker(pair, 'from')}</span>
                          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
                          <span className="uppercase">{getDisplayTicker(pair, 'to')}</span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {pair.fromName} → {pair.toName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        {rate !== null ? (
                          <>
                            <div className="font-mono text-xs sm:text-sm font-medium">
                              {rate.toFixed(rate > 1 ? 4 : 6)}
                            </div>
                            {change24h !== undefined && (
                              <div className={cn(
                                "text-[10px] sm:text-xs font-medium flex items-center justify-end gap-0.5",
                                change24h >= 0 ? "text-success" : "text-destructive"
                              )}>
                                <TrendingUp className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", change24h < 0 && "rotate-180")} />
                                {Math.abs(change24h).toFixed(2)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">N/A</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 sm:h-8 sm:w-8 shrink-0 transition-all",
                          isFavorite(pair.from, pair.to)
                            ? "text-warning hover:text-warning/80"
                            : "text-muted-foreground hover:text-warning opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(pair);
                        }}
                      >
                        <Star className={cn(
                          "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all",
                          isFavorite(pair.from, pair.to) && "fill-current"
                        )} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
