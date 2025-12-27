import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Loader2, TrendingUp, RefreshCw, Plus, X, Star, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { changeNowService } from "@/services/changenow";
import { useFavoritePairs, FavoritePair } from "@/hooks/useFavoritePairs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ComparisonPair {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromImage: string;
  toImage: string;
  displayFrom?: string;
  displayTo?: string;
}

// Default pairs with correct tickers
const defaultPairs: ComparisonPair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
];

// Available pairs for users to add
const availablePairs: ComparisonPair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
  { from: "eth", to: "bnbbsc", fromName: "Ethereum", toName: "BNB", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/bnbbsc_331e969a6b.svg", displayTo: "BNB" },
  { from: "xrp", to: "btc", fromName: "Ripple", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { from: "sol", to: "eth", fromName: "Solana", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "xrp", fromName: "Bitcoin", toName: "Ripple", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg" },
  { from: "doge", to: "btc", fromName: "Dogecoin", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/doge_7ccb3df901.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
];

// Mock exchange providers for rate comparison
const providers = [
  { id: "changenow", name: "ChangeNow", color: "text-success" },
  { id: "simpleswap", name: "SimpleSwap", variance: 0.02 },
  { id: "changelly", name: "Changelly", variance: -0.01 },
];

interface RateData {
  pair: ComparisonPair;
  rates: { provider: string; rate: number | null; isBest?: boolean }[];
  loading: boolean;
  error: boolean;
}

const STORAGE_KEY = 'xlama_tracked_pairs';

function getPairKey(pair: ComparisonPair): string {
  return `${pair.from}-${pair.to}`;
}

export function RateComparison() {
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavoritePairs();
  const [trackedPairs, setTrackedPairs] = useState<ComparisonPair[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load tracked pairs:', e);
    }
    return defaultPairs;
  });

  const [rates, setRates] = useState<RateData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Save tracked pairs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedPairs));
    } catch (e) {
      console.error('Failed to save tracked pairs:', e);
    }
  }, [trackedPairs]);

  const fetchRates = useCallback(async () => {
    setIsRefreshing(true);

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
      trackedPairs.map(async (pair) => {
        try {
          const baseRate = await getRatePerOne(pair.from, pair.to);
          
          // Generate comparison rates with slight variance for demo
          const allRates = providers.map((provider) => {
            if (provider.id === "changenow") {
              return { provider: provider.name, rate: baseRate, isBest: false };
            }
            // Simulate other providers with variance
            const variance = provider.variance || (Math.random() - 0.5) * 0.04;
            return { provider: provider.name, rate: baseRate * (1 + variance), isBest: false };
          });
          
          // Mark best rate
          const bestRate = Math.max(...allRates.filter(r => r.rate !== null).map(r => r.rate as number));
          allRates.forEach(r => {
            if (r.rate === bestRate) r.isBest = true;
          });
          
          return { pair, rates: allRates, loading: false, error: false };
        } catch (error) {
          console.error(`Failed to fetch rate for ${pair.from}/${pair.to}:`, error);
          return { 
            pair, 
            rates: providers.map(p => ({ provider: p.name, rate: null, isBest: false })), 
            loading: false, 
            error: true 
          };
        }
      })
    );

    setRates(newRates);
    setLastUpdated(new Date());
    setIsRefreshing(false);
    
    toast({
      title: "Rates Updated",
      description: "All exchange rates have been refreshed",
    });
  }, [trackedPairs, toast]);

  useEffect(() => {
    // Initialize rates with loading state
    setRates(trackedPairs.map(pair => ({ 
      pair, 
      rates: providers.map(p => ({ provider: p.name, rate: null, isBest: false })), 
      loading: true, 
      error: false 
    })));
    fetchRates();
    
    // Refresh rates every 60 seconds
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, [trackedPairs, fetchRates]);

  const addPair = (pair: ComparisonPair) => {
    const key = getPairKey(pair);
    if (!trackedPairs.find(p => getPairKey(p) === key)) {
      setTrackedPairs(prev => [...prev, pair]);
      toast({
        title: "Pair Added",
        description: `${pair.fromName} → ${pair.toName} is now being tracked`,
      });
    }
    setDialogOpen(false);
  };

  const removePair = (pair: ComparisonPair) => {
    setTrackedPairs(prev => prev.filter(p => getPairKey(p) !== getPairKey(pair)));
    toast({
      title: "Pair Removed",
      description: `${pair.fromName} → ${pair.toName} removed from tracking`,
    });
  };

  const isPairTracked = (pair: ComparisonPair) => {
    return trackedPairs.some(p => getPairKey(p) === getPairKey(pair));
  };

  const getDisplayTicker = (pair: ComparisonPair, type: 'from' | 'to') => {
    if (type === 'from') {
      return pair.displayFrom || pair.from;
    }
    return pair.displayTo || pair.to;
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 shrink-0">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <span className="truncate">Rate Comparison</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Compare rates across exchanges
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-warning" />
                      Add Trading Pair
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {availablePairs.map((pair) => {
                      const isTracked = isPairTracked(pair);
                      return (
                        <button
                          key={getPairKey(pair)}
                          onClick={() => !isTracked && addPair(pair)}
                          disabled={isTracked}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isTracked 
                              ? 'bg-secondary/50 border-border opacity-50 cursor-not-allowed' 
                              : 'bg-secondary/30 border-border hover:border-primary/50 hover:bg-secondary/50'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex -space-x-2 shrink-0">
                              <img
                                src={pair.fromImage}
                                alt={pair.fromName}
                                className="w-7 h-7 rounded-full border-2 border-background"
                              />
                              <img
                                src={pair.toImage}
                                alt={pair.toName}
                                className="w-7 h-7 rounded-full border-2 border-background"
                              />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1 font-medium text-sm">
                                <span className="uppercase">{getDisplayTicker(pair, 'from')}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="uppercase">{getDisplayTicker(pair, 'to')}</span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {pair.fromName} → {pair.toName}
                              </div>
                            </div>
                          </div>
                          {isTracked ? (
                            <span className="text-xs text-muted-foreground shrink-0">Added</span>
                          ) : (
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRates}
                disabled={isRefreshing}
                className="gap-1.5 text-xs sm:text-sm"
              >
                <RefreshCw className={cn("w-3 h-3 sm:w-4 sm:h-4", isRefreshing && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-4 min-w-0">
              {rates.map(({ pair, rates: pairRates, loading, error }) => (
                <div
                  key={getPairKey(pair)}
                  className="group p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        <img
                          src={pair.fromImage}
                          alt={pair.fromName}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.from}&background=random`;
                          }}
                        />
                        <img
                          src={pair.toImage}
                          alt={pair.toName}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.to}&background=random`;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 font-medium text-xs sm:text-sm">
                          <span className="uppercase">{getDisplayTicker(pair, 'from')}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="uppercase">{getDisplayTicker(pair, 'to')}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {pair.fromName} → {pair.toName}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removePair(pair)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all shrink-0"
                      title="Remove pair"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  
                  {/* Rate comparison grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {pairRates.map(({ provider, rate, isBest }) => (
                      <div 
                        key={provider}
                        className={cn(
                          "p-2 sm:p-3 rounded-lg text-center transition-all",
                          isBest 
                            ? "bg-success/10 border border-success/30" 
                            : "bg-muted/30 border border-transparent"
                        )}
                      >
                        <div className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">{provider}</div>
                        {loading ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-muted-foreground mx-auto" />
                        ) : error || rate === null ? (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "font-mono text-xs sm:text-sm font-medium truncate max-w-full",
                              isBest && "text-success"
                            )}>
                              {rate.toFixed(rate > 1 ? 4 : 6)}
                            </span>
                            {isBest && (
                              <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 bg-success/20 text-success border-0">
                                Best
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {trackedPairs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4 text-sm">No pairs tracked yet</p>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first pair
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}