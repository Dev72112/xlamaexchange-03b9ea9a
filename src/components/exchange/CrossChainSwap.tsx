import { useState, useEffect } from 'react';
import { ArrowDown, Clock, Fuel, AlertTriangle, Loader2, ArrowRightLeft, Wallet, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChainSelector } from './ChainSelector';
import { DexTokenSelector } from './DexTokenSelector';
import { LiFiBridgeProgress } from './LiFiBridgeProgress';
import { Chain, getPrimaryChain, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';
import { lifiService } from '@/services/lifi';
import { useDexTokens } from '@/hooks/useDexTokens';
import { useLiFiQuote } from '@/hooks/useLiFiQuote';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useLiFiSwapExecution } from '@/hooks/useLiFiSwapExecution';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SlippageSettings } from './SlippageSettings';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface CrossChainSwapProps {
  className?: string;
}

// Note: ChainSelector will show all chains, but Li.Fi only supports a subset
// Quote errors will inform users when a chain isn't supported

export function CrossChainSwap({ className }: CrossChainSwapProps) {
  const { toast } = useToast();
  const { isConnected, activeAddress, getEvmProvider } = useMultiWallet();

  // Chain states - default to Ethereum and Polygon (both Li.Fi supported)
  const [fromChain, setFromChain] = useState<Chain>(
    SUPPORTED_CHAINS.find(c => c.chainIndex === '1') || getPrimaryChain()
  );
  const [toChain, setToChain] = useState<Chain>(
    SUPPORTED_CHAINS.find(c => c.chainIndex === '137') || SUPPORTED_CHAINS[1]
  );

  // Token states - using OkxToken type for compatibility with DexTokenSelector
  const [fromToken, setFromToken] = useState<OkxToken | null>(null);
  const [toToken, setToToken] = useState<OkxToken | null>(null);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('1.0');
  const [showBridgeProgress, setShowBridgeProgress] = useState(false);

  // Load tokens for both chains (using OKX tokens for display, Li.Fi for quotes)
  const { tokens: fromTokens, nativeToken: fromNative, isLoading: fromTokensLoading } = useDexTokens(fromChain);
  const { tokens: toTokens, nativeToken: toNative, isLoading: toTokensLoading } = useDexTokens(toChain);

  // Get balance for from token
  const { formatted: formattedBalance, loading: balanceLoading } = useTokenBalance(fromToken, fromChain);

  // Li.Fi bridge execution
  const { currentTx, executeSwap, resetCurrentTx } = useLiFiSwapExecution();

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

  // Li.Fi cross-chain quote - needs wallet connection for quotes
  const {
    quote,
    formattedOutputAmount,
    exchangeRate,
    estimatedTimeMinutes,
    isLoading: quoteLoading,
    isRetrying,
    error: quoteError,
    refetch: refetchQuote,
  } = useLiFiQuote({
    fromChain,
    toChain,
    fromToken: fromToken ? {
      tokenContractAddress: fromToken.tokenContractAddress,
      tokenSymbol: fromToken.tokenSymbol,
      decimals: fromToken.decimals,
      tokenLogoUrl: fromToken.tokenLogoUrl,
    } : null,
    toToken: toToken ? {
      tokenContractAddress: toToken.tokenContractAddress,
      tokenSymbol: toToken.tokenSymbol,
      decimals: toToken.decimals,
      tokenLogoUrl: toToken.tokenLogoUrl,
    } : null,
    amount: fromAmount,
    slippage,
    userAddress: activeAddress || undefined,
    enabled: fromChain.chainIndex !== toChain.chainIndex && 
             !!fromToken && !!toToken && 
             parseFloat(fromAmount) > 0 &&
             lifiService.isChainSupported(fromChain.chainIndex) &&
             lifiService.isChainSupported(toChain.chainIndex),
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

  const handleMaxClick = () => {
    if (formattedBalance) {
      const isNative = fromToken?.tokenContractAddress === NATIVE_TOKEN_ADDRESS || 
                       fromToken?.tokenContractAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const maxAmount = isNative 
        ? Math.max(0, parseFloat(formattedBalance) - 0.01).toString()
        : formattedBalance;
      setFromAmount(maxAmount);
    }
  };

  const handleBridge = async () => {
    if (!fromToken || !toToken || !activeAddress || !quote) return;

    try {
      setShowBridgeProgress(true);
      
      // Get EVM provider for sending transactions
      const provider = await getEvmProvider();
      
      await executeSwap(
        {
          fromChain,
          toChain,
          quote,
          userAddress: activeAddress,
        },
        async (txData) => {
          if (!provider) throw new Error('No wallet provider');
          const hash = await provider.request({
            method: 'eth_sendTransaction',
            params: [txData],
          });
          if (!hash) throw new Error('Transaction rejected');
          return hash;
        }
      );

      toast({
        title: "Bridge Initiated! 🌉",
        description: `Bridging ${fromAmount} ${fromToken.tokenSymbol} to ${toChain.name}`,
      });
    } catch (error: any) {
      console.error('Bridge error:', error);
      toast({
        title: "Bridge Failed",
        description: error?.message || "Failed to initiate bridge",
        variant: "destructive",
      });
    }
  };

  // Check if user has sufficient balance
  const hasInsufficientBalance = isConnected && formattedBalance && fromAmount && 
    parseFloat(fromAmount) > parseFloat(formattedBalance);

  // Check if chains are supported by Li.Fi
  const fromChainSupported = lifiService.isChainSupported(fromChain.chainIndex);
  const toChainSupported = lifiService.isChainSupported(toChain.chainIndex);

  const canSwap = isConnected && fromToken && toToken && 
    parseFloat(fromAmount) > 0 && quote && !quoteLoading && !hasInsufficientBalance &&
    fromChainSupported && toChainSupported;

  const getButtonText = () => {
    if (!isConnected) {
      return (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet to Bridge
        </>
      );
    }
    if (!fromChainSupported || !toChainSupported) {
      return 'Chain Not Supported';
    }
    if (quoteLoading || isRetrying) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isRetrying ? 'Retrying...' : 'Getting Quote...'}
        </>
      );
    }
    if (fromChain.chainIndex === toChain.chainIndex) {
      return 'Select Different Chains';
    }
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      return 'Enter Amount';
    }
    if (hasInsufficientBalance) {
      return 'Insufficient Balance';
    }
    if (!quote) {
      return 'No Route Available';
    }
    return `Bridge ${fromToken?.tokenSymbol} to ${toChain.name}`;
  };

  return (
    <>
      <Card className={cn("bg-card/50 backdrop-blur-sm border-border", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Cross-Chain Bridge
              <Badge variant="secondary" className="text-xs">Li.Fi</Badge>
            </CardTitle>
            <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
          </div>
          <p className="text-sm text-muted-foreground">
            Bridge tokens across blockchains with best rates from 20+ bridges
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
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className={cn(
                    "text-right font-mono text-lg pr-14",
                    hasInsufficientBalance && "border-destructive"
                  )}
                />
                {isConnected && formattedBalance && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxClick}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs px-2"
                  >
                    MAX
                  </Button>
                )}
              </div>
            </div>
            {/* Balance Display */}
            {isConnected && fromToken && (
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className="text-muted-foreground">Balance:</span>
                {balanceLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : (
                  <span className={cn(
                    "font-mono",
                    hasInsufficientBalance && "text-destructive"
                  )}>
                    {formattedBalance ? parseFloat(formattedBalance).toFixed(4) : '0'} {fromToken.tokenSymbol}
                    {hasInsufficientBalance && <span className="ml-1">(Insufficient)</span>}
                  </span>
                )}
              </div>
            )}
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
              {quote.estimatedGasCostUSD && parseFloat(quote.estimatedGasCostUSD) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Fuel className="w-3 h-3" /> Gas Cost
                  </span>
                  <span className="font-mono">${quote.estimatedGasCostUSD}</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {quoteError && !isRetrying && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{quoteError}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetchQuote}
                className="h-7 text-xs"
              >
                Retry
              </Button>
            </div>
          )}
          
          {/* Retrying state */}
          {isRetrying && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>Finding best bridge route...</span>
            </div>
          )}

          {/* Same chain warning */}
          {fromChain.chainIndex === toChain.chainIndex && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Select different chains for cross-chain swap. Use DEX mode for same-chain swaps.</span>
            </div>
          )}

          {/* Info when not connected */}
          {!isConnected && fromAmount && parseFloat(fromAmount) > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Connect your wallet to get quotes and execute bridges</span>
            </div>
          )}

          {/* Swap Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!canSwap}
            onClick={handleBridge}
          >
            {getButtonText()}
          </Button>
        </CardContent>
      </Card>

      {/* Bridge Progress Dialog */}
      <Dialog open={showBridgeProgress && !!currentTx} onOpenChange={(open) => {
        setShowBridgeProgress(open);
        if (!open) resetCurrentTx();
      }}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
          {currentTx && (
            <LiFiBridgeProgress 
              transaction={currentTx}
              onClose={() => {
                setShowBridgeProgress(false);
                resetCurrentTx();
                if (currentTx.status === 'completed') {
                  setFromAmount('');
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
