import { memo, useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/shared/components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnifiedChainSelector, ChainFilterValue } from '@/components/ui/UnifiedChainSelector';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';
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
  AlertCircle,
  Scale,
  Trophy,
  Frown,
  Layers,
  ArrowRightLeft,
  Fuel
} from 'lucide-react';
import { useTradeAnalytics, useTradeVsHodl, useGasAnalytics, type TimePeriod } from '@/features/analytics';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { SUPPORTED_CHAINS, getChainIcon, getEvmChains, getNonEvmChains } from '@/data/chains';
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

// Import analytics components from feature module
import { LivePriceWidget, TokenPnLChart, GasBreakdown, WalletHoldings, TradingHeatmap, TradingEfficiencyScore, SnapshotButton } from '@/features/analytics';


const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))'];

const formatUsd = (value: number, compact = false) => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  if (absValue >= 100) return `${sign}$${absValue.toFixed(2)}`;
  if (absValue >= 1) return `${sign}$${absValue.toFixed(2)}`;
  if (absValue >= 0.01) return `${sign}$${absValue.toFixed(3)}`;
  if (absValue >= 0.0001) return `${sign}$${absValue.toFixed(4)}`;
  if (absValue >= 0.000001) return `${sign}$${absValue.toFixed(6)}`;
  if (absValue === 0) return '$0.00';
  return `${sign}$${absValue.toExponential(2)}`;
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
  const { 
    isConnected,
    isOkxConnected,
    evmAddress,
    solanaAddress,
    tronAddress 
  } = useMultiWallet();
  const { globalChainFilter, setGlobalChainFilter } = useExchangeMode();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use global chain filter for analytics
  const chainFilter = globalChainFilter === 'all-evm' ? 'all' : globalChainFilter;
  
  // Pass timePeriod to analytics hook - all filtering happens inside the hook
  const analytics = useTradeAnalytics(chainFilter, timePeriod);
  const tradeVsHodl = useTradeVsHodl();
  const gasAnalytics = useGasAnalytics(chainFilter);

  // Get all supported chains for the filter, grouped by EVM/Non-EVM
  const evmChains = useMemo(() => getEvmChains(), []);
  const nonEvmChains = useMemo(() => getNonEvmChains(), []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
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
    a.download = `trading-analytics-${chainFilter === 'all' ? 'all-chains' : chainFilter}-${timePeriod}.csv`;
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
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Trading Analytics</h1>
              <p className="text-muted-foreground">
                Track your trading performance and patterns
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
              
              <SnapshotButton className="h-9 w-9" />
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleExport}
                className="h-9 w-9"
                disabled={analytics.dailyVolume.length === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Chain Filter - Unified Selector */}
            <UnifiedChainSelector
              value={globalChainFilter}
              onChange={(value) => setGlobalChainFilter(value)}
              showAllOption={true}
              showEvmOnlyOption={true}
            />

            {/* Time Period */}
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <TabsList className="bg-secondary/50 h-9">
                <TabsTrigger value="24h" className="text-xs min-h-[36px]">24H</TabsTrigger>
                <TabsTrigger value="3d" className="text-xs min-h-[36px]">3D</TabsTrigger>
                <TabsTrigger value="7d" className="text-xs min-h-[36px]">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs min-h-[36px]">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs min-h-[36px]">90D</TabsTrigger>
                <TabsTrigger value="all" className="text-xs min-h-[36px]">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Trade Source Badge */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Badge variant="outline" className="text-xs gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                DEX: {analytics.dexTradesCount}
              </Badge>
              {analytics.instantTradesCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Zap className="w-3 h-3" />
                  Instant: {analytics.instantTradesCount}
                </Badge>
              )}
              {analytics.bridgeTradesCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Layers className="w-3 h-3" />
                  Bridge: {analytics.bridgeTradesCount}
                </Badge>
              )}
            </div>
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
            value={formatUsd(analytics.totalVolumeUsd)} 
            subValue={`${analytics.totalTrades} trades`}
            trend={weekTrend}
            trendValue={`${Math.abs(analytics.weekOverWeekChange).toFixed(0)}% WoW`}
          />
          <StatCard 
            icon={BarChart3} 
            label="Total Trades" 
            value={analytics.totalTrades.toLocaleString()} 
            subValue={`Avg ${formatUsd(analytics.avgTradeSizeUsd)}/trade`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
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
            icon={Fuel} 
            label="Est. Gas Spent" 
            value={formatUsd(gasAnalytics.totalGasUsd)}
            subValue={`~${formatUsd(gasAnalytics.avgGasPerTrade)}/trade`}
          />
          <StatCard 
            icon={Zap} 
            label="Last 7 Days" 
            value={analytics.last7DaysTrades}
            subValue="trades"
          />
          <StatCard 
            icon={Target} 
            label="Successful" 
            value={analytics.totalTrades - analytics.failedTrades - analytics.pendingTrades}
            variant="success"
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
              {/* Use hourly data for 24h view, daily for others */}
              {timePeriod === '24h' && analytics.hourlyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={analytics.hourlyVolume}>
                    <defs>
                      <linearGradient id="volumeGradientHourly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                      fill="url(#volumeGradientHourly)" 
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
              ) : analytics.dailyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={analytics.dailyVolume}>
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
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={180} className="sm:!w-1/2 sm:!h-[220px]">
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
                  <ScrollArea className="h-[180px] sm:h-[220px] flex-1 min-w-0 pr-2">
                    <div className="space-y-2">
                      {analytics.chainDistribution.map((chain, index) => {
                        const chainData = SUPPORTED_CHAINS.find(c => c.chainIndex === chain.chainIndex);
                        return (
                          <div key={chain.chain} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {chainData && (
                              <img 
                                src={getChainIcon(chainData)} 
                                alt={chain.chain}
                                className="w-4 h-4 rounded-full flex-shrink-0"
                              />
                            )}
                            <span className="text-xs truncate flex-1">{chain.chain}</span>
                            {chainData && !chainData.isEvm && (
                              <Badge variant="secondary" className="text-[8px] py-0 px-1">
                                Non-EVM
                              </Badge>
                            )}
                            <div className="text-right flex-shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                {formatUsd(chain.volumeUsd)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
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

        {/* Wallet Holdings, Live Prices, Gas & P&L Section */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <WalletHoldings 
            holdings={tradeVsHodl.walletHoldings} 
            isLoading={tradeVsHodl.isLoadingHoldings}
            totalValue={tradeVsHodl.hodlCurrentValue}
          />
          <LivePriceWidget chainFilter={chainFilter} />
          <TokenPnLChart chainFilter={chainFilter} />
          <GasBreakdown chainFilter={chainFilter} />
        </div>

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
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {analytics.topPairs.map((pair, index) => (
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
                </ScrollArea>
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
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {analytics.topTokens.map((token, index) => (
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
                </ScrollArea>
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

        {/* Trade vs HODL Analysis */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Trade vs HODL Analysis
            </CardTitle>
            <CardDescription>
              Compare your trading performance against simply holding
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradeVsHodl.isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
                <Skeleton className="h-32" />
              </div>
            ) : tradeVsHodl.tradesAnalyzed > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Trade P&L</p>
                    <p className={cn(
                      "text-xl font-semibold font-mono",
                      tradeVsHodl.tradePnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {tradeVsHodl.tradePnl >= 0 ? '+' : ''}{formatUsd(tradeVsHodl.tradePnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">Current value of trades</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Wallet HODL P&L</p>
                    <p className={cn(
                      "text-xl font-semibold font-mono",
                      tradeVsHodl.hodlPnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {tradeVsHodl.hodlPnl >= 0 ? '+' : ''}{formatUsd(tradeVsHodl.hodlPnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tradeVsHodl.hodlCurrentValue > 0 
                        ? `Holdings: ${formatUsd(tradeVsHodl.hodlCurrentValue)}` 
                        : 'Your actual holdings P&L'}
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg",
                    tradeVsHodl.tradingWasBetter ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Trade vs HODL %</p>
                    <p className={cn(
                      "text-xl font-semibold font-mono",
                      tradeVsHodl.tradingWasBetter ? "text-green-500" : "text-red-500"
                    )}>
                      {tradeVsHodl.tradeVsHodlDiff >= 0 ? '+' : ''}{tradeVsHodl.tradeVsHodlDiff.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tradeVsHodl.tradingWasBetter ? 'Trading outperformed' : 'HODL outperformed'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Trade Win Rate</p>
                    <p className="text-xl font-semibold font-mono">
                      {tradeVsHodl.tradesAnalyzed > 0 
                        ? ((tradeVsHodl.winningTrades / tradeVsHodl.tradesAnalyzed) * 100).toFixed(0) 
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tradeVsHodl.winningTrades} profitable / {tradeVsHodl.losingTrades} unprofitable
                    </p>
                  </div>
                </div>

                {/* Cumulative Performance Chart */}
                {tradeVsHodl.cumulativeData.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Cumulative Performance Over Time</h4>
                    <p className="text-xs text-muted-foreground">
                      Shows how your trades performed vs holding over each successive trade
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={tradeVsHodl.cumulativeData}>
                        <defs>
                          <linearGradient id="tradePnlGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="hodlPnlGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickFormatter={(v) => formatUsd(v)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="tradePnl" 
                          name="Trade P&L (USD)"
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fill="url(#tradePnlGradient)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="hodlPnl" 
                          name="HODL P&L (USD)"
                          stroke="hsl(var(--chart-3))" 
                          strokeWidth={2}
                          fill="url(#hodlPnlGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-primary rounded" />
                        <span className="text-muted-foreground">Trade P&L</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-chart-3 rounded" />
                        <span className="text-muted-foreground">HODL P&L</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Best & Worst Trade */}
                <div className="grid md:grid-cols-2 gap-4">
                  {tradeVsHodl.bestTrade && tradeVsHodl.bestTrade.tradePnl > 0 && (
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500">Best Trade</span>
                      </div>
                      <p className="font-medium">
                        {tradeVsHodl.bestTrade.fromSymbol} → {tradeVsHodl.bestTrade.toSymbol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Profit:{' '}
                        <span className="text-green-500 font-medium">
                          {formatUsd(tradeVsHodl.bestTrade.tradePnl)}
                        </span>
                        {' '}({tradeVsHodl.bestTrade.tradePnlPercent > 0 ? '+' : ''}
                        {tradeVsHodl.bestTrade.tradePnlPercent.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(tradeVsHodl.bestTrade.date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {tradeVsHodl.worstTrade && tradeVsHodl.worstTrade.tradePnl < 0 && (
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Frown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">Worst Trade</span>
                      </div>
                      <p className="font-medium">
                        {tradeVsHodl.worstTrade.fromSymbol} → {tradeVsHodl.worstTrade.toSymbol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Loss:{' '}
                        <span className="text-red-500 font-medium">
                          {formatUsd(Math.abs(tradeVsHodl.worstTrade.tradePnl))}
                        </span>
                        {' '}({tradeVsHodl.worstTrade.tradePnlPercent.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(tradeVsHodl.worstTrade.date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Trade Performance List */}
                {tradeVsHodl.trades.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Recent Trade Performance</h4>
                    <ScrollArea className="h-[250px] pr-2">
                      <div className="space-y-2">
                        {tradeVsHodl.trades.map((trade) => (
                          <div 
                            key={trade.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                trade.tradePnl >= 0 ? "bg-green-500" : "bg-red-500"
                              )} />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {trade.fromSymbol} → {trade.toSymbol}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(trade.date).toLocaleDateString()} • {trade.chainName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={cn(
                                "text-sm font-medium font-mono",
                                trade.tradePnl >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {trade.tradePnl >= 0 ? '+' : ''}{formatUsd(trade.tradePnl)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {trade.tradePnlPercent >= 0 ? '+' : ''}{trade.tradePnlPercent.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Analyzed {tradeVsHodl.tradesAnalyzed} of {tradeVsHodl.totalTrades} trades • 
                  Prices update every minute
                </p>
              </div>
            ) : (
              <EmptyState 
                icon={Scale}
                title="No trade data to analyze"
                description="Complete some trades with USD value tracking to see how your trades compare to holding"
              />
            )}
          </CardContent>
        </Card>

        {/* Heatmap & Efficiency Score */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <TradingHeatmap 
            trades={tradeVsHodl.trades.map(t => ({ timestamp: t.date }))}
            isLoading={tradeVsHodl.isLoading}
          />
          <TradingEfficiencyScore
            tradePnlPercent={tradeVsHodl.tradePnlPercent}
            hodlPnlPercent={tradeVsHodl.hodlPnlPercent}
            tradingWasBetter={tradeVsHodl.tradingWasBetter}
            successRate={analytics.successRate}
            winRate={tradeVsHodl.tradesAnalyzed > 0 ? (tradeVsHodl.winningTrades / tradeVsHodl.tradesAnalyzed) * 100 : 0}
            avgGasPerTrade={gasAnalytics.avgGasPerTrade}
            totalGasUsd={gasAnalytics.totalGasUsd}
            totalVolumeUsd={analytics.totalVolumeUsd}
            isLoading={tradeVsHodl.isLoading}
          />
        </div>

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
