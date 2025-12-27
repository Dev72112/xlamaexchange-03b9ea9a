import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { Star, ArrowRight, Trash2, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { changeNowService } from "@/services/changenow";
import { cn } from "@/lib/utils";

const Favorites = () => {
  const { favorites, removeFavorite } = useFavoritePairs();
  const navigate = useNavigate();

  // Fetch rates for all favorite pairs
  const { data: rates, isLoading } = useQuery({
    queryKey: ['favorite-rates', favorites.map(f => `${f.from}-${f.to}`).join(',')],
    queryFn: async () => {
      if (favorites.length === 0) return {};
      
      const ratePromises = favorites.map(async (pair) => {
        try {
          const minResult = await changeNowService.getMinAmount(pair.from, pair.to);
          const minAmount = typeof minResult === 'number' ? minResult : minResult?.minAmount || 1;
          const amount = Math.max(1, minAmount);
          const result = await changeNowService.getExchangeAmount(pair.from, pair.to, amount);
          const rate = result.estimatedAmount / amount;
          return { key: `${pair.from}-${pair.to}`, rate };
        } catch {
          return { key: `${pair.from}-${pair.to}`, rate: null };
        }
      });

      const results = await Promise.all(ratePromises);
      return results.reduce((acc, { key, rate }) => {
        acc[key] = rate;
        return acc;
      }, {} as Record<string, number | null>);
    },
    enabled: favorites.length > 0,
    refetchInterval: 30000,
  });

  const handleExchange = (from: string, to: string) => {
    // Use window.location to force full reload with params
    window.location.href = `/?from=${from}&to=${to}`;
  };

  return (
    <Layout>
      <Helmet>
        <title>Favorite Pairs - xlama</title>
        <meta name="description" content="Your saved favorite cryptocurrency trading pairs with live rates." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-warning/10">
              <Star className="w-6 h-6 text-warning fill-warning" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Favorite Pairs</h1>
          </div>
          <p className="text-muted-foreground">
            Your saved trading pairs with live exchange rates. Click any pair to start an exchange.
          </p>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add your favorite trading pairs from the exchange widget or trending pairs section.
            </p>
            <Button onClick={() => navigate('/')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Explore Pairs
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {favorites.map((pair) => {
              const rateKey = `${pair.from}-${pair.to}`;
              const rate = rates?.[rateKey];
              
              return (
                <Card 
                  key={rateKey}
                  className="p-4 sm:p-5 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => handleExchange(pair.from, pair.to)}
                >
                  <div className="flex items-center gap-4">
                    {/* Pair Icons */}
                    <div className="flex items-center">
                      <div className="relative">
                        <img
                          src={pair.fromImage}
                          alt={pair.fromName}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.from}&background=random`;
                          }}
                        />
                      </div>
                      <div className="relative -ml-3">
                        <img
                          src={pair.toImage}
                          alt={pair.toName}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pair.to}&background=random`;
                          }}
                        />
                      </div>
                    </div>

                    {/* Pair Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold uppercase">{pair.displayFrom || pair.from}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold uppercase">{pair.displayTo || pair.to}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {pair.fromName} → {pair.toName}
                      </div>
                    </div>

                    {/* Rate */}
                    <div className="text-right hidden sm:block">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : rate ? (
                        <div>
                          <div className="text-sm text-muted-foreground">Rate</div>
                          <div className="font-mono font-medium text-primary">
                            {rate.toFixed(rate < 1 ? 8 : 4)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 text-muted-foreground hover:text-destructive",
                          "opacity-0 group-hover:opacity-100 transition-opacity"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(pair);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm"
                        className="hidden sm:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExchange(pair.from, pair.to);
                        }}
                      >
                        Exchange
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        {favorites.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total saved pairs</span>
              <span className="font-medium">{favorites.length}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
