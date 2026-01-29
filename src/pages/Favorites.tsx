import { AppLayout } from "@/components/AppLayout";
import { Helmet } from "react-helmet-async";
import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { Star, ArrowRight, Trash2, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlowBar } from "@/components/ui/glow-bar";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { changeNowService } from "@/services/changenow";
import { cn } from "@/lib/utils";
import { FavoriteCardsSkeleton } from "@/components/ContentSkeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

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
    <AppLayout>
      <Helmet>
        <title>Favorite Pairs - xlama</title>
        <meta name="description" content="Your saved favorite cryptocurrency trading pairs with live rates." />
      </Helmet>

      <div className="container px-4 pb-12 sm:pb-16 max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Header with premium styling */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-warning/30 text-xs sm:text-sm text-warning mb-3">
            <Star className="w-3.5 h-3.5 fill-warning" />
            <span>Your Collection</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold gradient-text mb-2">Favorite Pairs</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your saved trading pairs with live exchange rates
          </p>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <Card className="glass glow-sm border-primary/10 overflow-hidden">
            <GlowBar variant="warning" />
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add your favorite trading pairs from the exchange widget or trending pairs section.
              </p>
              <Button onClick={() => navigate('/')} className="btn-ripple">
                <TrendingUp className="w-4 h-4 mr-2" />
                Explore Pairs
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <FavoriteCardsSkeleton count={favorites.length || 3} />
        ) : (
          <div className="grid gap-3">
            {favorites.map((pair, i) => {
              const rateKey = `${pair.from}-${pair.to}`;
              const rate = rates?.[rateKey];

              return (
                <Card
                  key={rateKey}
                  className={cn("p-4 sm:p-5 glass hover:border-primary/30 hover-lift card-hover-glow transition-all cursor-pointer group sweep-effect shadow-premium-hover", STAGGER_ITEM_CLASS)}
                  style={getStaggerStyle(i, 60)}
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
          <Card className="glass border-border/50 overflow-hidden mt-8">
            <GlowBar variant="warning" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total saved pairs</span>
                <span className="font-medium text-primary">{favorites.length}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
