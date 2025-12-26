import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
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
import { Currency, popularCurrencies } from "@/data/currencies";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  excludeTicker?: string;
}

export function CurrencySelector({ value, onChange, excludeTicker }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);

  const filteredCurrencies = popularCurrencies.filter(
    (c) => c.ticker.toLowerCase() !== excludeTicker?.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2 px-3 justify-between gap-2 bg-secondary/50 hover:bg-secondary rounded-xl min-w-[140px]"
        >
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
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {filteredCurrencies.map((currency) => (
                <CommandItem
                  key={currency.ticker}
                  value={`${currency.ticker} ${currency.name}`}
                  onSelect={() => {
                    onChange(currency);
                    setOpen(false);
                  }}
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
                  <div className="flex-1">
                    <div className="font-medium uppercase">{currency.ticker}</div>
                    <div className="text-xs text-muted-foreground">{currency.name}</div>
                  </div>
                  {currency.network && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                      {currency.network}
                    </span>
                  )}
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value.ticker === currency.ticker ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
