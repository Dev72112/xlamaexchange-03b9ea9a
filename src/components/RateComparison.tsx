import { useState, useEffect } from "react";
import { ArrowRight, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { changeNowService } from "@/services/changenow";

interface ComparisonPair {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromImage: string;
  toImage: string;
}

const popularPairs: ComparisonPair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "btc", to: "usdt", fromName: "Bitcoin", toName: "Tether", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg" },
  { from: "eth", to: "usdt", fromName: "Ethereum", toName: "Tether", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
  { from: "eth", to: "bnbbsc", fromName: "Ethereum", toName: "BNB", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/bnbbsc_331e969a6b.svg" },
  { from: "xrp", to: "btc", fromName: "Ripple", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
];

interface RateData {
  pair: ComparisonPair;
  rate: number | null;
  loading: boolean;
  error: boolean;
}

export function RateComparison() {
  const [rates, setRates] = useState<RateData[]>(
    popularPairs.map(pair => ({ pair, rate: null, loading: true, error: false }))
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRates = async () => {
    setIsRefreshing(true);
    
    const newRates = await Promise.all(
      popularPairs.map(async (pair) => {
        try {
          const estimate = await changeNowService.getExchangeAmount(
            pair.from,
            pair.to,
            1,
            false
          );
          return { pair, rate: estimate.estimatedAmount, loading: false, error: false };
        } catch (error) {
          console.error(`Failed to fetch rate for ${pair.from}/${pair.to}:`, error);
          return { pair, rate: null, loading: false, error: true };
        }
      })
    );

    setRates(newRates);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchRates();
    
    // Refresh rates every 60 seconds
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

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
                Compare popular trading pairs in real-time
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRates}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rates.map(({ pair, rate, loading, error }) => (
                <div
                  key={`${pair.from}-${pair.to}`}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:border-border/80 transition-colors"
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
                        <span className="uppercase">{pair.from}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="uppercase">{pair.to}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pair.fromName} → {pair.toName}
                      </div>
                    </div>
                  </div>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
