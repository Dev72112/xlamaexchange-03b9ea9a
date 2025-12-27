import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { changeNowService } from "@/services/changenow";
import { useFavoritePairs, FavoritePair } from "@/hooks/useFavoritePairs";
import { 
  Flame, Star, ArrowRight, RefreshCw, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Extended trending pairs list
const allTrendingPairs: FavoritePair[] = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "sol", to: "usdterc20", fromName: "Solana", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "xrp", to: "usdterc20", fromName: "Ripple", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/xrp_3b5212fd4a.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
  { from: "eth", to: "sol", fromName: "Ethereum", toName: "Solana", fromImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg", toImage: "https://content-api.changenow.io/uploads/sol_3b3f795997.svg" },
  { from: "doge", to: "usdterc20", fromName: "Dogecoin", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/doge_eeee631e93.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "ltc", to: "btc", fromName: "Litecoin", toName: "Bitcoin", fromImage: "https://content-api.changenow.io/uploads/ltc_fd54809c8a.svg", toImage: "https://content-api.changenow.io/uploads/btc_1_527dc9ec3c.svg" },
  { from: "ada", to: "usdterc20", fromName: "Cardano", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/ada_a0faf55f29.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
  { from: "matic", to: "eth", fromName: "Polygon", toName: "Ethereum", fromImage: "https://content-api.changenow.io/uploads/matic_e08491ce80.svg", toImage: "https://content-api.changenow.io/uploads/eth_f4ebb54ec0.svg" },
  { from: "dot", to: "usdterc20", fromName: "Polkadot", toName: "USDT", fromImage: "https://content-api.changenow.io/uploads/dot_ab59cff2e4.svg", toImage: "https://content-api.changenow.io/uploads/usdterc20_5ae21618aa.svg", displayTo: "USDT" },
];

const Trending = () => {
  const { isFavorite, toggleFavorite } = useFavoritePairs();
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: rates, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trending-rates-full'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        allTrendingPairs.map(async (pair) => {
          const rate = await getRatePerOne(pair.from, pair.to);
          return { key: `${pair.from}-${pair.to}`, rate };
        })
      );
      return results.reduce((acc, result, index) => {
        const key = `${allTrendingPairs[index].from}-${allTrendingPairs[index].to}`;
        if (result.status === 'fulfilled') {
          acc[key] = { rate: result.value.rate };
        } else {
          acc[key] = { rate: null };
        }
        return acc;
      }, {} as Record<string, { rate: number | null }>);
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const filteredPairs = allTrendingPairs.filter(pair => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pair.from.toLowerCase().includes(query) ||
      pair.to.toLowerCase().includes(query) ||
      pair.fromName.toLowerCase().includes(query) ||
      pair.toName.toLowerCase().includes(query)
    );
  });

  const handleExchange = (from: string, to: string) => {
    window.location.href = `/?from=${from}&to=${to}`;
  };

  return (
    <Layout>
      <Helmet>
        <title>Trending Pairs - xlama</title>
        <meta name="description" content="Popular cryptocurrency trading pairs with live exchange rates." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Trending Pairs</h1>
            </div>
            <p className="text-muted-foreground">
              Most popular crypto exchange pairs with live rates
            </p>
          </div>

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

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pairs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pairs Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="w-10 h-10 rounded-full bg-muted" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPairs.map((pair) => {
              const rateKey = `${pair.from}-${pair.to}`;
              const rateData = rates?.[rateKey];
              
              return (
                <Card 
                  key={rateKey}
                  className="p-4 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => handleExchange(pair.from, pair.to)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex -space-x-2">
                      <img
                        src={pair.fromImage}
                        alt={pair.fromName}
                        className="w-10 h-10 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.from}&background=random`;
                        }}
                      />
                      <img
                        src={pair.toImage}
                        alt={pair.toName}
                        className="w-10 h-10 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.to}&background=random`;
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-sm">
                        <span className="uppercase">{pair.displayFrom || pair.from}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="uppercase">{pair.displayTo || pair.to}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {pair.fromName} → {pair.toName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {rateData?.rate !== null && rateData?.rate !== undefined ? (
                          <div className="font-mono text-sm font-medium">
                            {rateData.rate.toFixed(rateData.rate > 1 ? 4 : 8)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 shrink-0",
                          isFavorite(pair.from, pair.to)
                            ? "text-warning"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(pair);
                        }}
                      >
                        <Star className={cn(
                          "w-4 h-4",
                          isFavorite(pair.from, pair.to) && "fill-current"
                        )} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {filteredPairs.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            No pairs found matching "{searchQuery}"
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Trending;
