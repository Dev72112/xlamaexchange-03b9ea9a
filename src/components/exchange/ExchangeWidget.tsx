import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, Clock, Info, Loader2, AlertTriangle, Star, RefreshCw, Lock, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencySelector } from "./CurrencySelector";
import { DexTokenSelector } from "./DexTokenSelector";
import { Currency, popularCurrencies } from "@/data/currencies";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ExchangeForm } from "./ExchangeForm";
import { changeNowService } from "@/services/changenow";
import { useFavoritePairs } from "@/hooks/useFavoritePairs";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ModeToggle, ExchangeMode } from "./ModeToggle";
import { ChainSelector } from "./ChainSelector";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { Chain, getPrimaryChain, NATIVE_TOKEN_ADDRESS } from "@/data/chains";
import { OkxToken } from "@/services/okxdex";
import { useDexTokens } from "@/hooks/useDexTokens";
import { useDexQuote } from "@/hooks/useDexQuote";
import { useDexSwap } from "@/hooks/useDexSwap";
import { SlippageSettings } from "./SlippageSettings";
import { DexQuoteInfo } from "./DexQuoteInfo";
import { DexSwapProgress } from "./DexSwapProgress";
import { SwapBridgeToggle, SwapMode } from "./SwapBridgeToggle";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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

interface ExchangeWidgetProps {
  onModeChange?: (mode: ExchangeMode) => void;
}

export function ExchangeWidget({ onModeChange }: ExchangeWidgetProps = {}) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavoritePairs();
  const { isConnected, address, chainId, switchChain } = useWallet();
  
  // Exchange mode state
  const [exchangeMode, setExchangeMode] = useState<ExchangeMode>('instant');
  const [swapMode, setSwapMode] = useState<SwapMode>('swap');
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());
  
  // Common state
  const [currencies, setCurrencies] = useState<Currency[]>(popularCurrencies);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [fromCurrency, setFromCurrency] = useState<Currency>(popularCurrencies[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(popularCurrencies[1]);
  const [fromAmount, setFromAmount] = useState<string>("1");
  const [toAmount, setToAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateType, setRateType] = useState<"standard" | "fixed">("fixed");
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [minAmount, setMinAmount] = useState<number>(0);
  const [rateId, setRateId] = useState<string | undefined>();
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairUnavailable, setPairUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currenciesError, setCurrenciesError] = useState<string | null>(null);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30);
  
  // DEX-specific state
  const [slippage, setSlippage] = useState<string>("0.5");
  const [fromDexToken, setFromDexToken] = useState<OkxToken | null>(null);
  const [toDexToken, setToDexToken] = useState<OkxToken | null>(null);
  const [showSwapProgress, setShowSwapProgress] = useState(false);
  
  // DEX hooks
  const { tokens: dexTokens, nativeToken, isLoading: tokensLoading, refetch: refetchTokens } = useDexTokens(
    exchangeMode === 'dex' ? selectedChain : null
  );
  
  const { 
    quote: dexQuote, 
    formattedOutputAmount: dexOutputAmount,
    exchangeRate: dexExchangeRate,
    isLoading: quoteLoading, 
    error: quoteError,
    lastUpdated: quoteLastUpdated,
    refetch: refetchQuote,
  } = useDexQuote({
    chain: selectedChain,
    fromToken: fromDexToken,
    toToken: toDexToken,
    amount: fromAmount,
    slippage,
    enabled: exchangeMode === 'dex' && isConnected && !!fromDexToken && !!toDexToken,
  });

  const { 
    step: swapStep, 
    txHash, 
    error: swapError, 
    isLoading: swapLoading, 
    executeSwap, 
    reset: resetSwap 
  } = useDexSwap();
  
  // Check if wallet is on correct chain for DEX mode
  const isOnCorrectChain = chainId === selectedChain.chainId;

  // Set default DEX tokens when tokens load
  useEffect(() => {
    if (exchangeMode === 'dex' && dexTokens.length > 0) {
      if (!fromDexToken && nativeToken) {
        setFromDexToken(nativeToken);
      }
      if (!toDexToken) {
        const usdt = dexTokens.find(t => t.tokenSymbol.toUpperCase() === 'USDT');
        const usdc = dexTokens.find(t => t.tokenSymbol.toUpperCase() === 'USDC');
        setToDexToken(usdt || usdc || dexTokens[0] || null);
      }
    }
  }, [exchangeMode, dexTokens, nativeToken, fromDexToken, toDexToken]);

  // Reset DEX tokens when chain changes
  useEffect(() => {
    setFromDexToken(null);
    setToDexToken(null);
  }, [selectedChain.chainIndex]);

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
    if (exchangeMode === 'dex') return; // DEX uses useDexQuote hook
    
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
  }, [fromAmount, fromCurrency.ticker, toCurrency.ticker, rateType, toast, exchangeMode]);

  // Debounced rate calculation for instant mode
  useEffect(() => {
    if (exchangeMode === 'instant') {
      const debounce = setTimeout(calculateRate, 500);
      return () => clearTimeout(debounce);
    }
  }, [calculateRate, exchangeMode]);

  // Auto-refresh countdown and rate refresh every 30 seconds
  useEffect(() => {
    const hasRate = exchangeMode === 'instant' ? exchangeRate : dexExchangeRate;
    const loading = exchangeMode === 'instant' ? isLoading : quoteLoading;
    
    if (!hasRate || loading || pairUnavailable) return;
    
    const countdownInterval = setInterval(() => {
      setAutoRefreshCountdown(prev => {
        if (prev <= 1) {
          if (exchangeMode === 'instant') {
            calculateRate();
          } else {
            refetchQuote();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [exchangeMode, exchangeRate, dexExchangeRate, isLoading, quoteLoading, pairUnavailable, calculateRate, refetchQuote]);

  // Reset countdown when rate is manually refreshed or currencies change
  useEffect(() => {
    setAutoRefreshCountdown(30);
  }, [fromCurrency.ticker, toCurrency.ticker, fromAmount, fromDexToken?.tokenContractAddress, toDexToken?.tokenContractAddress]);

  const handleSwapCurrencies = () => {
    if (exchangeMode === 'instant') {
      const tempCurrency = fromCurrency;
      setFromCurrency(toCurrency);
      setToCurrency(tempCurrency);
      setFromAmount(toAmount);
    } else {
      const tempToken = fromDexToken;
      setFromDexToken(toDexToken);
      setToDexToken(tempToken);
      setFromAmount(dexOutputAmount || "1");
    }
  };

  const handleExchange = () => {
    if (exchangeMode === 'instant') {
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
    } else {
      // DEX swap
      if (!isConnected) {
        toast({
          title: "Wallet Required",
          description: "Please connect your wallet to swap",
          variant: "destructive",
        });
        return;
      }
      if (!isOnCorrectChain) {
        toast({
          title: "Wrong Network",
          description: `Please switch to ${selectedChain.name}`,
          variant: "destructive",
        });
        return;
      }
      if (!fromDexToken || !toDexToken) {
        toast({
          title: "Select Tokens",
          description: "Please select both tokens to swap",
          variant: "destructive",
        });
        return;
      }
      
      setShowSwapProgress(true);
      executeSwap({
        chain: selectedChain,
        fromToken: fromDexToken,
        toToken: toDexToken,
        amount: fromAmount,
        slippage,
        onSuccess: (hash) => {
          toast({
            title: "Swap Complete!",
            description: `Transaction: ${hash.slice(0, 10)}...`,
          });
        },
        onError: (err) => {
          toast({
            title: "Swap Failed",
            description: err,
            variant: "destructive",
          });
        },
      });
    }
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
        </CardContent>
      </Card>
    );
  }

  // Determine current output amount and rate based on mode
  const currentOutputAmount = exchangeMode === 'instant' ? toAmount : dexOutputAmount;
  const currentRate = exchangeMode === 'instant' ? exchangeRate : dexExchangeRate;
  const currentLoading = exchangeMode === 'instant' ? isLoading : quoteLoading;
  const currentError = exchangeMode === 'instant' ? pairError : quoteError;

  return (
    <>
      <Card className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Mode Toggle and Wallet Button Header */}
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <ModeToggle mode={exchangeMode} onModeChange={(mode) => { setExchangeMode(mode); onModeChange?.(mode); }} />
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              {exchangeMode === 'dex' && (
                <>
                  <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
                  <ChainSelector 
                    selectedChain={selectedChain} 
                    onChainSelect={setSelectedChain} 
                  />
                </>
              )}
              <WalletButton />
            </div>
          </div>

          {/* DEX Mode: Swap/Bridge Toggle */}
          {exchangeMode === 'dex' && (
            <div className="px-4 sm:px-5 pt-3 flex items-center justify-between">
              <SwapBridgeToggle mode={swapMode} onModeChange={setSwapMode} disabled={swapMode === 'bridge'} />
              {swapMode === 'bridge' && (
                <span className="text-xs text-muted-foreground">Coming soon</span>
              )}
            </div>
          )}
          
          {/* DEX Mode: Wallet connection prompt */}
          {exchangeMode === 'dex' && !isConnected && (
            <div className="mx-4 sm:mx-5 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-foreground">Connect your wallet to use DEX mode</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                DEX swaps require a connected wallet for on-chain transactions
              </p>
            </div>
          )}
          
          {/* DEX Mode: Wrong chain warning */}
          {exchangeMode === 'dex' && isConnected && !isOnCorrectChain && (
            <div className="mx-4 sm:mx-5 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-warning">Switch to {selectedChain.name}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => selectedChain.chainId && switchChain(selectedChain.chainId)}
                  className="h-7 text-xs"
                >
                  Switch Network
                </Button>
              </div>
            </div>
          )}
          
          {/* Header with favorite button */}
          <div className="px-4 sm:px-5 pt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">You send</span>
            {exchangeMode === 'instant' && (
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
            )}
          </div>

          {/* From Section */}
          <div className="p-4 sm:p-5 pt-2 border-b border-border">
            <div className="flex items-center justify-between gap-4">
              {exchangeMode === 'instant' ? (
                <CurrencySelector
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  excludeTicker={toCurrency.ticker}
                  currencies={currencies}
                  isLoading={currenciesLoading}
                />
              ) : (
                <DexTokenSelector
                  value={fromDexToken}
                  onChange={setFromDexToken}
                  tokens={dexTokens}
                  nativeToken={nativeToken}
                  chain={selectedChain}
                  excludeAddress={toDexToken?.tokenContractAddress}
                  isLoading={tokensLoading}
                />
              )}
              <Input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0"
                className="border-0 bg-transparent text-right text-2xl sm:text-3xl font-medium focus-visible:ring-0 p-0 h-auto flex-1 min-w-0"
              />
            </div>
            {exchangeMode === 'instant' && minAmount > 0 && parseFloat(fromAmount) < minAmount && (
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
              {exchangeMode === 'instant' ? (
                <CurrencySelector
                  value={toCurrency}
                  onChange={setToCurrency}
                  excludeTicker={fromCurrency.ticker}
                  currencies={currencies}
                  isLoading={currenciesLoading}
                />
              ) : (
                <DexTokenSelector
                  value={toDexToken}
                  onChange={setToDexToken}
                  tokens={dexTokens}
                  nativeToken={nativeToken}
                  chain={selectedChain}
                  excludeAddress={fromDexToken?.tokenContractAddress}
                  isLoading={tokensLoading}
                />
              )}
              <div className="flex-1 text-right text-2xl sm:text-3xl font-medium font-mono min-w-0 truncate">
                {currentLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground ml-auto" />
                ) : pairUnavailable ? (
                  <span className="text-warning text-lg flex items-center justify-end gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Unavailable</span>
                  </span>
                ) : currentOutputAmount ? (
                  parseFloat(currentOutputAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </div>
            </div>
          </div>

          {/* Rate Info */}
          {currentRate && !currentLoading && !pairUnavailable && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {exchangeMode === 'instant' && rateType === "fixed" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                )}
                <span>
                  1 {exchangeMode === 'instant' ? fromCurrency.ticker.toUpperCase() : fromDexToken?.tokenSymbol || ''} = {currentRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {exchangeMode === 'instant' ? toCurrency.ticker.toUpperCase() : toDexToken?.tokenSymbol || ''}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex">
                      <Info className="w-3.5 h-3.5 cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    {exchangeMode === 'instant' ? (
                      rateType === "fixed" ? (
                        <p className="text-xs">
                          <strong className="text-primary">Fixed rate</strong> - This rate is guaranteed for 10 minutes.
                        </p>
                      ) : (
                        <p className="text-xs">
                          <strong className="text-warning">Floating rate</strong> - Rate may change during the exchange.
                        </p>
                      )
                    ) : (
                      <p className="text-xs">
                        <strong className="text-primary">DEX rate</strong> - Best rate aggregated from multiple DEXs.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
                <button
                  onClick={() => exchangeMode === 'instant' ? calculateRate() : refetchQuote()}
                  disabled={currentLoading}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="Refresh rate"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", currentLoading && "animate-spin")} />
                </button>
              </div>
              {(lastUpdated || quoteLastUpdated) && (
                <p className="text-center text-xs text-muted-foreground/60 mt-1">
                  Auto-refresh in {autoRefreshCountdown}s
                </p>
              )}
            </div>
          )}

          {/* DEX Quote Info */}
          {exchangeMode === 'dex' && dexQuote && !quoteLoading && (
            <div className="px-4 sm:px-5 pb-4">
              <DexQuoteInfo
                quote={dexQuote}
                fromToken={fromDexToken}
                toToken={toDexToken}
                chain={selectedChain}
                isLoading={quoteLoading}
                slippage={slippage}
                inputAmount={fromAmount}
                outputAmount={dexOutputAmount}
              />
            </div>
          )}

          {/* Error Display */}
          {(pairUnavailable || (exchangeMode === 'dex' && quoteError)) && (
            <div className="px-4 sm:px-5 pb-4">
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{currentError || "This trading pair is not available."}</span>
                <button
                  onClick={() => exchangeMode === 'instant' ? calculateRate() : refetchQuote()}
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
              disabled={
                currentLoading || 
                !currentOutputAmount || 
                pairUnavailable ||
                (exchangeMode === 'dex' && (!isConnected || !isOnCorrectChain || swapLoading))
              }
            >
              {exchangeMode === 'dex' && !isConnected ? (
                "Connect Wallet"
              ) : exchangeMode === 'dex' && !isOnCorrectChain ? (
                `Switch to ${selectedChain.name}`
              ) : pairUnavailable ? (
                "Pair Unavailable"
              ) : swapLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Swapping...
                </>
              ) : exchangeMode === 'dex' ? (
                "Swap"
              ) : (
                "Convert"
              )}
            </Button>
          </div>

          {/* Footer Info */}
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <div className="flex flex-col gap-3">
              {/* Rate Type Toggle - Only show in Instant mode */}
              {exchangeMode === 'instant' && (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className={rateType === "standard" ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Floating
                    </span>
                  </div>
                  <Switch
                    checked={rateType === "fixed"}
                    onCheckedChange={(checked) => setRateType(checked ? "fixed" : "standard")}
                    className="data-[state=checked]:bg-primary"
                  />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span className={rateType === "fixed" ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Fixed
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px]">
                      <div className="text-xs space-y-2">
                        <p>
                          <strong className="text-primary">Fixed rate:</strong> Price is locked for 10 minutes.
                        </p>
                        <p>
                          <strong className="text-warning">Floating rate:</strong> Rate follows the market.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              
              {/* DEX mode info */}
              {exchangeMode === 'dex' && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <img 
                    src={selectedChain.icon} 
                    alt={selectedChain.name}
                    className="w-4 h-4 rounded-full" 
                  />
                  <span>Swapping on {selectedChain.name}</span>
                  {selectedChain.isPrimary && (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>
              )}
              
              {/* Footer Info */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {exchangeMode === 'instant' ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      2-20 min
                    </span>
                    <span>•</span>
                    <span>No registration</span>
                    <span>•</span>
                    <span>All fees included</span>
                  </>
                ) : (
                  <>
                    <span>400+ DEXs</span>
                    <span>•</span>
                    <span>Best rates</span>
                    <span>•</span>
                    <span>Slippage: {slippage}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DEX Swap Progress Dialog */}
      <Dialog open={showSwapProgress} onOpenChange={setShowSwapProgress}>
        <DialogContent className="sm:max-w-md">
          <DexSwapProgress
            step={swapStep}
            txHash={txHash}
            error={swapError}
            chain={selectedChain}
            onClose={() => {
              setShowSwapProgress(false);
              resetSwap();
            }}
            onRetry={() => {
              resetSwap();
              handleExchange();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
