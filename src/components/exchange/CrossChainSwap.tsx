import { useState, useEffect, useCallback } from 'react';
import { ArrowDown, Clock, Fuel, AlertTriangle, Loader2, ArrowRightLeft, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChainSelector } from './ChainSelector';
import { DexTokenSelector } from './DexTokenSelector';
import { Chain, getPrimaryChain, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';
import { useDexTokens } from '@/hooks/useDexTokens';
import { useCrossChainQuote } from '@/hooks/useCrossChainQuote';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SlippageSettings } from './SlippageSettings';

interface CrossChainSwapProps {
  className?: string;
}

export function CrossChainSwap({ className }: CrossChainSwapProps) {
  const { toast } = useToast();
  const { isConnected, activeAddress } = useMultiWallet();

  // Chain states
  const [fromChain, setFromChain] = useState<Chain>(getPrimaryChain());
  const [toChain, setToChain] = useState<Chain>(SUPPORTED_CHAINS.find(c => c.chainIndex === '1') || SUPPORTED_CHAINS[1]);

  // Token states
  const [fromToken, setFromToken] = useState<OkxToken | null>(null);
  const [toToken, setToToken] = useState<OkxToken | null>(null);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('1.0');

  // Load tokens for both chains
  const { tokens: fromTokens, nativeToken: fromNative, isLoading: fromTokensLoading } = useDexTokens(fromChain);
  const { tokens: toTokens, nativeToken: toNative, isLoading: toTokensLoading } = useDexTokens(toChain);

  // Set default tokens when loaded
  useEffect(() => {
    if (fromTokens.length > 0 && fromNative && !fromToken) {
      setFromToken(fromNative);
    }
  }, [fromTokens, fromNative, fromToken]);

  useEffect(() => {
    if (toTokens.length > 0 && toNative && !toToken) {
      const usdc = toTokens.find(t => t.tokenSymbol.toUpperCase() === 'USDC');
      setToToken(usdc || toNative);
    }
  }, [toTokens, toNative, toToken]);

  // Reset tokens when chains change
  useEffect(() => {
    setFromToken(null);
  }, [fromChain.chainIndex]);

  useEffect(() => {
    setToToken(null);
  }, [toChain.chainIndex]);

  // Cross-chain quote
  const {
    quote,
    formattedOutputAmount,
    exchangeRate,
    estimatedTimeMinutes,
    isLoading: quoteLoading,
    error: quoteError,
  } = useCrossChainQuote({
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount: fromAmount,
    slippage,
    userAddress: activeAddress || undefined,
    enabled: fromChain.chainIndex !== toChain.chainIndex,
  });

  const handleSwapChains = () => {
    const tempChain = fromChain;
    const tempToken = fromToken;
    setFromChain(toChain);
    setToChain(tempChain);
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(formattedOutputAmount || '');
  };

  const formatPrice = (amount: string, decimals: string = '18') => {
    const value = parseFloat(amount) / Math.pow(10, parseInt(decimals));
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.0001) return value.toFixed(6);
    return value.toFixed(8);
  };

  const canSwap = isConnected && fromToken && toToken && parseFloat(fromAmount) > 0 && quote && !quoteLoading;

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Cross-Chain Swap
          </CardTitle>
          <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
        </div>
        <p className="text-sm text-muted-foreground">
          Bridge and swap tokens across different blockchains
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">From</label>
            <ChainSelector
              selectedChain={fromChain}
              onChainSelect={setFromChain}
            />
          </div>
          <div className="flex gap-2">
            <DexTokenSelector
              tokens={fromTokens}
              value={fromToken}
              onChange={setFromToken}
              nativeToken={fromNative}
              isLoading={fromTokensLoading}
              chain={fromChain}
            />
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="text-right font-mono text-lg"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwapChains}
            className="rounded-full bg-secondary/50 hover:bg-secondary"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>

        {/* To Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">To</label>
            <ChainSelector
              selectedChain={toChain}
              onChainSelect={setToChain}
            />
          </div>
          <div className="flex gap-2">
            <DexTokenSelector
              tokens={toTokens}
              value={toToken}
              onChange={setToToken}
              nativeToken={toNative}
              isLoading={toTokensLoading}
              chain={toChain}
            />
            <Input
              type="text"
              placeholder="0.0"
              value={quoteLoading ? '...' : formattedOutputAmount || '0.0'}
              readOnly
              className="text-right font-mono text-lg bg-muted/30"
            />
          </div>
        </div>

        {/* Quote Info */}
        {quote && !quoteError && (
          <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
            {exchangeRate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-mono">
                  1 {fromToken?.tokenSymbol} = {exchangeRate.toFixed(6)} {toToken?.tokenSymbol}
                </span>
              </div>
            )}
            {quote.bridgeName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bridge</span>
                <Badge variant="secondary">{quote.bridgeName}</Badge>
              </div>
            )}
            {estimatedTimeMinutes && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Est. Time
                </span>
                <span>~{estimatedTimeMinutes} min</span>
              </div>
            )}
            {quote.bridgeFee && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fuel className="w-3 h-3" /> Bridge Fee
                </span>
                <span className="font-mono">{formatPrice(quote.bridgeFee)} {fromToken?.tokenSymbol}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {quoteError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}

        {/* Same chain warning */}
        {fromChain.chainIndex === toChain.chainIndex && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Select different chains for cross-chain swap. Use DEX mode for same-chain swaps.</span>
          </div>
        )}

        {/* Swap Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!canSwap}
        >
          {!isConnected ? (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet to Bridge
            </>
          ) : quoteLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Quote...
            </>
          ) : fromChain.chainIndex === toChain.chainIndex ? (
            'Select Different Chains'
          ) : !quote ? (
            'Enter Amount'
          ) : (
            <>
              Bridge {fromToken?.tokenSymbol} to {toChain.name}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
