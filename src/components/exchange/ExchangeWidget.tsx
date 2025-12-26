import { useState, useEffect, useCallback } from "react";
import { ArrowDownUp, Clock, Info, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelector } from "./CurrencySelector";
import { Currency, popularCurrencies } from "@/data/currencies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExchangeForm } from "./ExchangeForm";
import { changeNowService } from "@/services/changenow";

export function ExchangeWidget() {
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>(popularCurrencies);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [fromCurrency, setFromCurrency] = useState<Currency>(popularCurrencies[0]); // BTC
  const [toCurrency, setToCurrency] = useState<Currency>(popularCurrencies[1]); // ETH
  const [fromAmount, setFromAmount] = useState<string>("0.1");
  const [toAmount, setToAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateType] = useState<"standard" | "fixed">("standard"); // Fixed rate not enabled on API
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [minAmount, setMinAmount] = useState<number>(0);
  const [rateId, setRateId] = useState<string | undefined>();
  const [estimatedTime, setEstimatedTime] = useState<string>("10-30 minutes");
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairUnavailable, setPairUnavailable] = useState(false);

  // Fetch available currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const apiCurrencies = await changeNowService.getCurrencies();
        const mappedCurrencies: Currency[] = apiCurrencies
          .filter(c => !c.isFiat) // Filter out fiat currencies
          .map(c => ({
            ticker: c.ticker,
            name: c.name,
            image: c.image,
            network: c.ticker.includes('erc20') ? 'ERC20' : 
                     c.ticker.includes('trc20') ? 'TRC20' : 
                     c.ticker.includes('bsc') ? 'BSC' :
                     c.ticker.includes('sol') && c.ticker !== 'sol' ? 'SOL' :
                     c.ticker.includes('matic') && c.ticker !== 'matic' ? 'Polygon' :
                     c.ticker.includes('arb') ? 'Arbitrum' :
                     c.ticker.includes('op') ? 'Optimism' :
                     c.ticker.includes('base') ? 'Base' :
                     undefined,
          }));
        
        setCurrencies(mappedCurrencies);
        
        // Set defaults to BTC and ETH if available
        const btc = mappedCurrencies.find(c => c.ticker === 'btc');
        const eth = mappedCurrencies.find(c => c.ticker === 'eth');
        if (btc) setFromCurrency(btc);
        if (eth) setToCurrency(eth);
        
        console.log(`Loaded ${mappedCurrencies.length} currencies from ChangeNow`);
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
        // Fall back to static list
        setCurrencies(popularCurrencies);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  const calculateRate = useCallback(async () => {
    const amount = parseFloat(fromAmount);
    if (!fromAmount || amount <= 0) {
      setToAmount("");
      setExchangeRate(null);
      setPairError(null);
      setPairUnavailable(false);
      return;
    }

    setIsLoading(true);
    setPairError(null);
    setPairUnavailable(false);

    try {
      // Get minimum amount
      const minData = await changeNowService.getMinAmount(
        fromCurrency.ticker,
        toCurrency.ticker
      );
      setMinAmount(minData.minAmount);

      // Only get estimate if amount is above minimum
      if (amount >= minData.minAmount) {
        const estimate = await changeNowService.getExchangeAmount(
          fromCurrency.ticker,
          toCurrency.ticker,
          amount,
          rateType === "fixed"
        );

        setToAmount(estimate.estimatedAmount.toString());
        setExchangeRate(estimate.estimatedAmount / amount);
        setRateId(estimate.rateId);
        
        if (estimate.transactionSpeedForecast) {
          setEstimatedTime(estimate.transactionSpeedForecast);
        }

        if (estimate.warningMessage) {
          toast({
            title: "Notice",
            description: estimate.warningMessage,
          });
        }
      } else {
        setToAmount("");
        setExchangeRate(null);
      }
    } catch (error: any) {
      console.error("Rate calculation error:", error);
      
      // Check for specific API errors
      const errorMessage = error?.message || "";
      if (errorMessage.includes("pair_is_inactive") || errorMessage.includes("pair is inactive")) {
        setPairError(`This pair is temporarily unavailable`);
        setPairUnavailable(true);
      } else if (errorMessage.includes("fixed_rate_not_enabled")) {
        // Fixed rate not enabled - this shouldn't happen since we disabled it, but handle gracefully
        console.log("Fixed rate not enabled on API key");
        setPairError("Standard rate will be used");
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to get exchange rate",
          variant: "destructive",
        });
      }
      setToAmount("");
      setExchangeRate(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromAmount, fromCurrency.ticker, toCurrency.ticker, rateType, toast]);

  useEffect(() => {
    const debounce = setTimeout(calculateRate, 500);
    return () => clearTimeout(debounce);
  }, [calculateRate]);

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
    setFromAmount(toAmount);
  };

  const handleExchange = () => {
    const amount = parseFloat(fromAmount);
    if (!fromAmount || amount < minAmount) {
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
        rateId={rateId}
        onBack={() => setShowExchangeForm(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto bg-card border border-border rounded-xl overflow-hidden">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Rate Type Display */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Standard Rate</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Rate may vary slightly during the exchange</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-xs text-muted-foreground">Best available rate</span>
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
              className="border-0 bg-transparent text-xl sm:text-2xl font-semibold focus-visible:ring-0 p-0 h-auto flex-1 min-w-0"
            />
            <CurrencySelector
              value={fromCurrency}
              onChange={setFromCurrency}
              excludeTicker={toCurrency.ticker}
              currencies={currencies}
              isLoading={currenciesLoading}
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
          <div className={`flex gap-2 items-center p-3 bg-secondary/30 rounded-xl border ${pairUnavailable ? 'border-warning/50' : 'border-border'}`}>
            <div className="flex-1 text-xl sm:text-2xl font-semibold font-mono min-w-0 truncate">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : pairUnavailable ? (
                <span className="text-warning text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">Unavailable</span>
                </span>
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
              currencies={currencies}
              isLoading={currenciesLoading}
            />
          </div>
        </div>

        {/* Pair Unavailable Warning */}
        {pairUnavailable && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="text-warning">{pairError || "This trading pair is not available. Please select different currencies."}</span>
          </div>
        )}

        {/* Exchange Rate Display */}
        {exchangeRate && !isLoading && !pairUnavailable && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Rate</span>
            <span className="font-mono text-xs sm:text-sm truncate ml-2">
              1 {fromCurrency.ticker.toUpperCase()} ≈ {exchangeRate.toFixed(6)} {toCurrency.ticker.toUpperCase()}
            </span>
          </div>
        )}

        {/* Estimated Time */}
        {!pairUnavailable && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Estimated time: {estimatedTime}</span>
          </div>
        )}

        {/* Exchange Button */}
        <Button
          size="lg"
          className="w-full gradient-primary text-primary-foreground font-semibold"
          onClick={handleExchange}
          disabled={isLoading || !toAmount || pairUnavailable}
        >
          {pairUnavailable ? "Pair Unavailable" : "Exchange Now"}
        </Button>

        {/* No Registration Notice */}
        <p className="text-center text-xs text-muted-foreground">
          No registration required • No hidden fees
        </p>
      </CardContent>
    </Card>
  );
}
