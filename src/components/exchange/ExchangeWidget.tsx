import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, Clock, Info, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencySelector } from "./CurrencySelector";
import { Currency, popularCurrencies } from "@/data/currencies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExchangeForm } from "./ExchangeForm";
import { changeNowService } from "@/services/changenow";

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

  // Fetch available currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
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
        
        const btc = mappedCurrencies.find(c => c.ticker === 'btc');
        const eth = mappedCurrencies.find(c => c.ticker === 'eth');
        if (btc) setFromCurrency(btc);
        if (eth) setToCurrency(eth);
        
        console.log(`Loaded ${mappedCurrencies.length} currencies from ChangeNow`);
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
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
    <Card className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <CardContent className="p-0">
        {/* From Section */}
        <div className="p-4 sm:p-5 border-b border-border">
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
            <div className="text-center text-sm text-muted-foreground">
              1 {fromCurrency.ticker.toUpperCase()} = {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toCurrency.ticker.toUpperCase()}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 inline ml-1.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rate may vary slightly during the exchange</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Error Display */}
        {pairUnavailable && (
          <div className="px-4 sm:px-5 pb-4">
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pairError || "This trading pair is not available."}</span>
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
