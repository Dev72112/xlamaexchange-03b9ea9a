import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, Clock, Fuel, AlertTriangle, Loader2, ArrowRightLeft, Wallet, Info, Link2Off, Shield, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChainSelector } from './ChainSelector';
import { DexTokenSelector } from './DexTokenSelector';
import { LiFiBridgeProgress } from './LiFiBridgeProgress';
import { BridgeApprovalModal } from './BridgeApprovalModal';
import { RouteComparison } from './RouteComparison';
import { Chain, getPrimaryChain, SUPPORTED_CHAINS, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';
import { lifiService } from '@/services/lifi';
import { useDexTokens } from '@/hooks/useDexTokens';
import { useLiFiQuote } from '@/hooks/useLiFiQuote';
import { useLiFiRoutes } from '@/hooks/useLiFiRoutes';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CrossChainSwapProps {
  className?: string;
}

// Note: ChainSelector will show all chains, but Li.Fi only supports a subset
// Quote errors will inform users when a chain isn't supported

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  return combined.replace(/^0+/, '') || '0';
}

export function CrossChainSwap({ className }: CrossChainSwapProps) {
  const { toast } = useToast();
  const { isConnected, activeAddress, getEvmProvider, evmChainId, switchEvmChain, isOkxConnected, switchChainByIndex } = useMultiWallet();

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
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  
  // Check if wallet is on the correct chain for bridging (EVM only)
  const isOnCorrectChain = !fromChain.isEvm || !evmChainId || evmChainId === fromChain.chainId;
  const needsNetworkSwitch = isConnected && fromChain.isEvm && fromChain.chainId && evmChainId !== fromChain.chainId;
  const [showBridgeProgress, setShowBridgeProgress] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);

  // Load tokens for both chains (using OKX tokens for display, Li.Fi for quotes)
  const { tokens: fromTokens, nativeToken: fromNative, isLoading: fromTokensLoading } = useDexTokens(fromChain);
  const { tokens: toTokens, nativeToken: toNative, isLoading: toTokensLoading } = useDexTokens(toChain);

  // Get balance for from token
  const { formatted: formattedBalance, loading: balanceLoading } = useTokenBalance(fromToken, fromChain);

  // Check if chains are supported by Li.Fi (needed early for routes hook)
  const fromChainSupported = lifiService.isChainSupported(fromChain.chainIndex);
  const toChainSupported = lifiService.isChainSupported(toChain.chainIndex);
  const bothChainsSupported = fromChainSupported && toChainSupported;

  // Li.Fi bridge execution
  const { currentTx, pendingApproval, executeSwap, handleApproval, cancelApproval, resetCurrentTx } = useLiFiSwapExecution();

  // Show approval modal when there's a pending approval
  useEffect(() => {
    if (pendingApproval) {
      setShowApprovalModal(true);
    }
  }, [pendingApproval]);

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

  // Li.Fi cross-chain quote - always enabled when chains are different (for price discovery)
  const {
    quote,
    formattedOutputAmount,
    exchangeRate,
    estimatedTimeMinutes,
    isLoading: quoteLoading,
    isRetrying,
    error: quoteError,
    minimumAmount,
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
    // Always fetch quote when chains are different (for price discovery regardless of balance)
    enabled: fromChain.chainIndex !== toChain.chainIndex && 
             !!fromToken && !!toToken && 
             parseFloat(fromAmount) > 0 &&
             lifiService.isChainSupported(fromChain.chainIndex) &&
             lifiService.isChainSupported(toChain.chainIndex),
  });

  // Get token address normalized for Li.Fi
  const normalizeAddress = (addr: string) => {
    const lower = addr.toLowerCase();
    if (lower === NATIVE_TOKEN_ADDRESS.toLowerCase() || lower === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return '0x0000000000000000000000000000000000000000';
    }
    return addr;
  };

  // Li.Fi routes for comparison
  const fromChainId = lifiService.getChainId(fromChain.chainIndex);
  const toChainId = lifiService.getChainId(toChain.chainIndex);
  
  const {
    routes,
    isLoading: routesLoading,
    selectedRoute,
    selectRoute,
    routePreference,
    setRoutePreference,
  } = useLiFiRoutes({
    fromChainId: fromChainId || 1,
    toChainId: toChainId || 1,
    fromToken: fromToken ? normalizeAddress(fromToken.tokenContractAddress) : '',
    toToken: toToken ? normalizeAddress(toToken.tokenContractAddress) : '',
    fromAmount: fromToken && fromAmount ? 
      toSmallestUnit(fromAmount, parseInt(fromToken.decimals)) : '',
    fromAddress: activeAddress || '0x0000000000000000000000000000000000000001',
    slippage: parseFloat(slippage) / 100,
    enabled: fromChain.chainIndex !== toChain.chainIndex && 
             !!fromToken && !!toToken && 
             parseFloat(fromAmount) > 0 &&
             bothChainsSupported &&
             showRoutes,
  });

  const handleSwapChains = () => {
    const tempChain = fromChain;
    const tempToken = fromToken;
    setFromChain(toChain);
    setToChain(tempChain);
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(formattedOutputAmount || '');
    setShowRoutes(false);
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
      
      // Use selected route if available, otherwise use default quote
      const routeToUse = selectedRoute?.route;
      
      const result = await executeSwap(
        {
          fromChain,
          toChain,
          quote,
          userAddress: activeAddress,
          selectedRoute: routeToUse,
        },
        async (txData) => {
          if (!provider) throw new Error('No wallet provider');
          // Format transaction for eth_sendTransaction - must have from, hex values
          const formattedTx = {
            from: activeAddress,
            to: txData.to,
            data: txData.data,
            value: txData.value.startsWith('0x') ? txData.value : `0x${BigInt(txData.value || 0).toString(16)}`,
            chainId: `0x${txData.chainId.toString(16)}`,
          };
          const hash = await provider.request({
            method: 'eth_sendTransaction',
            params: [formattedTx],
          });
          if (!hash) throw new Error('Transaction rejected');
          return hash;
        }
      );

      // Check if approval is needed
      if (result?.status === 'AWAITING_APPROVAL') {
        // Approval modal will be shown via useEffect
        return;
      }

      const bridgeName = selectedRoute?.bridgeName || quote.bridgeName || 'bridge';
      toast({
        title: "Bridge Initiated! 🌉",
        description: `Bridging ${fromAmount} ${fromToken.tokenSymbol} to ${toChain.name} via ${bridgeName}`,
      });
    } catch (error: any) {
      console.error('Bridge error:', error);
      const errorMessage = error?.message?.toLowerCase() || '';
      
      let title = "Bridge Failed";
      let description = "Failed to initiate bridge. Please try again.";
      
      if (errorMessage.includes('insufficient') || errorMessage.includes('gas')) {
        title = "Insufficient Gas";
        description = "Not enough native tokens for gas fees. Keep some ETH/BNB/MATIC for transaction fees.";
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        title = "Transaction Rejected";
        description = "You rejected the transaction. Try again when ready.";
      } else if (error?.message) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  };

  const handleApprovalConfirm = async (amount: string) => {
    try {
      setIsApproving(true);
      const provider = await getEvmProvider();
      
      await handleApproval(amount, async (txData) => {
        if (!provider) throw new Error('No wallet provider');
        const formattedTx = {
          from: activeAddress,
          to: txData.to,
          data: txData.data,
          value: txData.value.startsWith('0x') ? txData.value : `0x${BigInt(txData.value || 0).toString(16)}`,
          chainId: `0x${txData.chainId.toString(16)}`,
        };
        const hash = await provider.request({
          method: 'eth_sendTransaction',
          params: [formattedTx],
        });
        if (!hash) throw new Error('Approval rejected');
        return hash;
      });

      setShowApprovalModal(false);
      setIsApproving(false);

      toast({
        title: "Approval Successful! ✅",
        description: `${fromToken?.tokenSymbol} approved. Now initiating bridge...`,
      });

      // Re-execute the swap after approval
      if (fromToken && toToken && activeAddress && quote) {
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
            const formattedTx = {
              from: activeAddress,
              to: txData.to,
              data: txData.data,
              value: txData.value.startsWith('0x') ? txData.value : `0x${BigInt(txData.value || 0).toString(16)}`,
              chainId: `0x${txData.chainId.toString(16)}`,
            };
            const hash = await provider.request({
              method: 'eth_sendTransaction',
              params: [formattedTx],
            });
            if (!hash) throw new Error('Transaction rejected');
            return hash;
          }
        );

        toast({
          title: "Bridge Initiated! 🌉",
          description: `Bridging ${fromAmount} ${fromToken.tokenSymbol} to ${toChain.name}`,
        });
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      setIsApproving(false);
      toast({
        title: "Approval Failed",
        description: error?.message || "Failed to approve token",
        variant: "destructive",
      });
    }
  };

  const handleApprovalCancel = () => {
    cancelApproval();
    setShowApprovalModal(false);
    setShowBridgeProgress(false);
  };

  // Get list of supported chain names for messaging
  const supportedChainNames = useMemo(() => {
    return SUPPORTED_CHAINS
      .filter(c => lifiService.isChainSupported(c.chainIndex))
      .map(c => c.name)
      .slice(0, 8); // Show first 8 for brevity
  }, []);

  // Check if user has sufficient balance
  const hasInsufficientBalance = isConnected && formattedBalance && fromAmount && 
    parseFloat(fromAmount) > parseFloat(formattedBalance);

  // Check if amount is below minimum
  const isBelowMinimum = minimumAmount && parseFloat(fromAmount) < parseFloat(minimumAmount);

  const canSwap = isConnected && fromToken && toToken && 
    parseFloat(fromAmount) > 0 && quote && !quoteLoading && !hasInsufficientBalance &&
    !isBelowMinimum && bothChainsSupported && isOnCorrectChain;

  // Show quote error but not when it's just a minimum amount issue (we handle that separately)
  const shouldShowQuoteError = quoteError && !isRetrying && !minimumAmount;

  // Handle network switch for bridge
  const handleNetworkSwitch = async () => {
    if (!fromChain.isEvm || !fromChain.chainId) return;
    
    try {
      setIsSwitchingNetwork(true);
      
      if (isOkxConnected) {
        await switchChainByIndex(fromChain.chainIndex);
      } else {
        await switchEvmChain(fromChain.chainId);
      }
      
      toast({
        title: 'Network Switched',
        description: `Now connected to ${fromChain.name}`,
      });
    } catch (err: any) {
      if (err?.code !== 4001) {
        toast({
          title: 'Switch Failed',
          description: `Please switch to ${fromChain.name} in your wallet`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const getButtonText = () => {
    if (!isConnected) {
      return (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet to Bridge
        </>
      );
    }
    if (needsNetworkSwitch) {
      return isSwitchingNetwork ? 'Switching Network...' : `Switch to ${fromChain.name}`;
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
    if (isBelowMinimum) {
      return `Minimum: ${minimumAmount} ${fromToken?.tokenSymbol}`;
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
              {/* Show selected route info if different from default */}
              {selectedRoute && showRoutes && (
                <div className="flex items-center justify-between text-sm pb-2 border-b border-border/50 mb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RouteIcon className="w-3 h-3" /> Selected Route
                  </span>
                  <Badge variant="default" className="text-xs">
                    {selectedRoute.bridgeName}
                  </Badge>
                </div>
              )}
              
              {exchangeRate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono">
                    1 {fromToken?.tokenSymbol} = {exchangeRate.toFixed(6)} {toToken?.tokenSymbol}
                  </span>
                </div>
              )}
              {(selectedRoute?.bridgeName || quote.bridgeName) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bridge</span>
                  <Badge variant="secondary">{selectedRoute?.bridgeName || quote.bridgeName}</Badge>
                </div>
              )}
              {(selectedRoute || estimatedTimeMinutes) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Est. Time
                  </span>
                  <span>~{selectedRoute 
                    ? Math.ceil(selectedRoute.estimatedTimeSeconds / 60) 
                    : estimatedTimeMinutes} min</span>
                </div>
              )}
              {(selectedRoute?.totalFeesUSD || (quote.estimatedGasCostUSD && parseFloat(quote.estimatedGasCostUSD) > 0)) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Fuel className="w-3 h-3" /> Total Fees
                  </span>
                  <span className="font-mono">${selectedRoute?.totalFeesUSD || quote.estimatedGasCostUSD}</span>
                </div>
              )}
              
              {/* Compare Routes Button */}
              {bothChainsSupported && fromToken && toToken && parseFloat(fromAmount) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRoutes(!showRoutes)}
                  className="w-full mt-2 text-xs"
                >
                  <RouteIcon className="w-3 h-3 mr-1" />
                  {showRoutes ? 'Hide Routes' : 'Compare Routes'}
                </Button>
              )}
            </div>
          )}

          {/* Route Comparison */}
          {showRoutes && toToken && (
            <RouteComparison
              routes={routes}
              selectedRoute={selectedRoute}
              onSelectRoute={selectRoute}
              isLoading={routesLoading}
              toTokenSymbol={toToken.tokenSymbol}
              toTokenDecimals={parseInt(toToken.decimals)}
              routePreference={routePreference}
              onRoutePreferenceChange={setRoutePreference}
            />
          )}

          {/* Error - Only show if not insufficient balance */}
          {shouldShowQuoteError && (
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

          {/* Unsupported chain warning with specific alternatives */}
          {!bothChainsSupported && fromChain.chainIndex !== toChain.chainIndex && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <Link2Off className="w-4 h-4 flex-shrink-0" />
                <span>
                  {!fromChainSupported && !toChainSupported 
                    ? `${fromChain.name} and ${toChain.name} are not supported`
                    : !fromChainSupported 
                      ? `${fromChain.name} is not supported for bridging`
                      : `${toChain.name} is not supported for bridging`
                  }
                </span>
              </div>
              {/* Show specific alternatives for non-EVM chains */}
              {(() => {
                const unsupportedChain = !fromChainSupported ? fromChain : toChain;
                const warning = lifiService.getLimitedSupportWarning(unsupportedChain.chainIndex);
                if (warning) {
                  return (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {warning}
                    </p>
                  );
                }
                // Fallback for completely unsupported chains (Tron, Sui, TON)
                const chainName = unsupportedChain.name.toLowerCase();
                if (chainName.includes('tron')) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      💡 TRON is not supported by Li.Fi. Use <strong>ChangeNow</strong> (Instant Swap mode) for USDT-TRC20 or native TRX bridges.
                    </p>
                  );
                }
                if (chainName.includes('sui')) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      💡 Sui is not supported by Li.Fi. Try <strong>Wormhole</strong> or <strong>native Sui bridges</strong> for cross-chain transfers.
                    </p>
                  );
                }
                if (chainName.includes('ton')) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      💡 TON is not supported by Li.Fi. Use <strong>Tonkeeper's built-in bridge</strong> or native TON bridges for cross-chain transfers.
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-muted-foreground">
                    Supported chains: {supportedChainNames.join(', ')}
                    {supportedChainNames.length < SUPPORTED_CHAINS.filter(c => lifiService.isChainSupported(c.chainIndex)).length && ' and more'}
                  </p>
                );
              })()}
            </div>
          )}

          {/* Minimum amount warning */}
          {minimumAmount && isBelowMinimum && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-sm text-warning">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                Minimum bridge amount: <strong>{minimumAmount} {fromToken?.tokenSymbol}</strong>
              </span>
            </div>
          )}

          {/* Insufficient balance warning - but still show quote info */}
          {hasInsufficientBalance && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Insufficient {fromToken?.tokenSymbol} balance. You have {formattedBalance ? parseFloat(formattedBalance).toFixed(4) : '0'} but need {fromAmount}.
              </span>
            </div>
          )}

          {/* Quote preview when not connected */}
          {!isConnected && quote && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4 flex-shrink-0" />
              <span>Connect wallet to execute this bridge</span>
            </div>
          )}

          {/* Network switch prompt */}
          {needsNetworkSwitch && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-between text-sm text-warning">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Switch to {fromChain.name} to bridge</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={needsNetworkSwitch ? isSwitchingNetwork : !canSwap}
            onClick={needsNetworkSwitch ? handleNetworkSwitch : handleBridge}
          >
            {getButtonText()}
          </Button>
        </CardContent>
      </Card>

      {/* Bridge Progress Dialog */}
      <Dialog open={showBridgeProgress && !!currentTx && !pendingApproval} onOpenChange={(open) => {
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

      {/* Token Approval Dialog */}
      <Dialog open={showApprovalModal && !!pendingApproval} onOpenChange={(open) => {
        if (!open) handleApprovalCancel();
      }}>
        <DialogContent className="sm:max-w-md">
          {pendingApproval && (
            <BridgeApprovalModal
              approvalInfo={pendingApproval}
              onConfirm={handleApprovalConfirm}
              onCancel={handleApprovalCancel}
              isLoading={isApproving}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
