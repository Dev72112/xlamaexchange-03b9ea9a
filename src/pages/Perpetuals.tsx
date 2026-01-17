/**
 * Perpetuals Page
 * 
 * Hyperliquid perpetual trading interface.
 */

import { memo, useState } from "react";
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
} from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { useHyperliquidMarkets, useHyperliquidOrderbook } from "@/hooks/useHyperliquidMarkets";
import { useHyperliquidAccount } from "@/hooks/useHyperliquidAccount";
import { HyperliquidTradeForm, HyperliquidOrderbook, HyperliquidPriceChart } from "@/components/perpetuals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Popular perpetual pairs
const POPULAR_PAIRS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'MATIC', 'DOGE', 'LINK'];

const Perpetuals = memo(function Perpetuals() {
  const { isConnected, activeChainType } = useMultiWallet();
  const { getPrice, refetch: refetchMarkets } = useHyperliquidMarkets();
  const { 
    positions, 
    totalEquity, 
    unrealizedPnl, 
    availableMargin,
    openOrders,
    refetch: refetchAccount,
  } = useHyperliquidAccount();
  const { toast } = useToast();
  
  const [selectedPair, setSelectedPair] = useState('BTC');
  const [activeTab, setActiveTab] = useState('trade');

  // Fetch orderbook for selected pair
  const { orderbook, isLoading: orderbookLoading } = useHyperliquidOrderbook(selectedPair);

  const isEVM = activeChainType === 'evm';
  const currentPrice = getPrice(selectedPair);

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const handleTrade = async (params: any) => {
    // Placeholder - will implement actual trading via Hyperliquid API
    console.log('[Perpetuals] Trade submitted:', params);
    toast({
      title: 'Trading Coming Soon',
      description: 'Hyperliquid order execution is being integrated. Check back soon!',
    });
  };

  const handleRefresh = () => {
    refetchMarkets();
    refetchAccount();
    toast({ title: 'Refreshed', description: 'Market data updated' });
  };

  return (
    <Layout>
      <Helmet>
        <title>Perpetuals | xlama - Trade Perpetual Futures</title>
        <meta
          name="description"
          content="Trade perpetual futures with up to 50x leverage on Hyperliquid. Long or short BTC, ETH, SOL and more with advanced order types."
        />
        <meta property="og:title" content="Perpetuals | xlama" />
        <meta property="og:description" content="Trade perpetual futures with up to 50x leverage on Hyperliquid." />
        <link rel="canonical" href="https://xlama.exchange/perpetuals" />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <Activity className="w-4 h-4" />
            <span>Perpetual Trading</span>
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Beta
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Trade Perpetuals
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Long or short with up to 50x leverage on Hyperliquid. 
            Advanced order types including limit, stop-loss, and take-profit.
          </p>
        </div>

        {/* Not Connected State */}
        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect an <strong className="text-primary">EVM wallet</strong> (Ethereum, Arbitrum) 
                  to start trading perpetuals on Hyperliquid.
                </p>
                <MultiWalletButton />
              </CardContent>
            </Card>
          </div>
        ) : !isEVM ? (
          /* Wrong Network */
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-warning/20">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Switch to EVM Network</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Hyperliquid trading requires an EVM-compatible wallet.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Please switch to Ethereum or Arbitrum to continue.
                </p>
                <Badge variant="outline" className="text-warning border-warning">
                  Currently on: {activeChainType}
                </Badge>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Main Trading Interface */
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Account Overview */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Account Overview</h2>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
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
                  <p className="text-lg font-bold">{formatUsd(availableMargin)}</p>
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
              
              <Card className={cn(
                "glass border-border/50 hover-lift",
                unrealizedPnl >= 0 ? "border-success/20" : "border-destructive/20"
              )}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {unrealizedPnl >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-xs text-muted-foreground">Unrealized PnL</span>
                  </div>
                  <p className={cn(
                    "text-lg font-bold",
                    unrealizedPnl >= 0 ? "text-success" : "text-destructive"
                  )}>
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
                  {POPULAR_PAIRS.map(pair => {
                    const price = getPrice(pair);
                    const isSelected = selectedPair === pair;
                    
                    return (
                      <Button
                        key={pair}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPair(pair)}
                        className={cn(
                          "gap-2",
                          isSelected && "bg-primary text-primary-foreground"
                        )}
                      >
                        {pair}-PERP
                        {price > 0 && (
                          <span className="text-xs opacity-70">
                            ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Live Price Chart */}
            <HyperliquidPriceChart
              coin={selectedPair}
              currentPrice={currentPrice}
              className="glow-sm"
            />
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Trading Form */}
              <div className="lg:col-span-2">
                <Card className="glass border-border/50 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        {selectedPair}-PERP
                      </span>
                      <Badge variant="outline" className="font-mono">
                        ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="trade">Trade</TabsTrigger>
                        <TabsTrigger value="positions">
                          Positions {positions.length > 0 && `(${positions.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="orders">
                          Orders {openOrders.length > 0 && `(${openOrders.length})`}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="trade" className="mt-4">
                        <HyperliquidTradeForm
                          coin={selectedPair}
                          currentPrice={currentPrice}
                          availableMargin={availableMargin}
                          onTrade={handleTrade}
                        />
                      </TabsContent>
                      
                      <TabsContent value="positions" className="mt-4">
                        {positions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No open positions</p>
                            <p className="text-xs mt-1">Your positions will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {positions.map((pos, i) => (
                              <div 
                                key={i}
                                className="p-3 rounded-lg border bg-secondary/30 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{pos.coin}-PERP</span>
                                    <Badge variant={parseFloat(pos.szi) > 0 ? "default" : "destructive"}>
                                      {parseFloat(pos.szi) > 0 ? 'LONG' : 'SHORT'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {pos.leverage}x
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Entry: ${parseFloat(pos.entryPx).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={cn(
                                    "font-mono font-medium",
                                    parseFloat(pos.unrealizedPnl) >= 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {parseFloat(pos.unrealizedPnl) >= 0 ? '+' : ''}
                                    ${parseFloat(pos.unrealizedPnl).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatPercent(parseFloat(pos.returnOnEquity) * 100)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="orders" className="mt-4">
                        {openOrders.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No open orders</p>
                            <p className="text-xs mt-1">Your limit orders will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {openOrders.map((order: any, i: number) => (
                              <div 
                                key={i}
                                className="p-3 rounded-lg border bg-secondary/30 flex items-center justify-between text-sm"
                              >
                                <div>
                                  <span className="font-medium">{order.coin}-PERP</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {order.side}
                                  </Badge>
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
                  </CardContent>
                </Card>
              </div>

              {/* Orderbook & Info */}
              <div className="space-y-6">
                <Card className="glass border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Orderbook
                      <Badge variant="outline" className="text-xs font-mono">
                        {selectedPair}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HyperliquidOrderbook
                      orderbook={orderbook}
                      isLoading={orderbookLoading}
                      currentPrice={currentPrice}
                    />
                  </CardContent>
                </Card>

                <Card className="glass border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Market Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Leverage</span>
                      <span>50x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funding Rate</span>
                      <span className="text-success">+0.0012%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mark Price</span>
                      <span className="font-mono">
                        ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees</span>
                      <span>0.035% / 0.1%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
});

export default Perpetuals;
