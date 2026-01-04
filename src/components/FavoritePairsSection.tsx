import { memo } from "react";
import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

export const FavoritePairsSection = memo(function FavoritePairsSection() {
  const { favorites, removeFavorite } = useFavoritePairs();

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-10 lg:py-12 border-t border-border" aria-labelledby="favorites-section-heading">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-warning fill-warning" aria-hidden="true" />
            <h2 id="favorites-section-heading" className="text-lg sm:text-xl lg:text-2xl font-semibold">Your Favorites</h2>
          </div>
          <Link to="/favorites">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              View all
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 w-full">
          {favorites.slice(0, 5).map((pair, index) => (
            <Card 
              key={`${pair.from}-${pair.to}`}
              className={`group relative bg-card border border-border hover:border-primary/30 hover-lift transition-all ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 60)}
            >
              <button
                onClick={() => removeFavorite(pair)}
                className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all z-10"
                title="Remove from favorites"
                aria-label={`Remove ${pair.fromName} to ${pair.toName} from favorites`}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
              <Link to={`/?from=${pair.from}&to=${pair.to}`}>
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                    <div className="flex -space-x-2">
                      <img
                        src={pair.fromImage}
                        alt=""
                        loading="lazy"
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background"
                      />
                      <img
                        src={pair.toImage}
                        alt=""
                        loading="lazy"
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <span className="uppercase">{pair.displayFrom || pair.from}</span>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="uppercase">{pair.displayTo || pair.to}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    {pair.fromName} → {pair.toName}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});
