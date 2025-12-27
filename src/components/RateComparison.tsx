import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Loader2, TrendingUp, RefreshCw, Plus, X, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { changeNowService } from "@/services/changenow";
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

// Default pairs with correct tickers (usdterc20 for USDT)
const defaultPairs: ComparisonPair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
  { from: "eth", to: "bnbbsc", fromName: "Ethereum", toName: "BNB", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/bnbbsc_331e969a6b.svg", displayTo: "BNB" },
  { from: "xrp", to: "btc", fromName: "Ripple", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { from: "sol", to: "eth", fromName: "Solana", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "xrp", fromName: "Bitcoin", toName: "Ripple", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg" },
  { from: "trx", to: "usdttrc20", fromName: "TRON", toName: "USDT TRC20", fromImage: "https://content-api.changenow.io/uploads/trx_f14430166e.svg", toImage: "https://content-api.changenow.io/uploads/usdttrc20_87164a7b35.svg", displayTo: "USDT" },
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
  { from: "trx", to: "usdttrc20", fromName: "TRON", toName: "USDT TRC20", fromImage: "https://content-api.changenow.io/uploads/trx_f14430166e.svg", toImage: "https://content-api.changenow.io/uploads/usdttrc20_87164a7b35.svg", displayTo: "USDT" },
  { from: "ltc", to: "btc", fromName: "Litecoin", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/ltc_a391e86f20.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { from: "doge", to: "btc", fromName: "Dogecoin", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/doge_7ccb3df901.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { from: "bnbbsc", to: "eth", fromName: "BNB", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/bnbbsc_331e969a6b.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", displayFrom: "BNB" },
  { from: "sol", to: "usdcsol", fromName: "Solana", toName: "USDC", fromImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg", toImage: "https://content-api.changenow.io/uploads/usdcsol_9415198300.svg", displayTo: "USDC" },
  { from: "eth", to: "usdc", fromName: "Ethereum", toName: "USDC", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdcerc20_acd5759c8c.svg", displayTo: "USDC" },
  { from: "btc", to: "ada", fromName: "Bitcoin", toName: "Cardano", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/ada_bae7d8ea11.svg" },
  { from: "eth", to: "matic", fromName: "Ethereum", toName: "Polygon", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/matic_e57e574eca.svg", displayTo: "MATIC" },
];

interface RateData {
  pair: ComparisonPair;
  rate: number | null;
  loading: boolean;
  error: boolean;
}

const STORAGE_KEY = 'xlama_tracked_pairs';

function getPairKey(pair: ComparisonPair): string {
  return `${pair.from}-${pair.to}`;
}

export function RateComparison() {
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
        return estimate.estimatedAmount; // already per 1
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
          const ratePerOne = await getRatePerOne(pair.from, pair.to);
          return { pair, rate: ratePerOne, loading: false, error: false };
        } catch (error) {
          console.error(`Failed to fetch rate for ${pair.from}/${pair.to}:`, error);
          return { pair, rate: null, loading: false, error: true };
        }
      })
    );

    setRates(newRates);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [trackedPairs]);

  useEffect(() => {
    // Initialize rates with loading state
    setRates(trackedPairs.map(pair => ({ pair, rate: null, loading: true, error: false })));
    fetchRates();
    
    // Refresh rates every 60 seconds
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, [trackedPairs, fetchRates]);

  const addPair = (pair: ComparisonPair) => {
    const key = getPairKey(pair);
    if (!trackedPairs.find(p => getPairKey(p) === key)) {
      setTrackedPairs(prev => [...prev, pair]);
    }
    setDialogOpen(false);
  };

  const removePair = (pair: ComparisonPair) => {
    setTrackedPairs(prev => prev.filter(p => getPairKey(p) !== getPairKey(pair)));
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
    <section className="py-16 sm:py-24">
      <div className="container px-4 sm:px-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Live Exchange Rates
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track your favorite trading pairs in real-time
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Pair</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
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
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isTracked 
                              ? 'bg-secondary/50 border-border opacity-50 cursor-not-allowed' 
                              : 'bg-secondary/30 border-border hover:border-primary/50 hover:bg-secondary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
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
                            <div className="text-left">
                              <div className="flex items-center gap-1 font-medium text-sm">
                                <span className="uppercase">{getDisplayTicker(pair, 'from')}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="uppercase">{getDisplayTicker(pair, 'to')}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pair.fromName} → {pair.toName}
                              </div>
                            </div>
                          </div>
                          {isTracked ? (
                            <span className="text-xs text-muted-foreground">Added</span>
                          ) : (
                            <Plus className="w-4 h-4 text-muted-foreground" />
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
                className="gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rates.map(({ pair, rate, loading, error }) => (
                <div
                  key={getPairKey(pair)}
                  className="group flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <img
                        src={pair.fromImage}
                        alt={pair.fromName}
                        className="w-8 h-8 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.from}&background=random`;
                        }}
                      />
                      <img
                        src={pair.toImage}
                        alt={pair.toName}
                        className="w-8 h-8 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.to}&background=random`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 font-medium text-sm">
                        <span className="uppercase">{getDisplayTicker(pair, 'from')}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="uppercase">{getDisplayTicker(pair, 'to')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pair.fromName} → {pair.toName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : error ? (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      ) : (
                        <div className="font-mono text-sm font-medium">
                          {rate?.toFixed(rate > 1 ? 4 : 8)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removePair(pair)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                      title="Remove pair"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {trackedPairs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No pairs tracked yet</p>
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
