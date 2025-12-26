import { useState, useMemo, useCallback } from "react";
import { Check, ChevronDown, Loader2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Currency } from "@/data/currencies";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";

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
  const { filteredCurrencies, favoriteCurrencies, featuredCurrencies, stablecoins, otherCurrencies, totalCount } = useMemo(() => {
    const filtered = currencies.filter(
      (c) => c.ticker.toLowerCase() !== excludeTicker?.toLowerCase()
    );
    
    const total = filtered.length;

    // Apply search filter
    const searchFiltered = searchQuery
      ? filtered.filter(c => 
          c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : filtered;

    // Limit results for performance
    const limitedResults = searchFiltered.slice(0, 100);

    // Get favorites first
    const favs = limitedResults.filter(c => isFavorite(c.ticker));

    const featured = limitedResults.filter(c => 
      ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'ltc', 'dot', 'avaxc', 'trx', 'bnbmainnet', 'matic'].includes(c.ticker.toLowerCase()) &&
      !isFavorite(c.ticker)
    );
    const stables = limitedResults.filter(c => 
      (c.ticker.toLowerCase().includes('usdt') || 
       c.ticker.toLowerCase().includes('usdc') ||
       c.ticker.toLowerCase().includes('dai')) &&
      !isFavorite(c.ticker)
    );
    const others = limitedResults.filter(c => 
      !favs.includes(c) && !featured.includes(c) && !stables.includes(c)
    );

    return {
      filteredCurrencies: limitedResults,
      favoriteCurrencies: favs,
      featuredCurrencies: featured,
      stablecoins: stables,
      otherCurrencies: others,
      totalCount: total,
    };
  }, [currencies, excludeTicker, searchQuery, favorites, isFavorite]);

  const handleSelect = useCallback((currency: Currency) => {
    onChange(currency);
    setOpen(false);
    setSearchQuery("");
  }, [onChange]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, ticker: string) => {
    e.stopPropagation();
    toggleFavorite(ticker);
  }, [toggleFavorite]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2 px-3 justify-between gap-2 bg-secondary hover:bg-accent rounded-lg min-w-[120px] max-w-[140px] shrink-0"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={value.image}
                alt={value.name}
                className="w-6 h-6 rounded-full shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${value.ticker}&background=random`;
                }}
              />
              <div className="text-left min-w-0">
                <div className="font-semibold uppercase text-sm truncate">{value.ticker}</div>
                {value.network && (
                  <div className="text-xs text-muted-foreground truncate">{value.network}</div>
                )}
              </div>
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 bg-popover border-border z-50" 
        align="end"
        sideOffset={8}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              placeholder={`Search ${totalCount} currencies...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="text-xs text-muted-foreground shrink-0 bg-secondary px-1.5 py-0.5 rounded">{totalCount}</span>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No currency found.</CommandEmpty>
            
            {!searchQuery && favoriteCurrencies.length > 0 && (
              <CommandGroup heading="★ Favorites">
                {favoriteCurrencies.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    isFavorite={true}
                    onSelect={() => handleSelect(currency)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, currency.ticker)}
                  />
                ))}
              </CommandGroup>
            )}
            
            {!searchQuery && featuredCurrencies.length > 0 && (
              <CommandGroup heading="Popular">
                {featuredCurrencies.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    isFavorite={false}
                    onSelect={() => handleSelect(currency)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, currency.ticker)}
                  />
                ))}
              </CommandGroup>
            )}
            
            {!searchQuery && stablecoins.length > 0 && (
              <CommandGroup heading="Stablecoins">
                {stablecoins.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    isFavorite={false}
                    onSelect={() => handleSelect(currency)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, currency.ticker)}
                  />
                ))}
              </CommandGroup>
            )}
            
            {(searchQuery ? filteredCurrencies : otherCurrencies).length > 0 && (
              <CommandGroup heading={searchQuery ? `Results (${filteredCurrencies.length})` : "All Currencies"}>
                {(searchQuery ? filteredCurrencies : otherCurrencies).map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    isFavorite={isFavorite(currency.ticker)}
                    onSelect={() => handleSelect(currency)}
                    onToggleFavorite={(e) => handleToggleFavorite(e, currency.ticker)}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CurrencyItem({ 
  currency, 
  isSelected, 
  isFavorite,
  onSelect,
  onToggleFavorite
}: { 
  currency: Currency; 
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  return (
    <CommandItem
      value={`${currency.ticker} ${currency.name}`}
      onSelect={onSelect}
      className="flex items-center gap-2 py-2 cursor-pointer"
    >
      <button
        onClick={onToggleFavorite}
        className="p-0.5 hover:bg-secondary rounded shrink-0"
      >
        <Star 
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            isFavorite ? "fill-warning text-warning" : "text-muted-foreground hover:text-warning"
          )} 
        />
      </button>
      <img
        src={currency.image}
        alt={currency.name}
        className="w-5 h-5 rounded-full shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium uppercase text-sm">{currency.ticker}</div>
        <div className="text-xs text-muted-foreground truncate">{currency.name}</div>
      </div>
      {currency.network && (
        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded shrink-0">
          {currency.network}
        </span>
      )}
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );
}
