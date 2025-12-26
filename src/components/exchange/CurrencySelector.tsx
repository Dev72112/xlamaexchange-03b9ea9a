import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
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

  const filteredCurrencies = currencies.filter(
    (c) => c.ticker.toLowerCase() !== excludeTicker?.toLowerCase()
  );

  // Group currencies: featured first, then stablecoins, then others
  const featuredCurrencies = filteredCurrencies.filter(c => 
    ['btc', 'eth', 'sol', 'xrp', 'ada', 'doge', 'ltc', 'dot', 'avaxc', 'trx'].includes(c.ticker.toLowerCase())
  );
  const stablecoins = filteredCurrencies.filter(c => 
    c.ticker.toLowerCase().includes('usdt') || 
    c.ticker.toLowerCase().includes('usdc') ||
    c.ticker.toLowerCase().includes('dai')
  );
  const otherCurrencies = filteredCurrencies.filter(c => 
    !featuredCurrencies.includes(c) && !stablecoins.includes(c)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2 px-3 justify-between gap-2 bg-secondary/50 hover:bg-secondary rounded-xl min-w-[140px]"
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
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No currency found.</CommandEmpty>
            
            {featuredCurrencies.length > 0 && (
              <CommandGroup heading="Popular">
                {featuredCurrencies.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    onSelect={() => {
                      onChange(currency);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
            
            {stablecoins.length > 0 && (
              <CommandGroup heading="Stablecoins">
                {stablecoins.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    onSelect={() => {
                      onChange(currency);
                      setOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
            
            {otherCurrencies.length > 0 && (
              <CommandGroup heading="All Currencies">
                {otherCurrencies.map((currency) => (
                  <CurrencyItem
                    key={currency.ticker}
                    currency={currency}
                    isSelected={value.ticker === currency.ticker}
                    onSelect={() => {
                      onChange(currency);
                      setOpen(false);
                    }}
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
      className="flex items-center gap-3 py-2"
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
