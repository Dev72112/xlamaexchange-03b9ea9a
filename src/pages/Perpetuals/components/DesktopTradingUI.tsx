/**
 * Desktop Trading UI for Perpetuals
 * 
 * Two-column layout with chart, orderbook, trade form, and position manager.
 */

import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Activity, 
  BarChart3,
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calculator,
  ArrowDownToLine,
  Shield,
} from 'lucide-react';
import { 
  HyperliquidTradeForm, 
  HyperliquidOrderbook, 
  FundingRateChart,
  MobileTradePanel,
  PositionManager,
  PnLCalculator,
  NetworkToggle,
  PerpetualsOnboarding,
  CandlestickChart,
  TradeHistory,
  MarketSelector,
} from '@/components/perpetuals';
import { cn } from '@/lib/utils';

interface DesktopTradingUIProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
  currentPrices: Record<string, number>;
  currentPrice: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalEquity: number;
  availableMargin: number;
  realtimePnl: number;
  positions: any[];
  openOrders: any[];
  fills: any[];
  fillsLoading: boolean;
  orderbook: any;
  orderbookLoading: boolean;
  safeMode: boolean;
  isTestnet: boolean;
  onTestnetToggle: (value: boolean) => void;
  isBuilderApproved: boolean;
  builderApprovalLoading: boolean;
  hasDeposit: boolean;
  isConnected: boolean;
  onTrade: (params: any) => void;
  onClosePosition: (coin: string, size: string) => void;
  onModifySLTP: (coin: string, stopLoss?: string, takeProfit?: string) => void;
  onAddMargin: (coin: string, amount: string) => void;
  onShowDeposit: () => void;
  onShowBuilderApproval: () => void;
  onRefresh: () => void;
  onExitSafeMode: () => void;
}

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export const DesktopTradingUI = memo(function DesktopTradingUI({
  selectedPair,
  onSelectPair,
  currentPrices,
  currentPrice,
  activeTab,
  onTabChange,
  totalEquity,
  availableMargin,
  realtimePnl,
  positions,
  openOrders,
  fills,
  fillsLoading,
  orderbook,
  orderbookLoading,
  safeMode,
  isTestnet,
  onTestnetToggle,
  isBuilderApproved,
  builderApprovalLoading,
  hasDeposit,
  isConnected,
  onTrade,
  onClosePosition,
  onModifySLTP,
  onAddMargin,
  onShowDeposit,
  onShowBuilderApproval,
  onRefresh,
  onExitSafeMode,
}: DesktopTradingUIProps) {
  const [showCalculator, setShowCalculator] = useState(false);

  // Wrap callbacks to return Promise<void> for child components
  const handleTrade = useCallback(async (params: any) => {
    onTrade(params);
  }, [onTrade]);

  const handleClosePosition = useCallback(async (coin: string, size: string) => {
    onClosePosition(coin, size);
  }, [onClosePosition]);

  const handleModifySLTP = useCallback(async (coin: string, stopLoss?: string, takeProfit?: string) => {
    onModifySLTP(coin, stopLoss, takeProfit);
  }, [onModifySLTP]);

  const handleAddMargin = useCallback(async (coin: string, amount: string) => {
    onAddMargin(coin, amount);
  }, [onAddMargin]);

  return (
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
            <Button variant="ghost" size="sm" onClick={onExitSafeMode}>
              Exit Safe Mode
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Network Toggle & Refresh */}
      <div className="flex items-center justify-between">
        <NetworkToggle isTestnet={isTestnet} onToggle={onTestnetToggle} />
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
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
          onApproveBuilder={onShowBuilderApproval}
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onShowDeposit}>
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
        onSelectPair={onSelectPair}
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
              <Tabs value={activeTab} onValueChange={onTabChange}>
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

      {/* Mobile Trade Panel - shown on desktop too for quick access */}
      {!safeMode && (
        <MobileTradePanel coin={selectedPair} currentPrice={currentPrice} availableMargin={availableMargin} onTrade={onTrade} />
      )}
    </div>
  );
});
