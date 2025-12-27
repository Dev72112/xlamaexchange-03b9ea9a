import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";

export function FavoritePairsSection() {
  const { favorites, removeFavorite } = useFavoritePairs();

  if (favorites.length === 0) {
    return null;
  }

  return (
    <section className="py-12 border-t border-border">
      <div className="container px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning fill-warning" />
            <h2 className="text-xl sm:text-2xl font-semibold">Your Favorites</h2>
          </div>
          <Link to="/favorites">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {favorites.slice(0, 5).map((pair) => (
            <Card 
              key={`${pair.from}-${pair.to}`}
              className="group relative bg-card border border-border hover:border-primary/30 transition-all"
            >
              <button
                onClick={() => removeFavorite(pair)}
                className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all z-10"
                title="Remove from favorites"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
              <Link to={`/?from=${pair.from}&to=${pair.to}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
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
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="uppercase">{pair.displayFrom || pair.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="uppercase">{pair.displayTo || pair.to}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
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
}
