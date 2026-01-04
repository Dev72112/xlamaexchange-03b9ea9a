import { memo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Coins, 
  Target, 
  Flame,
  PieChart,
  Calendar
} from 'lucide-react';
import { useTradeAnalytics } from '@/hooks/useTradeAnalytics';
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
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold font-mono">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
});

const Analytics = () => {
  const analytics = useTradeAnalytics();

  return (
    <Layout>
      <Helmet>
        <title>Trading Analytics | xlama</title>
        <meta name="description" content="View your trading analytics, volume history, and performance metrics." />
      </Helmet>

      <div className="container px-4 py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Trading Analytics</h1>
          <p className="text-muted-foreground">
            Track your trading performance and patterns
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={BarChart3} 
            label="Total Trades" 
            value={analytics.totalTrades} 
          />
          <StatCard 
            icon={Target} 
            label="Success Rate" 
            value={`${analytics.successRate.toFixed(1)}%`} 
          />
          <StatCard 
            icon={Coins} 
            label="Unique Tokens" 
            value={analytics.uniqueTokens} 
          />
          <StatCard 
            icon={Flame} 
            label="Trading Streak" 
            value={`${analytics.tradingStreak} days`} 
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Volume Chart */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Daily Trading Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.dailyVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.dailyVolume}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No trading data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chain Distribution */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Chain Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.chainDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <RechartsPie>
                      <Pie
                        data={analytics.chainDistribution}
                        dataKey="count"
                        nameKey="chain"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                      >
                        {analytics.chainDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {analytics.chainDistribution.slice(0, 5).map((chain, index) => (
                      <div key={chain.chain} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs truncate max-w-[100px]">{chain.chain}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {chain.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No chain data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Pairs */}
        <Card className="bg-card/50 border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Most Traded Pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topPairs.length > 0 ? (
              <div className="space-y-3">
                {analytics.topPairs.map((pair, index) => (
                  <div 
                    key={pair.pair}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{pair.pair}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{pair.count} trades</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Start trading to see your most traded pairs
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Trading Day */}
        {analytics.bestTradingDay && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Best Trading Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {new Date(analytics.bestTradingDay.date).toLocaleDateString('en', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <Badge className="bg-primary/10 text-primary">
                  Highest Activity
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
