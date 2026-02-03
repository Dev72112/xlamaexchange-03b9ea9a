/**
 * xLama Analytics Tab
 * Unified trading metrics from xLama API with OKX fallback
 */

import { memo, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Layers,
  Info,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useXlamaAnalytics, type AnalyticsPeriod } from '@/hooks/useXlamaAnalytics';
import { XlamaSyncStatus } from '@/components/XlamaSyncStatus';
import { useLocalDexHistory } from '@/hooks/useLocalDexHistory';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import { cn } from '@/lib/utils';

// Distinct colors for bar chart visualization
const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
import { useQueryClient } from '@tanstack/react-query';

// Lazy load the volume chart and new components
const VolumeOverTimeChart = lazy(() => import('@/components/VolumeOverTimeChart'));
const ChainHeatmap = lazy(() => import('@/components/analytics/ChainHeatmap'));
const TradePatterns = lazy(() => import('@/components/analytics/TradePatterns'));

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const formatUsd = (value: number) => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  return `${sign}$${absValue.toFixed(2)}`;
};

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  loading = false,
  variant = 'default'
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'pnl';
}) {
  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const variantStyles = {
    default: 'bg-primary/10 group-hover:bg-primary/20',
    success: 'bg-green-500/10 group-hover:bg-green-500/20',
    warning: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
    danger: 'bg-red-500/10 group-hover:bg-red-500/20',
    pnl: trend === 'up' ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    pnl: trend === 'up' ? 'text-green-500' : 'text-red-500',
  };

  return (
    <Card className="bg-card/50 border-border/50 hover-lift transition-all group sweep-effect">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn(
                "text-2xl font-semibold font-mono truncate",
                variant === 'pnl' && (trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : '')
              )}>{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={cn(
                  "flex items-center text-xs font-medium whitespace-nowrap",
                  trend === 'up' ? "text-green-500" : "text-red-500"
                )}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
              )}
            </div>
            {subValue && <p className="text-xs text-muted-foreground truncate">{subValue}</p>}
          </div>
          <div className={cn("p-2 rounded-lg transition-colors flex-shrink-0", variantStyles[variant])}>
            <Icon className={cn("w-4 h-4", iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const XlamaAnalyticsTab = memo(function XlamaAnalyticsTab() {
  const { activeAddress } = useMultiWallet();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const analytics = useXlamaAnalytics({ period, enabled: true });
  
  // Local DB transaction count for data quality indicator
  const { data: localTxs } = useLocalDexHistory({ limit: 1000, enabled: true });
  const localTxCount = localTxs?.length ?? 0;

  const pnlTrend = analytics.realizedPnl > 0 ? 'up' : analytics.realizedPnl < 0 ? 'down' : 'neutral';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['xlama-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['local-dex-history'] });
    await analytics.refetch();
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [queryClient, analytics]);

  // Chain distribution data for pie chart
  const chainData = useMemo(() => {
    return analytics.mostUsedChains.map(c => ({
      name: c.chain,
      value: c.count,
    }));
  }, [analytics.mostUsedChains]);

  // Chain data for heatmap (enhanced format) - derive from available data
  const chainHeatmapData = useMemo(() => {
    return analytics.mostUsedChains.map(c => ({
      chain: c.chain,
      chainIndex: c.chain, // Use chain name as identifier
      trades: c.count,
      volume: 0, // Volume not available per-chain in current API
    }));
  }, [analytics.mostUsedChains]);
  
  // Calculate data quality percentage - compare API trades vs local DB trades
  const dataQuality = useMemo(() => {
    const apiTrades = analytics.totalTrades;
    const localTrades = localTxCount;
    // If we have local trades and API matches or exceeds, quality is good
    if (localTrades === 0) return { pct: 100, label: 'No data yet' };
    const matchRate = Math.min(100, Math.round((apiTrades / localTrades) * 100));
    return { 
      pct: matchRate, 
      label: matchRate >= 90 ? 'Excellent' : matchRate >= 70 ? 'Good' : matchRate >= 50 ? 'Fair' : 'Syncing...'
    };
  }, [analytics.totalTrades, localTxCount]);

  return (
    <div className="space-y-6">
      {/* Controls with Sync Status */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <XlamaSyncStatus />
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30D</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-2">90D</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 gap-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Total Trades"
          value={analytics.totalTrades.toLocaleString()}
          subValue={`${analytics.totalSwaps} swaps, ${analytics.totalBridges} bridges`}
          loading={analytics.isLoading}
        />
        <StatCard
          icon={DollarSign}
          label="Trading Volume"
          value={formatUsd(analytics.totalVolume)}
          subValue={`${formatUsd(analytics.totalFees)} in fees`}
          loading={analytics.isLoading}
        />
        <StatCard
          icon={pnlTrend === 'up' ? TrendingUp : TrendingDown}
          label="Realized PnL"
          value={formatUsd(analytics.realizedPnl)}
          trend={pnlTrend}
          variant="pnl"
          loading={analytics.isLoading}
        />
        <StatCard
          icon={Coins}
          label="Unrealized PnL"
          value={formatUsd(analytics.unrealizedPnl ?? 0)}
          trend={(analytics.unrealizedPnl ?? 0) > 0 ? 'up' : (analytics.unrealizedPnl ?? 0) < 0 ? 'down' : 'neutral'}
          variant="pnl"
          loading={analytics.isLoading}
        />
        <StatCard
          icon={Target}
          label="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          variant={analytics.successRate >= 90 ? 'success' : analytics.successRate >= 70 ? 'warning' : 'danger'}
          loading={analytics.isLoading}
        />
        <StatCard
          icon={dataQuality.pct >= 90 ? CheckCircle2 : Info}
          label="Data Quality"
          value={`${dataQuality.pct}%`}
          subValue={dataQuality.label}
          variant={dataQuality.pct >= 90 ? 'success' : dataQuality.pct >= 70 ? 'default' : 'warning'}
          loading={analytics.isLoading}
        />
      </div>

      {/* Charts - Two column on desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Most Traded Pairs */}
        {analytics.mostTradedPairs.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Most Traded Pairs
                <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">
                  <LineChart className="w-2.5 h-2.5 mr-1" />
                  xLama
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52 lg:h-60 xl:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={analytics.mostTradedPairs} 
                    layout="vertical" 
                    barSize={18}
                    margin={{ top: 5, right: 40, left: 0, bottom: 20 }}
                  >
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Trades', position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))', offset: 0 }}
                    />
                    <YAxis 
                      dataKey="pair" 
                      type="category" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} 
                      width={110}
                      tickFormatter={(value: string) => value.length > 14 ? `${value.slice(0, 12)}...` : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value} trades`, 'Count']}
                    />
                    <Bar 
                      dataKey="trade_count" 
                      name="Trades" 
                      radius={[0, 6, 6, 0]}
                    >
                      {analytics.mostTradedPairs.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="trade_count" 
                        position="right" 
                        fontSize={11}
                        fill="hsl(var(--foreground))"
                        formatter={(value: number) => value}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chain Distribution */}
        {chainData.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Chain Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Stack vertically on mobile, side by side on desktop */}
              <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
                {/* Chart - responsive sizing */}
                <div className="w-full max-w-[180px] h-[160px] lg:w-48 lg:h-48 xl:w-56 xl:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={chainData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chainData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                {/* Legend - grid on mobile, vertical list on desktop */}
                <div className="w-full lg:flex-1 grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {chainData.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-mono text-xs lg:text-sm shrink-0 ml-2">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Volume Over Time Chart */}
      <Suspense fallback={
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      }>
        <VolumeOverTimeChart />
      </Suspense>

      {/* Chain Activity Heatmap */}
      {chainHeatmapData.length > 0 && (
        <Suspense fallback={
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        }>
          <ChainHeatmap 
            chainData={chainHeatmapData} 
            isLoading={analytics.isLoading}
          />
        </Suspense>
      )}


      {/* Trade Frequency */}
      {analytics.tradeFrequency && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Trading Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold font-mono">{analytics.tradeFrequency.daily_avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Daily Avg</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold font-mono">{analytics.tradeFrequency.weekly_avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Weekly Avg</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold font-mono">{analytics.tradeFrequency.monthly_avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Monthly Avg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default XlamaAnalyticsTab;
