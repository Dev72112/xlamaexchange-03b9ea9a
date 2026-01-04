import { memo, useState, useMemo } from 'react';
import { useDCAOrders, DCAOrder } from '@/hooks/useDCAOrders';
import { useDCATokenPrices } from '@/hooks/useDCATokenPrices';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  ArrowRight,
  Loader2,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { DCAHistoryChart } from './DCAHistoryChart';
import xlamaMascot from '@/assets/xlama-mascot.png';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';

interface DCAStats {
  totalInvested: number;
  totalReceived: number;
  averageBuyPrice: number;
  currentValue: number;
  roi: number;
  roiPercent: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number, decimals = 4): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  return value.toFixed(decimals);
};
interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}

const StatCard = memo(function StatCard({ label, value, subValue, icon, trend, isLoading }: StatCardProps) {
  return (
    <div className="p-3 sm:p-4 bg-secondary/30 rounded-lg min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-1.5 sm:mb-2">
        {icon}
        <span className="text-[10px] sm:text-xs truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
        {isLoading ? (
          <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
        ) : (
          <span className={`text-sm sm:text-lg font-semibold truncate ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : ''
          }`}>
            {value}
          </span>
        )}
        {subValue && !isLoading && (
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{subValue}</span>
        )}
      </div>
    </div>
  );
});

interface OrderPerformanceCardProps {
  order: DCAOrder;
  currentValue: number | null;
  roi: number | null;
  isLoadingPrice: boolean;
  index: number;
}

const OrderPerformanceCard = memo(function OrderPerformanceCard({ 
  order, 
  currentValue,
  roi,
  isLoadingPrice,
  index,
}: OrderPerformanceCardProps) {
  const progress = order.total_intervals 
    ? (order.completed_intervals / order.total_intervals) * 100 
    : null;
  
  const totalSpent = parseFloat(order.total_spent) || 0;
  const totalReceived = parseFloat(order.total_received) || 0;
  const avgPrice = order.average_price || 0;
  const isPositive = roi !== null ? roi >= 0 : true;

  return (
    <div 
      className={`p-3 sm:p-4 border border-border rounded-lg hover:border-primary/20 transition-colors ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 50)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-medium text-sm sm:text-base truncate">{order.from_token_symbol}</span>
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm sm:text-base truncate">{order.to_token_symbol}</span>
        </div>
        {isLoadingPrice ? (
          <Skeleton className="h-5 w-14 sm:w-16 shrink-0" />
        ) : (
          <Badge 
            variant="outline" 
            className={`shrink-0 text-xs ${isPositive 
              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
              : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}
          >
            {roi !== null ? `${isPositive ? '+' : ''}${roi.toFixed(2)}%` : 'N/A'}
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Total Invested</p>
          <p className="font-medium text-sm sm:text-base truncate">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Tokens Received</p>
          <p className="font-medium text-sm sm:text-base truncate">{formatNumber(totalReceived)} {order.to_token_symbol}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Avg Buy Price</p>
          <p className="font-medium text-sm sm:text-base truncate">${avgPrice.toFixed(6)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Current Value</p>
          {isLoadingPrice ? (
            <Skeleton className="h-4 sm:h-5 w-14 sm:w-16" />
          ) : (
            <p className="font-medium text-sm sm:text-base truncate">
              {currentValue !== null ? formatCurrency(currentValue) : 'N/A'}
            </p>
          )}
        </div>
      </div>

      {/* ROI Bar */}
      <div className="mb-2 sm:mb-3">
        <div className="flex justify-between text-[10px] sm:text-xs mb-1">
          <span className="text-muted-foreground">P&L</span>
          {isLoadingPrice ? (
            <Skeleton className="h-3 sm:h-4 w-10 sm:w-12" />
          ) : (
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {currentValue !== null && totalSpent > 0 
                ? `${isPositive ? '+' : ''}${formatCurrency(currentValue - totalSpent)}`
                : 'N/A'
              }
            </span>
          )}
        </div>
        <Progress 
          value={roi !== null ? Math.min(Math.abs(roi), 100) : 0}
          className={`h-1 sm:h-1.5 ${isPositive ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
        />
      </div>

      {/* Progress */}
      {progress !== null && (
        <div className="pt-2 sm:pt-3 border-t border-border">
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>Purchases: {order.completed_intervals}/{order.total_intervals}</span>
            <span>{progress.toFixed(0)}% complete</span>
          </div>
        </div>
      )}
    </div>
  );
});

export const DCADashboard = memo(function DCADashboard() {
  const { isConnected } = useMultiWallet();
  const { orders, activeOrders, completedOrders, isLoading, refetch } = useDCAOrders();
  const { calculateOrderValue, calculateROI, isLoading: isPriceLoading, refetch: refetchPrices } = useDCATokenPrices(orders);
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate current values for all orders using real-time prices
  const orderValues = useMemo(() => {
    const values = new Map<string, number>();
    orders.forEach(order => {
      const value = calculateOrderValue(order);
      if (value !== null) values.set(order.id, value);
    });
    return values;
  }, [orders, calculateOrderValue]);

  // Calculate aggregate stats with real-time prices
  const aggregateStats = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    orders.forEach(order => {
      totalInvested += parseFloat(order.total_spent) || 0;
      const currentValue = orderValues.get(order.id);
      if (currentValue !== null && currentValue !== undefined) {
        totalCurrentValue += currentValue;
      }
    });
    
    const roi = totalCurrentValue - totalInvested;
    const roiPercent = totalInvested > 0 ? (roi / totalInvested) * 100 : 0;
    
    return { totalInvested, totalCurrentValue, roi, roiPercent };
  }, [orders, orderValues]);

  const handleRefresh = () => {
    refetch();
    refetchPrices();
  };
  
  if (!isConnected) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline sm:inline">DCA Dashboard</span>
          <span className="xs:hidden sm:hidden">DCA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">DCA Performance Dashboard</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading || isPriceLoading} className="h-8 w-8 p-0 shrink-0">
              <RefreshCw className={`w-4 h-4 ${(isLoading || isPriceLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <img 
              src={xlamaMascot} 
              alt="xLama mascot" 
              className="w-20 h-20 mx-auto mb-4 opacity-60"
            />
            <p className="text-muted-foreground mb-2">No DCA orders yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first DCA order to start tracking performance
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            {/* Aggregate Stats */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Overall Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <StatCard
                  label="Total Invested"
                  value={formatCurrency(aggregateStats.totalInvested)}
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                />
                <StatCard
                  label="Current Value"
                  value={formatCurrency(aggregateStats.totalCurrentValue)}
                  icon={<Target className="w-3.5 h-3.5" />}
                  isLoading={isPriceLoading}
                />
                <StatCard
                  label="Total P&L"
                  value={`${aggregateStats.roi >= 0 ? '+' : ''}${formatCurrency(aggregateStats.roi)}`}
                  subValue={`${aggregateStats.roiPercent >= 0 ? '+' : ''}${aggregateStats.roiPercent.toFixed(2)}%`}
                  icon={aggregateStats.roi >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  trend={aggregateStats.roi >= 0 ? 'up' : 'down'}
                  isLoading={isPriceLoading}
                />
                <StatCard
                  label="Active Orders"
                  value={activeOrders.length.toString()}
                  subValue={`of ${orders.length} total`}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* DCA History Chart */}
            <DCAHistoryChart orders={orders} currentValues={orderValues} />

            {/* Orders by Status */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <div className="space-y-3">
                  {orders.map((order, index) => (
                    <OrderPerformanceCard
                      key={order.id}
                      order={order}
                      currentValue={orderValues.get(order.id) ?? null}
                      roi={calculateROI(order)}
                      isLoadingPrice={isPriceLoading}
                      index={index}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="active" className="mt-4">
                {activeOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No active orders</p>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.map((order, index) => (
                      <OrderPerformanceCard
                        key={order.id}
                        order={order}
                        currentValue={orderValues.get(order.id) ?? null}
                        roi={calculateROI(order)}
                        isLoadingPrice={isPriceLoading}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="mt-4">
                {completedOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No completed orders</p>
                ) : (
                  <div className="space-y-3">
                    {completedOrders.map((order, index) => (
                      <OrderPerformanceCard
                        key={order.id}
                        order={order}
                        currentValue={orderValues.get(order.id) ?? null}
                        roi={calculateROI(order)}
                        isLoadingPrice={isPriceLoading}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Summary Footer */}
            <div className="p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Average ROI across all orders
                  </span>
                </div>
                {isPriceLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <span className={`font-medium ${
                    aggregateStats.roiPercent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {aggregateStats.roiPercent >= 0 ? '+' : ''}{aggregateStats.roiPercent.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
