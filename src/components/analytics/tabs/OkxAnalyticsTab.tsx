/**
 * OKX Analytics Tab
 * Trading volume and gas analytics from local transaction context
 */

import { memo, useState, useMemo, useCallback } from 'react';
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
  Fuel,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useTradeAnalytics, type TimePeriod } from '@/hooks/useTradeAnalytics';
import { useGasAnalytics } from '@/hooks/useGasAnalytics';
import { GasBreakdown } from '@/components/analytics/GasBreakdown';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

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
  trendValue,
  loading = false,
  variant = 'default'
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
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
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  return (
    <Card className="bg-card/50 border-border/50 hover-lift transition-all group sweep-effect">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-semibold font-mono truncate">{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={cn(
                  "flex items-center text-xs font-medium whitespace-nowrap",
                  trend === 'up' ? "text-green-500" : "text-red-500"
                )}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {trendValue}
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            <span className="font-medium" style={{ color: entry.color }}>{entry.name}:</span>{' '}
            {entry.name.toLowerCase().includes('volume') || entry.name.toLowerCase().includes('usd')
              ? formatUsd(entry.value)
              : typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const OkxAnalyticsTab = memo(function OkxAnalyticsTab() {
  const { activeAddress } = useMultiWallet();
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const analytics = useTradeAnalytics('all', timePeriod);
  const gasAnalytics = useGasAnalytics('all');

  const weekTrend = analytics.weekOverWeekChange > 0 ? 'up' : analytics.weekOverWeekChange < 0 ? 'down' : 'neutral';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['trade-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['gas-analytics'] });
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [queryClient]);

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Date', 'Trades', 'Volume (USD)'].join(','),
      ...analytics.dailyVolume.map(d => 
        [d.date, d.count, d.volumeUsd.toFixed(2)].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okx-trading-analytics-${timePeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analytics.dailyVolume, timePeriod]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30D</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-2">90D</TabsTrigger>
              <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 gap-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Total Trades"
          value={analytics.totalTrades.toLocaleString()}
          subValue={`${analytics.uniqueTokens} unique tokens`}
          trend={weekTrend}
          trendValue={`${Math.abs(analytics.weekOverWeekChange).toFixed(1)}%`}
        />
        <StatCard
          icon={DollarSign}
          label="Trading Volume"
          value={formatUsd(analytics.totalVolumeUsd)}
          subValue={`Avg ${formatUsd(analytics.avgTradeSizeUsd)}/trade`}
        />
        <StatCard
          icon={Target}
          label="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          subValue={`${analytics.failedTrades} failed trades`}
          variant={analytics.successRate >= 90 ? 'success' : analytics.successRate >= 70 ? 'warning' : 'danger'}
        />
        <StatCard
          icon={Fuel}
          label="Total Gas Spent"
          value={formatUsd(gasAnalytics.totalGasUsd)}
          subValue={`${gasAnalytics.gasPerChain.reduce((sum, c) => sum + c.txCount, 0)} transactions`}
        />
      </div>

      {/* Charts - Two column on desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Volume Chart */}
        {analytics.dailyVolume.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Trading Volume
                <Badge variant="outline" className="text-[10px] py-0">OKX</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 lg:h-80 xl:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyVolume}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatUsd(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="volumeUsd" 
                      name="Volume" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#volumeGradient)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chain Distribution */}
        {analytics.chainDistribution.length > 0 && (
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Chain Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 lg:h-56 xl:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.chainDistribution} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="chain" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Trades" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gas Analytics */}
      <GasBreakdown />
    </div>
  );
});

export default OkxAnalyticsTab;
