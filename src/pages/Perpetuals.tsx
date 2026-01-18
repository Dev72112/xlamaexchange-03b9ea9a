/**
 * Perpetuals Page
 * 
 * Hyperliquid perpetual trading interface with live trading.
 */

import { memo, useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { useHyperliquidMarkets, useHyperliquidOrderbook } from "@/hooks/useHyperliquidMarkets";
import { useHyperliquidAccount } from "@/hooks/useHyperliquidAccount";
import { useHyperliquidWebSocket } from "@/hooks/useHyperliquidWebSocket";
import { useHyperliquidTrading } from "@/hooks/useHyperliquidTrading";
import { useHyperliquidFills } from "@/hooks/useHyperliquidFills";
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
} from "@/components/perpetuals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const POPULAR_PAIRS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'MATIC', 'DOGE', 'LINK'];

const Perpetuals = memo(function Perpetuals() {
  const { isConnected, activeChainType, activeAddress } = useMultiWallet();
  const { getPrice, refetch: refetchMarkets } = useHyperliquidMarkets();
  const { 
    positions, 
    totalEquity, 
    unrealizedPnl, 
    availableMargin,
    openOrders,
    refetch: refetchAccount,
  } = useHyperliquidAccount();
  const { fills, isLoading: fillsLoading } = useHyperliquidFills();
  const { toast } = useToast();
  
  // Trading hook
  const {
    isTestnet,
    setIsTestnet,
    isBuilderApproved,
    approveBuilder,
    placeMarketOrder,
    placeLimitOrder,
    closePosition,
    placeStopLoss,
    placeTakeProfit,
    addMargin,
    isSubmitting,
  } = useHyperliquidTrading();
  
  const [selectedPair, setSelectedPair] = useState('BTC');
  const [activeTab, setActiveTab] = useState('trade');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showBuilderApproval, setShowBuilderApproval] = useState(false);
  const [showTradeConfirm, setShowTradeConfirm] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  const { getPrice: getWsPrice } = useHyperliquidWebSocket(POPULAR_PAIRS);
  const { orderbook, isLoading: orderbookLoading } = useHyperliquidOrderbook(selectedPair);

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
    setPendingOrder(params);
    setShowTradeConfirm(true);
  }, [isBuilderApproved]);

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
    
    if (stopLoss) {
      await placeStopLoss({ coin, triggerPrice: stopLoss, size, isLong });
    }
    if (takeProfit) {
      await placeTakeProfit({ coin, triggerPrice: takeProfit, size, isLong });
    }
    toast({ title: 'SL/TP Updated' });
  }, [positions, placeStopLoss, placeTakeProfit, toast]);

  const handleAddMargin = useCallback(async (coin: string, amount: string) => {
    const result = await addMargin(coin, parseFloat(amount));
    if (result.success) {
      toast({ title: 'Margin Added', description: `Added $${amount} to ${coin}` });
      refetchAccount();
    }
  }, [addMargin, toast, refetchAccount]);

  const handleRefresh = () => {
    refetchMarkets();
    refetchAccount();
    toast({ title: 'Refreshed' });
  };

  return (
    <Layout>
      <Helmet>
        <title>Perpetuals | xlama - Trade Perpetual Futures</title>
        <meta name="description" content="Trade perpetual futures with up to 50x leverage on Hyperliquid." />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>

        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <Activity className="w-4 h-4" />
            <span>Perpetual Trading</span>
            {isTestnet && <Badge variant="secondary" className="text-xs">Testnet</Badge>}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">Trade Perpetuals</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Long or short with up to 50x leverage on Hyperliquid.
          </p>
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
                <p className="text-sm text-muted-foreground">Hyperliquid requires an EVM wallet.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Network Toggle & Onboarding */}
            <div className="flex items-center justify-between">
              <NetworkToggle isTestnet={isTestnet} onToggle={setIsTestnet} />
              <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {(!hasDeposit || !isBuilderApproved) && (
              <PerpetualsOnboarding
                isConnected={isConnected}
                hasDeposit={hasDeposit}
                isBuilderApproved={isBuilderApproved}
                isTestnet={isTestnet}
                onDeposit={() => setShowDepositModal(true)}
                onApproveBuilder={() => setShowBuilderApproval(true)}
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
              <Card className={cn("glass border-border/50 hover-lift", unrealizedPnl >= 0 ? "border-success/20" : "border-destructive/20")}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {unrealizedPnl >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                    <span className="text-xs text-muted-foreground">Unrealized PnL</span>
                  </div>
                  <p className={cn("text-lg font-bold", unrealizedPnl >= 0 ? "text-success" : "text-destructive")}>
                    {unrealizedPnl >= 0 ? '+' : ''}{formatUsd(unrealizedPnl)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Market Selector */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Markets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_PAIRS.map(pair => (
                    <Button
                      key={pair}
                      variant={selectedPair === pair ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPair(pair)}
                      className={cn("gap-2", selectedPair === pair && "bg-primary text-primary-foreground")}
                    >
                      {pair}-PERP
                      {currentPrices[pair] > 0 && (
                        <span className="text-xs opacity-70">${currentPrices[pair].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Candlestick Chart */}
            <CandlestickChart coin={selectedPair} currentPrice={currentPrice} className="glow-sm" />

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
              </div>
            </div>

            <MobileTradePanel coin={selectedPair} currentPrice={currentPrice} availableMargin={availableMargin} onTrade={handleTrade} />
          </div>
        )}
      </main>

      {/* Modals */}
      <BuilderFeeApproval
        isOpen={showBuilderApproval}
        onClose={() => setShowBuilderApproval(false)}
        onApprove={approveBuilder}
        isLoading={isSubmitting}
        feePercent={0.01}
        builderAddress={import.meta.env.VITE_HYPERLIQUID_BUILDER_ADDRESS || ''}
      />

      <TradeConfirmModal
        isOpen={showTradeConfirm}
        onClose={() => { setShowTradeConfirm(false); setPendingOrder(null); }}
        onConfirm={executeOrder}
        orderDetails={pendingOrder}
        estimatedFee={pendingOrder ? parseFloat(pendingOrder.size) * currentPrice * 0.0001 : 0}
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
