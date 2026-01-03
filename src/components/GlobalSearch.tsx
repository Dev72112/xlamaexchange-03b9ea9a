import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, ArrowRight, TrendingUp, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Currency } from "@/data/currencies";
import { changeNowService } from "@/services/changenow";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Fetch currencies on first open
  useEffect(() => {
    if (!open) return;
    
    const fetchCurrencies = async () => {
      try {
        const apiCurrencies = await changeNowService.getCurrencies();
        // Filter out fiat - crypto to crypto only
        const cryptoOnly = apiCurrencies
          .filter(c => !c.isFiat)
          .map(c => ({
            ticker: c.ticker,
            name: c.name,
            image: c.image,
          }));
        setCurrencies(cryptoOnly);
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currencies.length === 0) {
      fetchCurrencies();
    } else {
      setIsLoading(false);
    }
  }, [open, currencies.length]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Filter and categorize currencies
  const { favorites, popular, results } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // Get favorites
    const favs = currencies.filter(c => isFavorite(c.ticker)).slice(0, 8);
    
    // Get popular
    const popularTickers = ['btc', 'eth', 'sol', 'xrp', 'doge', 'ltc', 'ada', 'bnbmainnet', 'avaxc', 'dot', 'matic', 'trx'];
    const pop = currencies.filter(c => 
      popularTickers.includes(c.ticker.toLowerCase()) && !isFavorite(c.ticker)
    ).slice(0, 8);
    
    // Search results
    const res = query 
      ? currencies.filter(c => 
          c.ticker.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
        ).slice(0, 50)
      : [];
    
    return { favorites: favs, popular: pop, results: res };
  }, [currencies, searchQuery, isFavorite]);

  const handleSelect = useCallback((currency: Currency) => {
    onOpenChange(false);
    // Navigate with both from and to params to update the widget
    // Set as "from" currency by default
    window.location.href = `/?from=${currency.ticker}`;
  }, [onOpenChange]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, ticker: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(ticker);
  }, [toggleFavorite]);

  const renderCurrency = (currency: Currency) => (
    <div
      key={currency.ticker}
      onClick={() => handleSelect(currency)}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-accent/50 transition-colors group"
    >
      <button
        onClick={(e) => handleToggleFavorite(e, currency.ticker)}
        className="p-0.5 hover:bg-secondary rounded shrink-0"
        type="button"
      >
        <Star 
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            isFavorite(currency.ticker) ? "fill-warning text-warning" : "text-muted-foreground hover:text-warning"
          )} 
        />
      </button>
      <img
        src={currency.image}
        alt={currency.name}
        className="w-8 h-8 rounded-full shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold uppercase text-sm">{currency.ticker}</div>
        <div className="text-xs text-muted-foreground truncate">{currency.name}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  // Keyboard shortcut and global event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    
    const handleOpenSearch = () => {
      onOpenChange(true);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenSearch);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenSearch);
    };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-card border-border overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Search Cryptocurrencies</DialogTitle>
        </VisuallyHidden>
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            placeholder="Search cryptocurrencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 hover:bg-secondary rounded-md"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-3">
              {searchQuery ? (
                // Search results
                results.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Results ({results.length})
                    </div>
                    {results.map(renderCurrency)}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No cryptocurrencies found</p>
                    <p className="text-xs mt-1">Try searching with a different term</p>
                  </div>
                )
              ) : (
                // Default view with favorites and popular
                <div className="space-y-4">
                  {favorites.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Star className="w-3 h-3 fill-warning text-warning" />
                        Your Favorites
                      </div>
                      {favorites.map(renderCurrency)}
                    </div>
                  )}
                  
                  {popular.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" />
                        Popular
                      </div>
                      {popular.map(renderCurrency)}
                    </div>
                  )}
                  
                  {favorites.length === 0 && popular.length === 0 && currencies.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Start typing to search</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px]">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px]">↑↓</kbd>
              to navigate
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {currencies.length} cryptocurrencies
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}