import { useState, useMemo, useCallback } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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

  // Filter and group currencies with memoization
  const { filteredCurrencies, featuredCurrencies, stablecoins, otherCurrencies, totalCount } = useMemo(() => {
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

    const featured = limitedResults.filter(c => 
      ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'ltc', 'dot', 'avaxc', 'trx', 'bnbmainnet', 'matic'].includes(c.ticker.toLowerCase())
    );
    const stables = limitedResults.filter(c => 
      c.ticker.toLowerCase().includes('usdt') || 
      c.ticker.toLowerCase().includes('usdc') ||
      c.ticker.toLowerCase().includes('dai')
    );
    const others = limitedResults.filter(c => 
      !featured.includes(c) && !stables.includes(c)
    );

    return {
      filteredCurrencies: limitedResults,
      featuredCurrencies: featured,
      stablecoins: stables,
      otherCurrencies: others,
      totalCount: total,
    };
  }, [currencies, excludeTicker, searchQuery]);

  const handleSelect = useCallback((currency: Currency) => {
    onChange(currency);
    setOpen(false);
    setSearchQuery("");
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2 px-3 justify-between gap-2 bg-secondary hover:bg-accent rounded-lg min-w-[140px]"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <img
                src={value.image}
                alt={value.name}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${value.ticker}&background=random`;
                }}
              />
              <div className="text-left">
                <div className="font-semibold uppercase text-sm">{value.ticker}</div>
                {value.network && (
                  <div className="text-xs text-muted-foreground">{value.network}</div>
                )}
              </div>
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-popover border-border" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              placeholder={`Search ${totalCount} currencies...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="text-xs text-muted-foreground shrink-0">{totalCount}</span>
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No currency found.</CommandEmpty>
            
            {!searchQuery && featuredCurrencies.length > 0 && (
              <CommandGroup heading="Popular">
                {featuredCurrencies.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    onSelect={() => handleSelect(currency)}
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
                    onSelect={() => handleSelect(currency)}
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
                    onSelect={() => handleSelect(currency)}
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
  onSelect 
}: { 
  currency: Currency; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${currency.ticker} ${currency.name}`}
      onSelect={onSelect}
      className="flex items-center gap-3 py-2 cursor-pointer"
    >
      <img
        src={currency.image}
        alt={currency.name}
        className="w-6 h-6 rounded-full"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium uppercase">{currency.ticker}</div>
        <div className="text-xs text-muted-foreground truncate">{currency.name}</div>
      </div>
      {currency.network && (
        <span className="text-xs bg-secondary px-2 py-0.5 rounded shrink-0">
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
