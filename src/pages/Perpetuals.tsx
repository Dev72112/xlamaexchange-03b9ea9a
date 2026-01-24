/**
 * Perpetuals Page
 * 
 * Hyperliquid perpetual trading interface with live trading.
 * Mobile-first design with tabs for chart/trade/positions.
 */

import { memo, useState, useMemo, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Wallet,
  History,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calculator,
  ArrowDownToLine,
  AlertTriangle,
  Shield,
  LineChart,
  ListOrdered,
  Layers,
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
  HyperliquidTradeForm, 
  HyperliquidOrderbook, 
  FundingRateChart,
  MobileTradePanel,
  PositionManager,
  PnLCalculator,
  BuilderFeeApproval,
  TradeConfirmModal,
  NetworkToggle,
  PerpetualsOnboarding,
  CandlestickChart,
  TradeHistory,
  HyperliquidDepositWithdraw,
  MarketSelector,
} from "@/components/perpetuals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

  // Mobile-optimized trading UI
  const MobileTradingUI = (
    <div className="space-y-4">
      {/* Sticky Market Selector */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-2 -mx-4 px-4">
        <MarketSelector
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
          currentPrices={currentPrices}
          className="glow-sm"
        />
      </div>

      {/* Account Stats - Horizontal Scroll */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          <Card className="glass border-border/50 min-w-[140px] flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Wallet className="w-3 h-3" />
                Equity
              </div>
              <p className="text-lg font-bold">{formatUsd(totalEquity)}</p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50 min-w-[140px] flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" />
                Available
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{formatUsd(availableMargin)}</p>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowDepositModal(true)}>
                  <ArrowDownToLine className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "glass border-border/50 min-w-[140px] flex-shrink-0",
            realtimePnl >= 0 ? "border-success/20" : "border-destructive/20"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {realtimePnl >= 0 ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                PnL
                {!safeMode && <Badge variant="outline" className="text-[8px] px-1 py-0">LIVE</Badge>}
              </div>
              <p className={cn("text-lg font-bold", realtimePnl >= 0 ? "text-success" : "text-destructive")}>
                {realtimePnl >= 0 ? '+' : ''}{formatUsd(realtimePnl)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass border-border/50 min-w-[100px] flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <BarChart3 className="w-3 h-3" />
                Positions
              </div>
              <p className="text-lg font-bold">{positions.length}</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-11">
          <TabsTrigger value="chart" className="gap-1.5 text-xs">
            <LineChart className="w-4 h-4" />
            Chart
          </TabsTrigger>
          <TabsTrigger value="trade" className="gap-1.5 text-xs">
            <Activity className="w-4 h-4" />
            Trade
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-1.5 text-xs">
            <Layers className="w-4 h-4" />
            Pos
            {positions.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{positions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs">
            <ListOrdered className="w-4 h-4" />
            Orders
            {openOrders.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{openOrders.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          {!safeMode ? (
            <div className="space-y-4">
              <div className="relative z-10">
                <CandlestickChart coin={selectedPair} currentPrice={currentPrice} className="glow-sm max-h-[50vh]" />
              </div>
              <div className="relative z-0">
                <FundingRateChart coin={selectedPair} />
              </div>
            </div>
          ) : (
            <Card className="glass border-border/50">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chart disabled in Safe Mode</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trade" className="mt-4">
          <div className="space-y-4">
            <HyperliquidTradeForm 
              coin={selectedPair} 
              currentPrice={currentPrice} 
              availableMargin={availableMargin} 
              onTrade={handleTrade} 
            />
            {!safeMode && (
              <Card className="glass border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Orderbook
                    <Badge variant="outline" className="text-xs font-mono">{selectedPair}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HyperliquidOrderbook orderbook={orderbook} isLoading={orderbookLoading} currentPrice={currentPrice} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="positions" className="mt-4">
          <PositionManager 
            positions={positions} 
            currentPrices={currentPrices} 
            onClosePosition={handleClosePosition} 
            onModifySLTP={handleModifySLTP} 
            onAddMargin={handleAddMargin} 
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {openOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No open orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {openOrders.map((order: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-secondary/30 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{order.coin}-PERP</span>
                    <Badge variant="outline" className="ml-2 text-xs">{order.side}</Badge>
                  </div>
                  <div className="text-right font-mono">
                    <p>${parseFloat(order.limitPx || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{order.sz}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  // Desktop trading UI
  const DesktopTradingUI = (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Safe Mode Banner */}
      {safeMode && (
        <Card className="glass border-warning/20 bg-warning/5">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-warning" />
              <span className="text-warning font-medium">Safe Mode Active</span>
              <span className="text-muted-foreground">- Charts and WebSocket disabled</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleExitSafeMode}>
              Exit Safe Mode
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Network Toggle & Refresh */}
      <div className="flex items-center justify-between">
        <NetworkToggle isTestnet={isTestnet} onToggle={setIsTestnet} />
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Onboarding Checklist */}
      {(!hasDeposit || !isBuilderApproved) && (
        <PerpetualsOnboarding
          isWalletConnected={isConnected}
          hasDeposit={hasDeposit}
          isBuilderApproved={isBuilderApproved}
          isTestnet={isTestnet}
          onApproveBuilder={() => setShowBuilderApproval(true)}
          builderApprovalLoading={builderApprovalLoading}
        />
      )}

      {/* Account Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-border/50 hover-lift">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Equity</span>
            </div>
            <p className="text-lg font-bold">{formatUsd(totalEquity)}</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50 hover-lift">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{formatUsd(availableMargin)}</p>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowDepositModal(true)}>
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/50 hover-lift">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Positions</span>
            </div>
            <p className="text-lg font-bold">{positions.length}</p>
          </CardContent>
        </Card>
        <Card className={cn("glass border-border/50 hover-lift", realtimePnl >= 0 ? "border-success/20" : "border-destructive/20")}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              {realtimePnl >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
              <span className="text-xs text-muted-foreground">Unrealized PnL</span>
              {!safeMode && <Badge variant="outline" className="text-[10px] px-1 py-0">LIVE</Badge>}
            </div>
            <p className={cn("text-lg font-bold", realtimePnl >= 0 ? "text-success" : "text-destructive")}>
              {realtimePnl >= 0 ? '+' : ''}{formatUsd(realtimePnl)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Market Selector */}
      <MarketSelector
        selectedPair={selectedPair}
        onSelectPair={setSelectedPair}
        currentPrices={currentPrices}
        className="glow-sm"
      />

      {/* Candlestick Chart */}
      {!safeMode && (
        <CandlestickChart coin={selectedPair} currentPrice={currentPrice} className="glow-sm" />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {selectedPair}-PERP
                </span>
                <Badge variant="outline" className="font-mono">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="trade">Trade</TabsTrigger>
                  <TabsTrigger value="positions">Positions {positions.length > 0 && `(${positions.length})`}</TabsTrigger>
                  <TabsTrigger value="orders">Orders {openOrders.length > 0 && `(${openOrders.length})`}</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="trade" className="mt-4">
                  <HyperliquidTradeForm coin={selectedPair} currentPrice={currentPrice} availableMargin={availableMargin} onTrade={handleTrade} />
                </TabsContent>
                <TabsContent value="positions" className="mt-4">
                  <PositionManager positions={positions} currentPrices={currentPrices} onClosePosition={handleClosePosition} onModifySLTP={handleModifySLTP} onAddMargin={handleAddMargin} />
                </TabsContent>
                <TabsContent value="orders" className="mt-4">
                  {openOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No open orders</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {openOrders.map((order: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border bg-secondary/30 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{order.coin}-PERP</span>
                            <Badge variant="outline" className="ml-2 text-xs">{order.side}</Badge>
                          </div>
                          <div className="text-right font-mono">
                            <p>${parseFloat(order.limitPx || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{order.sz}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                  <TradeHistory trades={fills} isLoading={fillsLoading} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button variant={!showCalculator ? "default" : "outline"} size="sm" className="flex-1 gap-2" onClick={() => setShowCalculator(false)}>
              <BarChart3 className="w-4 h-4" />Orderbook
            </Button>
            <Button variant={showCalculator ? "default" : "outline"} size="sm" className="flex-1 gap-2" onClick={() => setShowCalculator(true)}>
              <Calculator className="w-4 h-4" />Calculator
            </Button>
          </div>

          {showCalculator ? (
            <PnLCalculator coin={selectedPair} currentPrice={currentPrice} />
          ) : (
            <>
              {!safeMode && (
                <>
                  <Card className="glass border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Orderbook
                        <Badge variant="outline" className="text-xs font-mono">{selectedPair}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <HyperliquidOrderbook orderbook={orderbook} isLoading={orderbookLoading} currentPrice={currentPrice} />
                    </CardContent>
                  </Card>
                  <FundingRateChart coin={selectedPair} />
                </>
              )}
              {safeMode && (
                <Card className="glass border-border/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Orderbook disabled in Safe Mode</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Trade Panel */}
      {!safeMode && (
        <MobileTradePanel coin={selectedPair} currentPrice={currentPrice} availableMargin={availableMargin} onTrade={handleTrade} />
      )}
    </div>
  );

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

      {isMobile ? MobileTradingUI : DesktopTradingUI}
    </>
  );

  return (
    <Layout>
      <Helmet>
        <title>Perpetuals | xlama - Trade Perpetual Futures</title>
        <meta name="description" content="Trade perpetual futures with up to 50x leverage on Hyperliquid." />
      </Helmet>

      <main className="container px-4 sm:px-6 py-6 sm:py-8">
        {/* Background accents */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>

        {/* Header - Compact on mobile */}
        <div className={cn("text-center mb-6", !isMobile && "mb-8 sm:mb-12")}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-primary/20 text-sm text-primary mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs sm:text-sm">Perpetual Trading</span>
            {isTestnet && <Badge variant="secondary" className="text-[10px]">Testnet</Badge>}
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-2 gradient-text">Trade Perpetuals</h1>
          {!isMobile && (
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Long or short with up to 50x leverage on Hyperliquid.
            </p>
          )}
        </div>

        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect">
              <CardContent className="pt-8 pb-8 text-center">
                <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-6">Connect an EVM wallet to start trading.</p>
                <MultiWalletButton />
              </CardContent>
            </Card>
          </div>
        ) : !isEVM ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-warning/20">
              <CardContent className="pt-8 pb-8 text-center">
                <Wallet className="w-12 h-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Switch to EVM Network</h3>
                <p className="text-sm text-muted-foreground mb-4">Hyperliquid requires an EVM wallet.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => switchEvmChain(42161)} className="gap-2">
                    Switch to Arbitrum
                  </Button>
                  <Button variant="outline" onClick={() => switchEvmChain(999)} className="gap-2">
                    Switch to HyperEVM
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
    </Layout>
  );
});

export default Perpetuals;
