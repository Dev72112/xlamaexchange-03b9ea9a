/**
 * Perpetuals Page
 * 
 * Hyperliquid perpetual trading interface with live trading.
 * Mobile-first design with tabs for chart/trade/positions.
 */

import { memo, useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  RefreshCw,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { useHyperliquidMarkets, useHyperliquidOrderbook } from "@/hooks/useHyperliquidMarkets";
import { useHyperliquidAccount } from "@/hooks/useHyperliquidAccount";
import { useHyperliquidWebSocket } from "@/hooks/useHyperliquidWebSocket";
import { useHyperliquidTrading } from "@/hooks/useHyperliquidTrading";
import { useHyperliquidFills } from "@/hooks/useHyperliquidFills";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  BuilderFeeApproval,
  TradeConfirmModal,
  NetworkToggle,
  PerpetualsOnboarding,
  HyperliquidDepositWithdraw,
} from "@/components/perpetuals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Extracted components
import { 
  AccountStatsRow, 
  DisconnectedState, 
  WrongNetworkState,
  MobileTradingUI,
  DesktopTradingUI,
} from "./Perpetuals/components";

const POPULAR_PAIRS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'MATIC', 'DOGE', 'LINK', 'BNB', 'XRP', 'ADA', 'DOT', 'NEAR', 'APT', 'SUI', 'OP'];
const PLATFORM_FEE_PERCENT = '0.01%';

// Perpetuals-specific error fallback
function PerpetualsFallback({ 
  onRetry, 
  onSafeMode, 
  error 
}: { 
  onRetry: () => void; 
  onSafeMode: () => void;
  error?: Error | null;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const copyError = () => {
    const details = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass border-destructive/20 max-w-xl mx-auto">
      <CardContent className="pt-8 pb-8 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4 w-fit mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Trading UI Failed to Load</h3>
        <p className="text-sm text-muted-foreground mb-6">
          There was an issue rendering the trading interface.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Button onClick={onSafeMode} variant="secondary" className="gap-2">
            <Shield className="w-4 h-4" />
            Safe Mode
          </Button>
        </div>

        {error && (
          <div className="mt-6 text-left">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground mb-2"
            >
              <AlertTriangle className="w-3 h-3" />
              {showDetails ? 'Hide' : 'Show'} error details
            </Button>

            {showDetails && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-destructive">{error.name}</span>
                  <Button variant="ghost" size="sm" onClick={copyError} className="h-6 text-xs gap-1">
                    {copied ? 'Copied!' : 'Copy Error'}
                  </Button>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Perpetuals = memo(function Perpetuals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const safeMode = searchParams.get('safe') === '1';
  const isMobile = useIsMobile();
  
  const { isConnected, activeChainType, activeAddress, disconnect, switchEvmChain } = useMultiWallet();
  const { toast } = useToast();
  
  // Use try-catch safe hook calls with fallback defaults
  const marketsResult = useHyperliquidMarkets();
  const getPrice = marketsResult?.getPrice ?? (() => 0);
  const refetchMarkets = marketsResult?.refetch ?? (() => {});
  
  const accountResult = useHyperliquidAccount();
  const positions = accountResult?.positions ?? [];
  const totalEquity = accountResult?.totalEquity ?? 0;
  const unrealizedPnl = accountResult?.unrealizedPnl ?? 0;
  const availableMargin = accountResult?.availableMargin ?? 0;
  const openOrders = accountResult?.openOrders ?? [];
  const refetchAccount = accountResult?.refetch ?? (() => {});
  
  const fillsResult = useHyperliquidFills();
  const fills = fillsResult?.fills ?? [];
  const fillsLoading = fillsResult?.isLoading ?? false;
  
  // Trading hook
  const tradingResult = useHyperliquidTrading();
  const {
    isTestnet = false,
    setIsTestnet = () => {},
    isBuilderApproved = false,
    builderApprovalLoading = false,
    approveBuilder = async () => false,
    placeMarketOrder = async () => ({ success: false, error: 'Not ready' }),
    placeLimitOrder = async () => ({ success: false, error: 'Not ready' }),
    closePosition = async () => ({ success: false, error: 'Not ready' }),
    placeStopLoss = async () => {},
    placeTakeProfit = async () => {},
    addMargin = async () => false,
    isSubmitting = false,
  } = tradingResult || {};
  
  const [selectedPair, setSelectedPair] = useState('BTC');
  const [activeTab, setActiveTab] = useState(isMobile ? 'chart' : 'trade');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showBuilderApproval, setShowBuilderApproval] = useState(false);
  const [showTradeConfirm, setShowTradeConfirm] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Real-time price updates via WebSocket - disabled in safe mode
  const wsResult = useHyperliquidWebSocket(safeMode ? [] : POPULAR_PAIRS);
  const getWsPrice = wsResult.getPrice;
  
  // Orderbook polling - disabled in safe mode
  const orderbookResult = useHyperliquidOrderbook(safeMode ? '' : selectedPair);
  const orderbook = orderbookResult.orderbook ?? null;
  const orderbookLoading = orderbookResult.isLoading ?? false;

  // Build current prices map
  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    POPULAR_PAIRS.forEach(pair => {
      const wsPrice = getWsPrice(pair);
      const restPrice = getPrice(pair);
      prices[pair] = wsPrice > 0 ? wsPrice : restPrice;
    });
    return prices;
  }, [getWsPrice, getPrice]);

  const isEVM = activeChainType === 'evm';
  const wsPrice = getWsPrice(selectedPair);
  const restPrice = getPrice(selectedPair);
  const currentPrice = wsPrice > 0 ? wsPrice : restPrice;
  const hasDeposit = totalEquity > 0;

  // Real-time P&L calculation
  const [realtimePnl, setRealtimePnl] = useState(unrealizedPnl);
  
  useEffect(() => {
    if (positions.length === 0) {
      setRealtimePnl(0);
      return;
    }
    
    let totalPnl = 0;
    positions.forEach(pos => {
      const coin = pos.coin;
      const price = currentPrices[coin] || parseFloat(pos.entryPx);
      const size = parseFloat(pos.szi);
      const entry = parseFloat(pos.entryPx);
      const pnl = (price - entry) * size;
      totalPnl += pnl;
    });
    setRealtimePnl(totalPnl);
  }, [positions, currentPrices]);

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const handleTrade = useCallback(async (params: any) => {
    if (!isBuilderApproved) {
      setShowBuilderApproval(true);
      return;
    }
    setPendingOrder({ ...params, price: currentPrice });
    setShowTradeConfirm(true);
  }, [isBuilderApproved, currentPrice]);

  const executeOrder = useCallback(async () => {
    if (!pendingOrder) return;
    
    try {
      const result = pendingOrder.orderType === 'market'
        ? await placeMarketOrder({
            coin: pendingOrder.coin,
            isBuy: pendingOrder.side === 'long',
            size: pendingOrder.size,
            leverage: pendingOrder.leverage,
            slippage: 0.5,
          })
        : await placeLimitOrder({
            coin: pendingOrder.coin,
            isBuy: pendingOrder.side === 'long',
            size: pendingOrder.size,
            price: pendingOrder.limitPrice,
            leverage: pendingOrder.leverage,
          });
      
      if (result.success) {
        toast({ title: 'Order Placed', description: `${pendingOrder.side} ${pendingOrder.coin} order submitted` });
        refetchAccount();
      } else {
        toast({ title: 'Order Failed', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Order Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setShowTradeConfirm(false);
      setPendingOrder(null);
    }
  }, [pendingOrder, placeMarketOrder, placeLimitOrder, toast, refetchAccount]);

  const handleClosePosition = useCallback(async (coin: string, size: string) => {
    const pos = positions.find(p => p.coin === coin);
    if (!pos) return;
    
    const result = await closePosition(coin, size, parseFloat(pos.szi) > 0);
    if (result.success) {
      toast({ title: 'Position Closed', description: `Closed ${size} ${coin}` });
      refetchAccount();
    } else {
      toast({ title: 'Failed', description: result.error, variant: 'destructive' });
    }
  }, [positions, closePosition, toast, refetchAccount]);

  const handleModifySLTP = useCallback(async (coin: string, stopLoss?: string, takeProfit?: string) => {
    const pos = positions.find(p => p.coin === coin);
    if (!pos) return;
    
    const isLong = parseFloat(pos.szi) > 0;
    const size = Math.abs(parseFloat(pos.szi)).toString();
    
    if (stopLoss) await placeStopLoss({ coin, triggerPrice: stopLoss, size, isLong });
    if (takeProfit) await placeTakeProfit({ coin, triggerPrice: takeProfit, size, isLong });
    toast({ title: 'SL/TP Updated' });
  }, [positions, placeStopLoss, placeTakeProfit, toast]);

  const handleAddMargin = useCallback(async (coin: string, amount: string) => {
    const result = await addMargin(coin, parseFloat(amount));
    if (result) {
      toast({ title: 'Margin Added', description: `Added $${amount} to ${coin}` });
      refetchAccount();
    }
  }, [addMargin, toast, refetchAccount]);

  const handleRefresh = () => {
    refetchMarkets();
    refetchAccount();
    toast({ title: 'Refreshed' });
  };

  const handleRetry = useCallback(() => setRetryKey(prev => prev + 1), []);
  const handleEnterSafeMode = useCallback(() => setSearchParams({ safe: '1' }), [setSearchParams]);
  const handleExitSafeMode = useCallback(() => {
    searchParams.delete('safe');
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  // Build order details for confirmation modal
  const orderDetails = useMemo(() => {
    if (!pendingOrder) {
      return {
        coin: selectedPair,
        side: 'long' as const,
        orderType: 'market' as const,
        size: '0',
        leverage: 1,
        price: currentPrice,
      };
    }
    return {
      coin: pendingOrder.coin,
      side: pendingOrder.side as 'long' | 'short',
      orderType: pendingOrder.orderType as 'market' | 'limit',
      size: pendingOrder.size,
      leverage: pendingOrder.leverage,
      price: currentPrice,
      limitPrice: pendingOrder.limitPrice,
      stopLoss: pendingOrder.stopLoss,
      takeProfit: pendingOrder.takeProfit,
    };
  }, [pendingOrder, selectedPair, currentPrice]);

  // Connected trading UI - choose based on device
  const ConnectedTradingUI = (
    <>
      {/* Safe Mode Banner - Mobile */}
      {safeMode && isMobile && (
        <Card className="glass border-warning/20 bg-warning/5 mb-4">
          <CardContent className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="w-3 h-3 text-warning" />
              <span className="text-warning font-medium">Safe Mode</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleExitSafeMode}>
              Exit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Network + Refresh - Mobile */}
      {isMobile && (
        <div className="flex items-center justify-between mb-4">
          <NetworkToggle isTestnet={isTestnet} onToggle={setIsTestnet} />
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Onboarding - Mobile */}
      {isMobile && (!hasDeposit || !isBuilderApproved) && (
        <div className="mb-4">
          <PerpetualsOnboarding
            isWalletConnected={isConnected}
            hasDeposit={hasDeposit}
            isBuilderApproved={isBuilderApproved}
            isTestnet={isTestnet}
            onApproveBuilder={() => setShowBuilderApproval(true)}
            builderApprovalLoading={builderApprovalLoading}
          />
        </div>
      )}

      {isMobile ? (
        <MobileTradingUI
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
          currentPrices={currentPrices}
          currentPrice={currentPrice}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          totalEquity={totalEquity}
          availableMargin={availableMargin}
          realtimePnl={realtimePnl}
          positions={positions}
          openOrders={openOrders}
          orderbook={orderbook}
          orderbookLoading={orderbookLoading}
          safeMode={safeMode}
          onTrade={handleTrade}
          onClosePosition={handleClosePosition}
          onModifySLTP={handleModifySLTP}
          onAddMargin={handleAddMargin}
          onShowDeposit={() => setShowDepositModal(true)}
        />
      ) : (
        <DesktopTradingUI
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
          currentPrices={currentPrices}
          currentPrice={currentPrice}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          totalEquity={totalEquity}
          availableMargin={availableMargin}
          realtimePnl={realtimePnl}
          positions={positions}
          openOrders={openOrders}
          fills={fills}
          fillsLoading={fillsLoading}
          orderbook={orderbook}
          orderbookLoading={orderbookLoading}
          safeMode={safeMode}
          isTestnet={isTestnet}
          onTestnetToggle={setIsTestnet}
          isBuilderApproved={isBuilderApproved}
          builderApprovalLoading={builderApprovalLoading}
          hasDeposit={hasDeposit}
          isConnected={isConnected}
          onTrade={handleTrade}
          onClosePosition={handleClosePosition}
          onModifySLTP={handleModifySLTP}
          onAddMargin={handleAddMargin}
          onShowDeposit={() => setShowDepositModal(true)}
          onShowBuilderApproval={() => setShowBuilderApproval(true)}
          onRefresh={handleRefresh}
          onExitSafeMode={handleExitSafeMode}
        />
      )}
    </>
  );

  return (
    <AppLayout>
      <Helmet>
        <title>Perpetuals | xlama - Trade Perpetual Futures</title>
        <meta name="description" content="Trade perpetual futures with up to 50x leverage on Hyperliquid." />
      </Helmet>

      <main className="container px-4 sm:px-6 pb-8 sm:pb-12 relative">
        {/* Background accents - enhanced */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-destructive/5 rounded-full blur-3xl" />
        </div>

        {/* Header - More breathing room */}
        <div className={cn("text-center", isMobile ? "mb-6" : "mb-10 sm:mb-14")}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <Activity className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Perpetual Trading</span>
            {isTestnet && <Badge variant="secondary" className="text-[10px]">Testnet</Badge>}
          </div>
          <h1 className={cn(
            "font-bold gradient-text",
            isMobile ? "text-2xl mb-2" : "text-3xl sm:text-4xl lg:text-5xl mb-4"
          )}>Trade Perpetuals</h1>
          {!isMobile && (
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Long or short with up to 50x leverage on Hyperliquid.
            </p>
          )}
        </div>

        {!isConnected ? (
          <DisconnectedState />
        ) : !isEVM ? (
          <WrongNetworkState 
            onSwitchToArbitrum={() => switchEvmChain(42161)}
            onSwitchToHyperEVM={() => switchEvmChain(999)}
          />
        ) : (
          <ErrorBoundary
            key={retryKey}
            renderFallback={(error) => (
              <PerpetualsFallback 
                onRetry={handleRetry} 
                onSafeMode={handleEnterSafeMode}
                error={error}
              />
            )}
            onRetry={handleRetry}
          >
            {ConnectedTradingUI}
          </ErrorBoundary>
        )}
      </main>

      {/* Modals */}
      <BuilderFeeApproval
        isOpen={showBuilderApproval}
        onClose={() => setShowBuilderApproval(false)}
        onApprove={approveBuilder}
        isLoading={isSubmitting || builderApprovalLoading}
        feePercent={PLATFORM_FEE_PERCENT}
        builderAddress={import.meta.env.VITE_HYPERLIQUID_BUILDER_ADDRESS || ''}
      />

      <TradeConfirmModal
        isOpen={showTradeConfirm}
        onClose={() => { setShowTradeConfirm(false); setPendingOrder(null); }}
        onConfirm={executeOrder}
        orderDetails={orderDetails}
        feePercent={PLATFORM_FEE_PERCENT}
        isSubmitting={isSubmitting}
        isTestnet={isTestnet}
      />

      <HyperliquidDepositWithdraw
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        availableMargin={availableMargin}
        isTestnet={isTestnet}
      />
    </AppLayout>
  );
});

export default Perpetuals;
