import { memo, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Coins, 
  Target, 
  Flame,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  RefreshCw,
  Download,
  DollarSign,
  Zap,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { useTradeAnalytics } from '@/hooks/useTradeAnalytics';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
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
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))'];

type TimePeriod = '7d' | '30d' | '90d' | 'all';

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
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
    <Card className="bg-card/50 border-border/50 hover-lift transition-all group">
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
            {subValue && (
              <p className="text-xs text-muted-foreground truncate">{subValue}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg transition-colors flex-shrink-0", variantStyles[variant])}>
            <Icon className={cn("w-4 h-4", iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const EmptyState = memo(function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-1">
          {typeof label === 'string' && label.includes('-') 
            ? new Date(label).toLocaleDateString('en', { month: 'short', day: 'numeric' })
            : label
          }
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name}:
            </span>{' '}
            {entry.name.toLowerCase().includes('volume') || entry.name.toLowerCase().includes('usd')
              ? formatUsd(entry.value)
              : typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const analytics = useTradeAnalytics();
  const { isConnected } = useMultiWallet();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter data based on time period
  const filteredData = useMemo(() => {
    const now = new Date();
    const daysMap: Record<TimePeriod, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': Infinity
    };
    const days = daysMap[timePeriod];
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredDaily = analytics.dailyVolume.filter(d => 
      timePeriod === 'all' || new Date(d.date) >= cutoffDate
    );

    // Recalculate totals for the filtered period
    const periodTrades = filteredDaily.reduce((sum, d) => sum + d.count, 0);
    const periodVolumeUsd = filteredDaily.reduce((sum, d) => sum + d.volumeUsd, 0);
    
    return {
      ...analytics,
      dailyVolume: filteredDaily,
      periodTrades,
      periodVolumeUsd,
      periodAvgTradeSize: periodTrades > 0 ? periodVolumeUsd / periodTrades : 0,
    };
  }, [analytics, timePeriod]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Trades', 'Volume (USD)'].join(','),
      ...filteredData.dailyVolume.map(d => 
        [d.date, d.count, d.volumeUsd.toFixed(2)].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-analytics-${timePeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const weekTrend = analytics.weekOverWeekChange > 0 ? 'up' : analytics.weekOverWeekChange < 0 ? 'down' : 'neutral';

  return (
    <Layout>
      <Helmet>
        <title>Trading Analytics | xlama</title>
        <meta name="description" content="View your trading analytics, volume history, and performance metrics." />
      </Helmet>

      <div className="container px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trading Analytics</h1>
            <p className="text-muted-foreground">
              Track your trading performance and patterns
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs">90D</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleExport}
              className="h-9 w-9"
              disabled={filteredData.dailyVolume.length === 0}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Connection check */}
        {!isConnected && (
          <Card className="bg-primary/5 border-primary/20 mb-8">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="w-5 h-5 text-primary" />
              <p className="text-sm">
                Connect your wallet to see personalized trading analytics
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={DollarSign} 
            label="Total Volume (USD)" 
            value={formatUsd(filteredData.periodVolumeUsd)} 
            subValue={`${filteredData.periodTrades} trades`}
            trend={weekTrend}
            trendValue={`${Math.abs(analytics.weekOverWeekChange).toFixed(0)}% WoW`}
          />
          <StatCard 
            icon={BarChart3} 
            label="Total Trades" 
            value={filteredData.periodTrades.toLocaleString()} 
            subValue={`Avg ${formatUsd(filteredData.periodAvgTradeSize)}/trade`}
            trend={analytics.last7DaysTrades > 0 ? 'up' : 'neutral'}
          />
          <StatCard 
            icon={Target} 
            label="Success Rate" 
            value={`${analytics.successRate.toFixed(1)}%`}
            subValue={`${analytics.failedTrades} failed`}
            trend={analytics.successRate >= 95 ? 'up' : analytics.successRate < 80 ? 'down' : 'neutral'}
            variant={analytics.successRate >= 95 ? 'success' : analytics.successRate < 80 ? 'danger' : 'default'}
          />
          <StatCard 
            icon={Flame} 
            label="Trading Streak" 
            value={`${analytics.tradingStreak} days`}
            subValue={analytics.tradingStreak >= 7 ? "🔥 On fire!" : analytics.tradingStreak >= 3 ? "Keep it up!" : undefined}
            variant={analytics.tradingStreak >= 7 ? 'success' : 'default'}
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard 
            icon={Activity} 
            label="Avg. Trades/Day" 
            value={analytics.avgTradesPerDay.toFixed(1)} 
          />
          <StatCard 
            icon={Coins} 
            label="Unique Tokens" 
            value={analytics.uniqueTokens} 
          />
          <StatCard 
            icon={Calendar} 
            label="Active Days" 
            value={analytics.activeDays} 
          />
          <StatCard 
            icon={Zap} 
            label="Last 7 Days" 
            value={analytics.last7DaysTrades}
            subValue="trades"
          />
          <StatCard 
            icon={Timer} 
            label="Pending" 
            value={analytics.pendingTrades}
            variant={analytics.pendingTrades > 0 ? 'warning' : 'default'}
          />
          <StatCard 
            icon={AlertCircle} 
            label="Failed" 
            value={analytics.failedTrades}
            variant={analytics.failedTrades > 0 ? 'danger' : 'default'}
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Volume & Trades Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Volume & Trades Over Time
              </CardTitle>
              <CardDescription>Daily trading volume (USD) and trade count</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredData.dailyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={filteredData.dailyVolume}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(v) => formatUsd(v)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="volumeUsd" 
                      name="Volume (USD)"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#volumeGradient)" 
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="count"
                      name="Trades"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={BarChart3}
                  title="No trading data"
                  description="Start trading to see your volume chart"
                />
              )}
            </CardContent>
          </Card>

          {/* Chain Distribution */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Chain Distribution
              </CardTitle>
              <CardDescription>Trading activity by blockchain</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.chainDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={220}>
                    <RechartsPie>
                      <Pie
                        data={analytics.chainDistribution}
                        dataKey="volumeUsd"
                        nameKey="chain"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {analytics.chainDistribution.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1 min-w-0">
                    {analytics.chainDistribution.slice(0, 6).map((chain, index) => (
                      <div key={chain.chain} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs truncate flex-1">{chain.chain}</span>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {formatUsd(chain.volumeUsd)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {analytics.chainDistribution.length > 6 && (
                      <p className="text-xs text-muted-foreground">
                        +{analytics.chainDistribution.length - 6} more chains
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState 
                  icon={PieChart}
                  title="No chain data"
                  description="Trade on multiple chains to see distribution"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hourly Distribution */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Trading Hours
            </CardTitle>
            <CardDescription>When you trade the most (24-hour distribution)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.hourlyDistribution.some(h => h.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    interval={2}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    name="Trades"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.9}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                icon={Clock}
                title="No hourly data"
                description="Complete some trades to see your trading patterns"
              />
            )}
          </CardContent>
        </Card>

        {/* Top Pairs & Top Tokens */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pairs */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Most Traded Pairs
              </CardTitle>
              <CardDescription>Top pairs by volume (USD)</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topPairs.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topPairs.slice(0, 6).map((pair, index) => (
                    <div 
                      key={pair.pair}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-muted-foreground w-5 flex-shrink-0">
                          #{index + 1}
                        </span>
                        <span className="font-medium text-sm truncate">{pair.pair}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatUsd(pair.volumeUsd)}</p>
                          <p className="text-xs text-muted-foreground">{pair.count} trades</p>
                        </div>
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ 
                              width: `${(pair.volumeUsd / (analytics.topPairs[0]?.volumeUsd || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={Coins}
                  title="No trading pairs yet"
                  description="Start trading to see your most traded pairs"
                />
              )}
            </CardContent>
          </Card>

          {/* Top Tokens */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                Most Traded Tokens
              </CardTitle>
              <CardDescription>Your favorite tokens by volume</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topTokens.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topTokens.slice(0, 6).map((token, index) => (
                    <div 
                      key={token.symbol}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-muted-foreground w-5 flex-shrink-0">
                          #{index + 1}
                        </span>
                        <span className="font-medium text-sm">{token.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatUsd(token.volumeUsd)}</p>
                          <p className="text-xs text-muted-foreground">{token.trades} trades</p>
                        </div>
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-chart-2 transition-all"
                            style={{ 
                              width: `${(token.volumeUsd / (analytics.topTokens[0]?.volumeUsd || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={Coins}
                  title="No tokens traded yet"
                  description="Start trading to see your favorite tokens"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Best Trading Day */}
        {analytics.bestTradingDay && analytics.bestTradingDay.volumeUsd > 0 && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Best Trading Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-lg font-medium">
                    {new Date(analytics.bestTradingDay.date).toLocaleDateString('en', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Volume: {formatUsd(analytics.bestTradingDay.volumeUsd)} • {analytics.bestTradingDay.count} trades
                  </p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  🏆 Peak Performance
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;