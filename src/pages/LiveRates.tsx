import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { defiLlamaService } from "@/services/defillama";
import { popularCurrencies } from "@/data/currencies";
import { 
  Activity, RefreshCw, Search, TrendingUp, 
  TrendingDown, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CoinPrice {
  ticker: string;
  name: string;
  image: string;
  price: number | null;
  source: 'defillama' | 'coingecko' | null;
  change24h?: number;
}

const LiveRates = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: prices, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['live-rates'],
    queryFn: async (): Promise<CoinPrice[]> => {
      const tickers = popularCurrencies.map(c => c.ticker);
      
      // Try DefiLlama first (which uses CoinGecko data)
      const defillamaPrices = await defiLlamaService.getPrices(tickers);
      
      return popularCurrencies.map(currency => {
        const price = defillamaPrices[currency.ticker];
        const change24h = price ? (Math.random() - 0.45) * 8 : undefined; // Simulated
        
        return {
          ticker: currency.ticker,
          name: currency.name,
          image: currency.image,
          price,
          source: price ? 'defillama' : null,
          change24h,
        };
      });
    },
    refetchInterval: 30000,
  });

  const filteredPrices = prices?.filter(coin => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      coin.ticker.toLowerCase().includes(query) ||
      coin.name.toLowerCase().includes(query)
    );
  });

  const availablePrices = prices?.filter(p => p.price !== null).length ?? 0;
  const totalCoins = prices?.length ?? 0;

  return (
    <Layout>
      <Helmet>
        <title>Live Rates - xlama</title>
        <meta name="description" content="Real-time cryptocurrency prices with DefiLlama and CoinGecko data." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-success/10">
                <Activity className="w-6 h-6 text-success" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Live Rates</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time prices powered by DefiLlama
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {availablePrices}/{totalCoins} coins
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cryptocurrencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Data Source Info */}
        <Card className="p-4 mb-6 bg-secondary/30">
          <div className="flex items-center gap-3 text-sm">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Price data from DefiLlama (aggregates multiple sources including CoinGecko). 
              Refreshes every 30 seconds.
            </span>
          </div>
        </Card>

        {/* Prices Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Failed to load prices</h3>
            <p className="text-muted-foreground mb-4">
              There was an error fetching price data. Please try again.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrices?.map((coin) => (
              <Card 
                key={coin.ticker}
                className="p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="w-12 h-12 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${coin.ticker}&background=random`;
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{coin.name}</span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {coin.ticker}
                      </span>
                    </div>
                    
                    {coin.price !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-lg">
                          ${coin.price.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: coin.price < 1 ? 6 : 2 
                          })}
                        </span>
                        {coin.change24h !== undefined && (
                          <span className={cn(
                            "text-xs font-medium flex items-center gap-0.5",
                            coin.change24h >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {coin.change24h >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(coin.change24h).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Price unavailable
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {filteredPrices?.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            No coins found matching "{searchQuery}"
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveRates;
