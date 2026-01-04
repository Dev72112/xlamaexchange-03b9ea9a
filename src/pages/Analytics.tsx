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
  Download
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
  LineChart,
  Line,
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

type TimePeriod = '7d' | '30d' | '90d' | 'all';

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  loading = false
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
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

  return (
    <Card className="bg-card/50 border-border/50 hover-lift transition-all group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold font-mono">{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  trend === 'up' ? "text-green-500" : "text-red-500"
                )}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
              )}
            </div>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
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
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
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
    
    return {
      ...analytics,
      dailyVolume: analytics.dailyVolume.filter(d => 
        timePeriod === 'all' || new Date(d.date) >= cutoffDate
      )
    };
  }, [analytics, timePeriod]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Trades', 'Volume'].join(','),
      ...filteredData.dailyVolume.map(d => 
        [d.date, d.count, d.volume.toFixed(4)].join(',')
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

  return (
    <Layout>
      <Helmet>
        <title>Trading Analytics | xlama</title>
        <meta name="description" content="View your trading analytics, volume history, and performance metrics." />
      </Helmet>

      <div className="container px-4 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trading Analytics</h1>
            <p className="text-muted-foreground">
              Track your trading performance and patterns
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={BarChart3} 
            label="Total Trades" 
            value={filteredData.totalTrades.toLocaleString()} 
            trend={filteredData.totalTrades > 0 ? 'up' : 'neutral'}
          />
          <StatCard 
            icon={Target} 
            label="Success Rate" 
            value={`${filteredData.successRate.toFixed(1)}%`}
            trend={filteredData.successRate >= 90 ? 'up' : filteredData.successRate < 70 ? 'down' : 'neutral'}
          />
          <StatCard 
            icon={Coins} 
            label="Unique Tokens" 
            value={filteredData.uniqueTokens} 
          />
          <StatCard 
            icon={Flame} 
            label="Trading Streak" 
            value={`${filteredData.tradingStreak} days`}
            subValue={filteredData.tradingStreak > 0 ? "Keep it going!" : undefined}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Activity} 
            label="Avg. Trades/Day" 
            value={filteredData.avgTradesPerDay.toFixed(1)} 
          />
          <StatCard 
            icon={TrendingUp} 
            label="Total Volume" 
            value={filteredData.totalVolume > 1000 
              ? `${(filteredData.totalVolume / 1000).toFixed(1)}K` 
              : filteredData.totalVolume.toFixed(2)
            } 
          />
          <StatCard 
            icon={Clock} 
            label="Avg. Trade Size" 
            value={filteredData.avgTradeSize.toFixed(4)} 
          />
          <StatCard 
            icon={Calendar} 
            label="Active Days" 
            value={filteredData.dailyVolume.length} 
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Volume Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Daily Trading Activity
              </CardTitle>
              <CardDescription>Number of trades per day</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredData.dailyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={filteredData.dailyVolume}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Trades"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#colorCount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={BarChart3}
                  title="No trading data"
                  description="Start trading to see your daily activity chart"
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
              {filteredData.chainDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <RechartsPie>
                      <Pie
                        data={filteredData.chainDistribution}
                        dataKey="count"
                        nameKey="chain"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {filteredData.chainDistribution.map((_, index) => (
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
                    {filteredData.chainDistribution.slice(0, 5).map((chain, index) => (
                      <div key={chain.chain} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs truncate flex-1">{chain.chain}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {chain.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                    {filteredData.chainDistribution.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{filteredData.chainDistribution.length - 5} more chains
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

        {/* Volume Chart */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume Trend
            </CardTitle>
            <CardDescription>Trading volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.dailyVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filteredData.dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="volume" 
                    name="Volume"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.9}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                icon={TrendingUp}
                title="No volume data"
                description="Complete some trades to track your volume"
              />
            )}
          </CardContent>
        </Card>

        {/* Top Pairs */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Most Traded Pairs
            </CardTitle>
            <CardDescription>Your top 5 trading pairs by frequency</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.topPairs.length > 0 ? (
              <div className="space-y-3">
                {filteredData.topPairs.map((pair, index) => (
                  <div 
                    key={pair.pair}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{pair.pair}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{pair.count} trades</p>
                        <p className="text-xs text-muted-foreground">
                          Vol: {pair.volume.toFixed(4)}
                        </p>
                      </div>
                      <div 
                        className="w-16 h-2 rounded-full bg-secondary overflow-hidden"
                      >
                        <div 
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ 
                            width: `${(pair.count / filteredData.topPairs[0].count) * 100}%` 
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

        {/* Best Trading Day */}
        {filteredData.bestTradingDay && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Best Trading Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium">
                    {new Date(filteredData.bestTradingDay.date).toLocaleDateString('en', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Volume: {filteredData.bestTradingDay.volume.toFixed(4)}
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