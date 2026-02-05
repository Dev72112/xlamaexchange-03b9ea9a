/**
 * Mobile Trading UI for Perpetuals
 * 
 * Mobile-optimized layout with tabs for Chart, Trade, Positions, Orders.
 * Supports swipe gestures for tab navigation.
 */

import { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { SwipeHint } from '@/components/ui/swipe-hint';
import { EducationCollapsible } from '@/components/EducationCollapsible';
import { 
  TrendingUp, 
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownToLine,
  Shield,
  LineChart,
  ListOrdered,
  Layers,
  Activity,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { 
  HyperliquidTradeForm, 
  HyperliquidOrderbook, 
  FundingRateChart,
  PositionManager,
  CandlestickChart,
  MarketSelector,
  MobileTradePanel,
} from '@/components/perpetuals';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

const perpsSteps = [
  { icon: Activity, title: "Open Position", description: "Choose Long or Short with your desired leverage." },
  { icon: Layers, title: "Manage", description: "Set stop loss, take profit, or add margin." },
  { icon: TrendingUp, title: "Monitor PnL", description: "Real-time profit tracking with live prices." },
  { icon: Wallet, title: "Deposit/Withdraw", description: "Manage your trading collateral on Hyperliquid." },
];

const perpsTips = [
  "Start with low leverage (1-5x) until you're comfortable",
  "Always set a stop loss to limit potential losses",
  "Swipe left/right on the trade panel for quick Long/Short",
];

interface MobileTradingUIProps {
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
  orderbook: any;
  orderbookLoading: boolean;
  safeMode: boolean;
  onTrade: (params: any) => void;
  onClosePosition: (coin: string, size: string) => void;
  onModifySLTP: (coin: string, stopLoss?: string, takeProfit?: string) => void;
  onAddMargin: (coin: string, amount: string) => void;
  onShowDeposit: () => void;
}

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const TAB_ORDER = ['chart', 'trade', 'positions', 'orders'] as const;

export const MobileTradingUI = memo(function MobileTradingUI({
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
  orderbook,
  orderbookLoading,
  safeMode,
  onTrade,
  onClosePosition,
  onModifySLTP,
  onAddMargin,
  onShowDeposit,
}: MobileTradingUIProps) {
  const { trigger: hapticTrigger } = useHapticFeedback();

  // Swipe handlers for tab navigation
  const handleSwipeLeft = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
    if (currentIndex < TAB_ORDER.length - 1) {
      hapticTrigger('light');
      onTabChange(TAB_ORDER[currentIndex + 1]);
    }
  }, [activeTab, hapticTrigger, onTabChange]);
  
  const handleSwipeRight = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
    if (currentIndex > 0) {
      hapticTrigger('light');
      onTabChange(TAB_ORDER[currentIndex - 1]);
    }
  }, [activeTab, hapticTrigger, onTabChange]);

  const { handlers: swipeHandlers } = useSwipeGesture(handleSwipeLeft, handleSwipeRight, {
    threshold: 50,
    restraint: 100,
  });

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
    <div className="space-y-3 pt-2 pb-48">
      {/* Market Selector */}
      <MarketSelector
        selectedPair={selectedPair}
        onSelectPair={onSelectPair}
        currentPrices={currentPrices}
        className="glass-subtle"
      />

      {/* Account Stats - Horizontal Scroll */}
      <ScrollArea className="w-full -mx-4 px-4">
        <div className="flex gap-2 pb-2">
          <Card className="glass-subtle border-border/30 min-w-[120px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <Wallet className="w-3 h-3" />
                Equity
              </div>
              <p className="text-sm font-bold">{formatUsd(totalEquity)}</p>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border/30 min-w-[120px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <TrendingUp className="w-3 h-3" />
                Available
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">{formatUsd(availableMargin)}</p>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onShowDeposit}>
                  <ArrowDownToLine className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "glass-subtle border-border/30 min-w-[120px] flex-shrink-0",
            realtimePnl >= 0 ? "border-success/20" : "border-destructive/20"
          )}>
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                {realtimePnl >= 0 ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                PnL
              </div>
              <p className={cn("text-sm font-bold", realtimePnl >= 0 ? "text-success" : "text-destructive")}>
                {realtimePnl >= 0 ? '+' : ''}{formatUsd(realtimePnl)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border/30 min-w-[80px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <BarChart3 className="w-3 h-3" />
                Pos
              </div>
              <p className="text-sm font-bold">{positions.length}</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile Tabs - Compact with swipe support */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="chart" className="gap-1 text-xs px-1">
            <LineChart className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Chart</span>
          </TabsTrigger>
          <TabsTrigger value="trade" className="gap-1 text-xs px-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Trade</span>
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-1 text-xs px-1">
            <Layers className="w-3.5 h-3.5" />
            {positions.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{positions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs px-1">
            <ListOrdered className="w-3.5 h-3.5" />
            {openOrders.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[9px]">{openOrders.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Swipe hint for first-time users */}
        <SwipeHint hintKey="perpetuals" />

        {/* Swipeable content area */}
        <div {...swipeHandlers} className="touch-pan-y">
          <TabsContent value="chart" className="mt-3 space-y-4">
            {!safeMode ? (
              <div className="space-y-4">
                <div className="relative z-10 overflow-hidden rounded-lg">
                  <CandlestickChart coin={selectedPair} currentPrice={currentPrice} className="glow-sm" />
                </div>
                <div className="relative z-0">
                  <FundingRateChart coin={selectedPair} />
                </div>
              </div>
            ) : (
              <Card className="glass border-border/50">
                <CardContent className="py-6 text-center text-muted-foreground">
                  <Shield className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Chart disabled in Safe Mode</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trade" className="mt-3 space-y-3">
            <HyperliquidTradeForm 
              coin={selectedPair} 
              currentPrice={currentPrice} 
              availableMargin={availableMargin} 
              onTrade={handleTrade} 
            />

            {!safeMode && (
              <details open className="group glass-subtle rounded-lg border border-border/50">
                <summary className="list-none cursor-pointer select-none px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Orderbook</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">{selectedPair}</Badge>
                </summary>
                <div className="px-3 pb-3">
                  <Card className="glass border-border/50">
                    <CardContent className="pt-3">
                      <ScrollArea className="h-[200px] pr-2">
                        <HyperliquidOrderbook
                          orderbook={orderbook}
                          isLoading={orderbookLoading}
                          currentPrice={currentPrice}
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </details>
            )}
          </TabsContent>

          <TabsContent value="positions" className="mt-3">
            <PositionManager 
              positions={positions} 
              currentPrices={currentPrices} 
              onClosePosition={handleClosePosition} 
              onModifySLTP={handleModifySLTP} 
              onAddMargin={handleAddMargin} 
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-3">
            {openOrders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No open orders</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openOrders.map((order: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-secondary/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{order.coin}-PERP</span>
                      <Badge variant="outline" className="ml-1.5 text-[10px]">{order.side}</Badge>
                    </div>
                    <div className="text-right font-mono">
                      <p>${parseFloat(order.limitPx || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{order.sz}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Education collapsible for perpetuals */}
      <EducationCollapsible
        title="How Perpetuals Work"
        icon={HelpCircle}
        steps={perpsSteps}
        tips={perpsTips}
      />
      
      {/* Mobile Trade Panel with swipe gestures */}
      {!safeMode && (
        <MobileTradePanel
          coin={selectedPair}
          currentPrice={currentPrice}
          availableMargin={availableMargin}
          onTrade={onTrade}
        />
      )}
    </div>
  );
});
