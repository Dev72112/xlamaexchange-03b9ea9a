import { useState, useEffect } from "react";
import { ArrowDownUp, Clock, Info, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelector } from "./CurrencySelector";
import { Currency, popularCurrencies } from "@/data/currencies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExchangeForm } from "./ExchangeForm";

export function ExchangeWidget() {
  const { toast } = useToast();
  const [fromCurrency, setFromCurrency] = useState<Currency>(popularCurrencies[0]); // BTC
  const [toCurrency, setToCurrency] = useState<Currency>(popularCurrencies[1]); // ETH
  const [fromAmount, setFromAmount] = useState<string>("0.1");
  const [toAmount, setToAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateType, setRateType] = useState<"standard" | "fixed">("standard");
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [minAmount, setMinAmount] = useState<number>(0);

  // Simulate rate calculation (will be replaced with actual API call)
  useEffect(() => {
    const calculateRate = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setToAmount("");
        setExchangeRate(null);
        return;
      }

      setIsLoading(true);
      
      // Simulated exchange rates (these would come from ChangeNow API)
      const mockRates: Record<string, number> = {
        "btc-eth": 15.5,
        "eth-btc": 0.064,
        "btc-usdt": 43000,
        "usdt-btc": 0.0000233,
        "eth-usdt": 2800,
        "usdt-eth": 0.000357,
        "btc-sol": 400,
        "sol-btc": 0.0025,
        "eth-sol": 26,
        "sol-eth": 0.038,
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pairKey = `${fromCurrency.ticker}-${toCurrency.ticker}`;
      const reversePairKey = `${toCurrency.ticker}-${fromCurrency.ticker}`;
      
      let rate = mockRates[pairKey];
      if (!rate && mockRates[reversePairKey]) {
        rate = 1 / mockRates[reversePairKey];
      }
      
      if (!rate) {
        // Generate a random reasonable rate for demo purposes
        rate = Math.random() * 10 + 0.5;
      }

      setExchangeRate(rate);
      setToAmount((parseFloat(fromAmount) * rate).toFixed(8));
      setMinAmount(0.001); // Mock minimum
      setIsLoading(false);
    };

    const debounce = setTimeout(calculateRate, 300);
    return () => clearTimeout(debounce);
  }, [fromAmount, fromCurrency, toCurrency, rateType]);

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
    setFromAmount(toAmount);
  };

  const handleExchange = () => {
    if (!fromAmount || parseFloat(fromAmount) < minAmount) {
      toast({
        title: "Invalid amount",
        description: `Minimum amount is ${minAmount} ${fromCurrency.ticker.toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }
    setShowExchangeForm(true);
  };

  if (showExchangeForm) {
    return (
      <ExchangeForm
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        fromAmount={fromAmount}
        toAmount={toAmount}
        exchangeRate={exchangeRate}
        rateType={rateType}
        onBack={() => setShowExchangeForm(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto glass glow">
      <CardContent className="p-6 space-y-4">
        {/* Rate Type Toggle */}
        <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg">
          <Button
            variant={rateType === "standard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setRateType("standard")}
            className="flex-1"
          >
            Standard
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 ml-1 opacity-50" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Rate may vary slightly during the exchange</p>
              </TooltipContent>
            </Tooltip>
          </Button>
          <Button
            variant={rateType === "fixed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setRateType("fixed")}
            className="flex-1"
          >
            Fixed
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 ml-1 opacity-50" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Locked rate for 15 minutes</p>
              </TooltipContent>
            </Tooltip>
          </Button>
        </div>

        {/* From Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">You Send</label>
          <div className="flex gap-2 items-center p-3 bg-secondary/30 rounded-xl border border-border">
            <Input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="border-0 bg-transparent text-2xl font-semibold focus-visible:ring-0 p-0 h-auto"
            />
            <CurrencySelector
              value={fromCurrency}
              onChange={setFromCurrency}
              excludeTicker={toCurrency.ticker}
            />
          </div>
          {minAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              Min: {minAmount} {fromCurrency.ticker.toUpperCase()}
            </p>
          )}
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapCurrencies}
            className="rounded-full z-10 bg-background hover:bg-secondary border-2"
          >
            <ArrowDownUp className="w-4 h-4" />
          </Button>
        </div>

        {/* To Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">You Receive</label>
          <div className="flex gap-2 items-center p-3 bg-secondary/30 rounded-xl border border-border">
            <div className="flex-1 text-2xl font-semibold font-mono">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : toAmount ? (
                parseFloat(toAmount).toFixed(6)
              ) : (
                <span className="text-muted-foreground">0.00</span>
              )}
            </div>
            <CurrencySelector
              value={toCurrency}
              onChange={setToCurrency}
              excludeTicker={fromCurrency.ticker}
            />
          </div>
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate && !isLoading && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Rate</span>
            <span className="font-mono">
              1 {fromCurrency.ticker.toUpperCase()} ≈ {exchangeRate.toFixed(6)} {toCurrency.ticker.toUpperCase()}
            </span>
          </div>
        )}

        {/* Estimated Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Clock className="w-4 h-4" />
          <span>Estimated time: 10-30 minutes</span>
        </div>

        {/* Exchange Button */}
        <Button
          size="lg"
          className="w-full gradient-primary text-primary-foreground font-semibold"
          onClick={handleExchange}
          disabled={isLoading || !toAmount}
        >
          Exchange Now
        </Button>

        {/* No Registration Notice */}
        <p className="text-center text-xs text-muted-foreground">
          No registration required • No hidden fees
        </p>
      </CardContent>
    </Card>
  );
}
