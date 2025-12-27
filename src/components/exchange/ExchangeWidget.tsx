import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, Clock, Info, Loader2, AlertTriangle, Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencySelector } from "./CurrencySelector";
import { Currency, popularCurrencies } from "@/data/currencies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExchangeForm } from "./ExchangeForm";
import { changeNowService } from "@/services/changenow";
import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

// Detect network from ticker and name
function detectNetwork(ticker: string, name: string): string | undefined {
  const t = ticker.toLowerCase();
  const n = name.toLowerCase();
  
  if (t.includes('erc20') || n.includes('erc20')) return 'ERC20';
  if (t.includes('trc20') || n.includes('trc20')) return 'TRC20';
  if (t.includes('bsc') || n.includes('binance smart chain') || n.includes('bep20')) return 'BSC';
  if ((t.includes('sol') && t !== 'sol') || (n.includes('(sol)') && !n.includes('solana'))) return 'SOL';
  if (t.includes('matic') && t !== 'matic') return 'Polygon';
  if ((t.includes('polygon') && t !== 'polygon') || n.includes('(polygon)')) return 'Polygon';
  if (t.includes('arb') || n.includes('arbitrum')) return 'Arbitrum';
  if ((t.includes('op') && t !== 'op') || (n.includes('optimism') && !n.includes('optimism)'))) return 'Optimism';
  if (t.includes('base') || n.includes('(base)')) return 'Base';
  if (t.includes('avax') || t.includes('arc20') || n.includes('avax c-chain')) return 'Avalanche';
  if (t.includes('ton') && t !== 'ton') return 'TON';
  if (t.includes('algo') && t !== 'algo') return 'Algorand';
  if (t.includes('zksync') || n.includes('zksync')) return 'ZkSync';
  if (t.includes('lna') || n.includes('linea')) return 'Linea';
  if (t.includes('strk') || n.includes('starknet')) return 'Starknet';
  if (t.includes('apt') && t !== 'apt') return 'Aptos';
  if (t.includes('sui') && t !== 'sui') return 'Sui';
  if (t.includes('celo') && t !== 'celo') return 'Celo';
  if (t.includes('manta') || n.includes('manta')) return 'Manta';
  if (t.includes('assethub') || n.includes('assethub')) return 'Polkadot';
  
  return undefined;
}

export function ExchangeWidget() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavoritePairs();
  const [currencies, setCurrencies] = useState<Currency[]>(popularCurrencies);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [fromCurrency, setFromCurrency] = useState<Currency>(popularCurrencies[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(popularCurrencies[1]);
  const [fromAmount, setFromAmount] = useState<string>("1");
  const [toAmount, setToAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateType] = useState<"standard" | "fixed">("standard");
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [minAmount, setMinAmount] = useState<number>(0);
  const [rateId, setRateId] = useState<string | undefined>();
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairUnavailable, setPairUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currenciesError, setCurrenciesError] = useState<string | null>(null);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30);

  // Fetch available currencies on mount
  const fetchCurrencies = useCallback(async () => {
    setCurrenciesLoading(true);
    setCurrenciesError(null);
    try {
      const apiCurrencies = await changeNowService.getCurrencies();
      const mappedCurrencies: Currency[] = apiCurrencies
        .filter(c => !c.isFiat)
        .map(c => ({
          ticker: c.ticker,
          name: c.name,
          image: c.image,
          network: detectNetwork(c.ticker, c.name),
        }));
      
      setCurrencies(mappedCurrencies);
      
      // Check URL params for from/to currencies
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');
      
      const btc = mappedCurrencies.find(c => c.ticker === 'btc');
      const eth = mappedCurrencies.find(c => c.ticker === 'eth');
      
      if (fromParam) {
        const fromMatch = mappedCurrencies.find(c => c.ticker.toLowerCase() === fromParam.toLowerCase());
        if (fromMatch) setFromCurrency(fromMatch);
        else if (btc) setFromCurrency(btc);
      } else if (btc) {
        setFromCurrency(btc);
      }
      
      if (toParam) {
        const toMatch = mappedCurrencies.find(c => c.ticker.toLowerCase() === toParam.toLowerCase());
        if (toMatch) setToCurrency(toMatch);
        else if (eth) setToCurrency(eth);
      } else if (eth) {
        setToCurrency(eth);
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
      setCurrenciesError('Failed to load currencies. Using cached data.');
      setCurrencies(popularCurrencies);
    } finally {
      setCurrenciesLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // Check if current pair is favorite
  const isPairFavorite = isFavorite(fromCurrency.ticker, toCurrency.ticker);

  const handleToggleFavorite = () => {
    toggleFavorite({
      from: fromCurrency.ticker,
      to: toCurrency.ticker,
      fromName: fromCurrency.name,
      toName: toCurrency.name,
      fromImage: fromCurrency.image,
      toImage: toCurrency.image,
      displayFrom: fromCurrency.ticker,
      displayTo: toCurrency.ticker,
    });
  };

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
      const minData = await changeNowService.getMinAmount(
        fromCurrency.ticker,
        toCurrency.ticker
      );
      setMinAmount(minData.minAmount);

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
        setLastUpdated(new Date());

        if (estimate.warningMessage) {
          toast({
            title: "Notice",
            description: estimate.warningMessage,
          });
        }
      } else {
        setToAmount("");
        setExchangeRate(null);
        setLastUpdated(null);
      }
    } catch (error: any) {
      console.error("Rate calculation error:", error);
      
      const errorMessage = error?.message || "";
      if (errorMessage.includes("pair_is_inactive") || errorMessage.includes("pair is inactive")) {
        setPairError(`This pair is temporarily unavailable`);
        setPairUnavailable(true);
      } else if (!errorMessage.includes("fixed_rate_not_enabled")) {
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

  // Debounced rate calculation
  useEffect(() => {
    const debounce = setTimeout(calculateRate, 500);
    return () => clearTimeout(debounce);
  }, [calculateRate]);

  // Auto-refresh countdown and rate refresh every 30 seconds
  useEffect(() => {
    if (!exchangeRate || isLoading || pairUnavailable) return;
    
    const countdownInterval = setInterval(() => {
      setAutoRefreshCountdown(prev => {
        if (prev <= 1) {
          calculateRate();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [exchangeRate, isLoading, pairUnavailable, calculateRate]);

  // Reset countdown when rate is manually refreshed or currencies change
  useEffect(() => {
    setAutoRefreshCountdown(30);
  }, [fromCurrency.ticker, toCurrency.ticker, fromAmount]);

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

  // Skeleton loading state
  if (currenciesLoading) {
    return (
      <Card className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <div className="p-4 sm:p-5 pt-2 border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="relative h-0">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="p-4 sm:p-5 pt-0">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <CardContent className="p-0">
        {/* Header with favorite button */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">You send</span>
          <button
            onClick={handleToggleFavorite}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title={isPairFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star 
              className={cn(
                "w-4 h-4 transition-colors",
                isPairFavorite ? "fill-warning text-warning" : "text-muted-foreground hover:text-warning"
              )} 
            />
          </button>
        </div>

        {/* From Section */}
        <div className="p-4 sm:p-5 pt-2 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <CurrencySelector
              value={fromCurrency}
              onChange={setFromCurrency}
              excludeTicker={toCurrency.ticker}
              currencies={currencies}
              isLoading={currenciesLoading}
            />
            <Input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0"
              className="border-0 bg-transparent text-right text-2xl sm:text-3xl font-medium focus-visible:ring-0 p-0 h-auto flex-1 min-w-0"
            />
          </div>
          {minAmount > 0 && parseFloat(fromAmount) < minAmount && (
            <p className="text-xs text-warning mt-2">
              Min: {minAmount} {fromCurrency.ticker.toUpperCase()}
            </p>
          )}
        </div>

        {/* Swap Button */}
        <div className="relative h-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapCurrencies}
              className="rounded-full h-10 w-10 bg-background border-2 border-border hover:bg-secondary shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4 rotate-90" />
            </Button>
          </div>
        </div>

        {/* To Section */}
        <div className={`p-4 sm:p-5 ${pairUnavailable ? 'bg-warning/5' : ''}`}>
          <div className="flex items-center justify-between gap-4">
            <CurrencySelector
              value={toCurrency}
              onChange={setToCurrency}
              excludeTicker={fromCurrency.ticker}
              currencies={currencies}
              isLoading={currenciesLoading}
            />
            <div className="flex-1 text-right text-2xl sm:text-3xl font-medium font-mono min-w-0 truncate">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground ml-auto" />
              ) : pairUnavailable ? (
                <span className="text-warning text-lg flex items-center justify-end gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Unavailable</span>
                </span>
              ) : toAmount ? (
                parseFloat(toAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </div>
          </div>
        </div>

        {/* Rate Info */}
        {exchangeRate && !isLoading && !pairUnavailable && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>
                1 {fromCurrency.ticker.toUpperCase()} = {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency.ticker.toUpperCase()}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex">
                    <Info className="w-3.5 h-3.5 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rate may vary slightly during the exchange</p>
                </TooltipContent>
              </Tooltip>
              <button
                onClick={calculateRate}
                disabled={isLoading}
                className="p-1 hover:bg-secondary rounded transition-colors"
                title="Refresh rate"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>
            </div>
            {lastUpdated && (
              <p className="text-center text-xs text-muted-foreground/60 mt-1">
                Auto-refresh in {autoRefreshCountdown}s
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {pairUnavailable && (
          <div className="px-4 sm:px-5 pb-4">
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{pairError || "This trading pair is not available."}</span>
              <button
                onClick={calculateRate}
                className="p-1.5 hover:bg-warning/20 rounded transition-colors shrink-0"
                title="Retry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Currencies Error Display */}
        {currenciesError && (
          <div className="px-4 sm:px-5 pb-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{currenciesError}</span>
              <button
                onClick={fetchCurrencies}
                className="p-1.5 hover:bg-secondary rounded transition-colors shrink-0"
                title="Retry loading currencies"
              >
                <RefreshCw className={cn("w-4 h-4", currenciesLoading && "animate-spin")} />
              </button>
            </div>
          </div>
        )}

        {/* Convert Button */}
        <div className="p-4 sm:p-5 pt-0">
          <Button
            size="lg"
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-xl"
            onClick={handleExchange}
            disabled={isLoading || !toAmount || pairUnavailable}
          >
            {pairUnavailable ? "Pair Unavailable" : "Convert"}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              2-20 min
            </span>
            <span>•</span>
            <span>No registration</span>
            <span>•</span>
            <span>All fees included</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
