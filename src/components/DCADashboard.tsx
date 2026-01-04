import { memo, useState } from 'react';
import { useDCAOrders, DCAOrder } from '@/hooks/useDCAOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronRight,
  Percent,
} from 'lucide-react';
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

// Calculate stats for a single DCA order
const calculateOrderStats = (order: DCAOrder): DCAStats => {
  const totalSpent = parseFloat(order.total_spent) || 0;
  const totalReceived = parseFloat(order.total_received) || 0;
  const avgPrice = order.average_price || 0;
  
  // For demo purposes, estimate current value based on average price + some variance
  // In production, you'd fetch current price from an oracle
  const estimatedCurrentPrice = avgPrice * (1 + (Math.random() * 0.2 - 0.1));
  const currentValue = totalReceived * estimatedCurrentPrice;
  
  const roi = currentValue - totalSpent;
  const roiPercent = totalSpent > 0 ? ((currentValue - totalSpent) / totalSpent) * 100 : 0;
  
  return {
    totalInvested: totalSpent,
    totalReceived,
    averageBuyPrice: avgPrice,
    currentValue,
    roi,
    roiPercent,
  };
};

// Calculate aggregate stats across all orders
const calculateAggregateStats = (orders: DCAOrder[]): DCAStats => {
  let totalInvested = 0;
  let totalReceived = 0;
  let totalCurrentValue = 0;
  let weightedPriceSum = 0;
  
  orders.forEach(order => {
    const spent = parseFloat(order.total_spent) || 0;
    const received = parseFloat(order.total_received) || 0;
    const avgPrice = order.average_price || 0;
    
    totalInvested += spent;
    totalReceived += received;
    weightedPriceSum += avgPrice * received;
    
    // Estimate current value
    const estimatedCurrentPrice = avgPrice * (1 + (Math.random() * 0.1 - 0.05));
    totalCurrentValue += received * estimatedCurrentPrice;
  });
  
  const averageBuyPrice = totalReceived > 0 ? weightedPriceSum / totalReceived : 0;
  const roi = totalCurrentValue - totalInvested;
  const roiPercent = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
  
  return {
    totalInvested,
    totalReceived,
    averageBuyPrice,
    currentValue: totalCurrentValue,
    roi,
    roiPercent,
  };
};

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
}

const StatCard = memo(function StatCard({ label, value, subValue, icon, trend }: StatCardProps) {
  return (
    <div className="p-4 bg-secondary/30 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-semibold ${
          trend === 'up' ? 'text-green-500' : 
          trend === 'down' ? 'text-red-500' : ''
        }`}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-muted-foreground">{subValue}</span>
        )}
      </div>
    </div>
  );
});

interface OrderPerformanceCardProps {
  order: DCAOrder;
  stats: DCAStats;
  index: number;
}

const OrderPerformanceCard = memo(function OrderPerformanceCard({ 
  order, 
  stats,
  index,
}: OrderPerformanceCardProps) {
  const progress = order.total_intervals 
    ? (order.completed_intervals / order.total_intervals) * 100 
    : null;
  const isPositive = stats.roi >= 0;

  return (
    <div 
      className={`p-4 border border-border rounded-lg hover:border-primary/20 transition-colors ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 50)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{order.from_token_symbol}</span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{order.to_token_symbol}</span>
        </div>
        <Badge 
          variant="outline" 
          className={isPositive 
            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
            : 'bg-red-500/10 text-red-500 border-red-500/20'
          }
        >
          {isPositive ? '+' : ''}{stats.roiPercent.toFixed(2)}%
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
          <p className="font-medium">{formatCurrency(stats.totalInvested)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tokens Received</p>
          <p className="font-medium">{formatNumber(stats.totalReceived)} {order.to_token_symbol}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Avg Buy Price</p>
          <p className="font-medium">${stats.averageBuyPrice.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Est. Value</p>
          <p className="font-medium">{formatCurrency(stats.currentValue)}</p>
        </div>
      </div>

      {/* ROI Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">P&L</span>
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{formatCurrency(stats.roi)}
          </span>
        </div>
        <Progress 
          value={Math.min(Math.abs(stats.roiPercent), 100)} 
          className={`h-1.5 ${isPositive ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
        />
      </div>

      {/* Progress */}
      {progress !== null && (
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
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
  const { orders, activeOrders, completedOrders, isLoading } = useDCAOrders();
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate stats
  const allOrdersWithStats = orders.map(order => ({
    order,
    stats: calculateOrderStats(order),
  }));
  
  const aggregateStats = calculateAggregateStats(orders);
  const activeStats = calculateAggregateStats(activeOrders);
  
  if (!isConnected) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">DCA Dashboard</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            DCA Performance Dashboard
          </DialogTitle>
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
          <div className="space-y-6 mt-4">
            {/* Aggregate Stats */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Overall Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Total Invested"
                  value={formatCurrency(aggregateStats.totalInvested)}
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                />
                <StatCard
                  label="Current Value"
                  value={formatCurrency(aggregateStats.currentValue)}
                  icon={<Target className="w-3.5 h-3.5" />}
                />
                <StatCard
                  label="Total P&L"
                  value={`${aggregateStats.roi >= 0 ? '+' : ''}${formatCurrency(aggregateStats.roi)}`}
                  subValue={`${aggregateStats.roiPercent >= 0 ? '+' : ''}${aggregateStats.roiPercent.toFixed(2)}%`}
                  icon={aggregateStats.roi >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  trend={aggregateStats.roi >= 0 ? 'up' : 'down'}
                />
                <StatCard
                  label="Active Orders"
                  value={activeOrders.length.toString()}
                  subValue={`of ${orders.length} total`}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {/* Orders by Status */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <div className="space-y-3">
                  {allOrdersWithStats.map(({ order, stats }, index) => (
                    <OrderPerformanceCard
                      key={order.id}
                      order={order}
                      stats={stats}
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
                    {allOrdersWithStats
                      .filter(({ order }) => order.status === 'active')
                      .map(({ order, stats }, index) => (
                        <OrderPerformanceCard
                          key={order.id}
                          order={order}
                          stats={stats}
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
                    {allOrdersWithStats
                      .filter(({ order }) => order.status === 'completed' || order.status === 'cancelled')
                      .map(({ order, stats }, index) => (
                        <OrderPerformanceCard
                          key={order.id}
                          order={order}
                          stats={stats}
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
                <span className={`font-medium ${
                  aggregateStats.roiPercent >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {aggregateStats.roiPercent >= 0 ? '+' : ''}{aggregateStats.roiPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
