import { useState, useMemo, useCallback } from "react";
import { Check, ChevronDown, Loader2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Currency } from "@/data/currencies";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { ScrollArea } from "@/components/ui/scroll-area";

// Network badge colors
const networkColors: Record<string, { bg: string; text: string }> = {
  'ERC20': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'TRC20': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'BSC': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'BEP20': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'SOL': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  'Polygon': { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  'Arbitrum': { bg: 'bg-sky-500/20', text: 'text-sky-400' },
  'Optimism': { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  'Base': { bg: 'bg-blue-600/20', text: 'text-blue-300' },
  'Avalanche': { bg: 'bg-red-600/20', text: 'text-red-300' },
  'TON': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  'Cosmos': { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  'Algorand': { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  'ZkSync': { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
  'Linea': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'Starknet': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'Aptos': { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  'Sui': { bg: 'bg-sky-600/20', text: 'text-sky-300' },
  'Celo': { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  'Manta': { bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

// Using a span element directly instead of a separate component to avoid ref forwarding issues
const getNetworkBadgeClass = (network: string) => {
  const colors = networkColors[network] || { bg: 'bg-secondary', text: 'text-muted-foreground' };
  return cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", colors.bg, colors.text);
};

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  excludeTicker?: string;
  currencies: Currency[];
  isLoading?: boolean;
}

export function CurrencySelector({ 
  value, 
  onChange, 
  excludeTicker,
  currencies,
  isLoading 
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Filter and group currencies with memoization
  const { favoriteCurrencies, featuredCurrencies, stablecoins, otherCurrencies, totalCount, searchResults } = useMemo(() => {
    const filtered = currencies.filter(
      (c) => c.ticker.toLowerCase() !== excludeTicker?.toLowerCase()
    );
    
    const total = filtered.length;

    // Apply search filter
    const searchFiltered = searchQuery
      ? filtered.filter(c => 
          c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 100)
      : [];

    // Get favorites first
    const favs = filtered.filter(c => isFavorite(c.ticker)).slice(0, 20);

    const featured = filtered.filter(c => 
      ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'ltc', 'dot', 'avaxc', 'trx', 'bnbmainnet', 'matic'].includes(c.ticker.toLowerCase()) &&
      !isFavorite(c.ticker)
    );
    const stables = filtered.filter(c => 
      (c.ticker.toLowerCase().includes('usdt') || 
       c.ticker.toLowerCase().includes('usdc') ||
       c.ticker.toLowerCase().includes('dai')) &&
      !isFavorite(c.ticker)
    ).slice(0, 20);
    const others = filtered.filter(c => 
      !favs.includes(c) && !featured.includes(c) && !stables.includes(c)
    ).slice(0, 50);

    return {
      favoriteCurrencies: favs,
      featuredCurrencies: featured,
      stablecoins: stables,
      otherCurrencies: others,
      totalCount: total,
      searchResults: searchFiltered,
    };
  }, [currencies, excludeTicker, searchQuery, favorites, isFavorite]);

  const handleSelect = useCallback((currency: Currency) => {
    onChange(currency);
    setOpen(false);
    setSearchQuery("");
  }, [onChange]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, ticker: string) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(ticker);
  }, [toggleFavorite]);

  const renderCurrencyItem = (currency: Currency) => (
    <div
      key={currency.ticker}
      onClick={() => handleSelect(currency)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors",
        "hover:bg-accent/50",
        value.ticker === currency.ticker && "bg-accent"
      )}
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
        className="w-7 h-7 rounded-full shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold uppercase text-sm">{currency.ticker}</div>
        <div className="text-xs text-muted-foreground truncate">{currency.name}</div>
      </div>
      {currency.network && (
        <span className={getNetworkBadgeClass(currency.network)}>{currency.network}</span>
      )}
      {value.ticker === currency.ticker && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2.5 px-3 justify-between gap-2 bg-secondary/50 hover:bg-secondary border border-border rounded-xl min-w-[130px] shrink-0"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={value.image}
                alt={value.name}
                className="w-7 h-7 rounded-full shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${value.ticker}&background=random`;
                }}
              />
              <div className="text-left min-w-0">
                <div className="font-semibold uppercase text-sm">{value.ticker}</div>
                {value.network && (
                  <div className="text-[10px] text-muted-foreground truncate">{value.network}</div>
                )}
              </div>
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[340px] p-0 bg-popover border-border shadow-2xl z-50 rounded-xl" 
        align="end"
        sideOffset={8}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            placeholder={`Search ${totalCount} currencies...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{totalCount}</span>
        </div>

        <ScrollArea className="h-[350px]">
          <div className="p-2">
            {searchQuery ? (
              // Search results
              searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Results ({searchResults.length})
                  </div>
                  {searchResults.map(renderCurrencyItem)}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No currencies found
                </div>
              )
            ) : (
              // Grouped view
              <div className="space-y-4">
                {favoriteCurrencies.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-warning text-warning" />
                      Favorites
                    </div>
                    {favoriteCurrencies.map(renderCurrencyItem)}
                  </div>
                )}
                
                {featuredCurrencies.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Popular</div>
                    {featuredCurrencies.map(renderCurrencyItem)}
                  </div>
                )}
                
                {stablecoins.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Stablecoins</div>
                    {stablecoins.map(renderCurrencyItem)}
                  </div>
                )}
                
                {otherCurrencies.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">All Currencies</div>
                    {otherCurrencies.map(renderCurrencyItem)}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
