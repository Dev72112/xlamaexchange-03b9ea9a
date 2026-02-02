/**
 * Volume Over Time Chart
 * Displays trading volume aggregated by day/week from local dex_transactions
 */

import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useLocalDexHistory } from '@/hooks/useLocalDexHistory';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, parseISO, startOfDay, startOfWeek, eachDayOfInterval, eachWeekOfInterval, subDays } from 'date-fns';

type Granularity = 'daily' | 'weekly';

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export const VolumeOverTimeChart = memo(function VolumeOverTimeChart() {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const { data: transactions, isLoading } = useLocalDexHistory({ limit: 1000, enabled: true });

  const chartData = useMemo(() => {
    if (!transactions?.length) return [];

    const now = new Date();
    const startDate = subDays(now, granularity === 'daily' ? 30 : 90);
    
    // Create buckets for each time period
    const intervals = granularity === 'daily' 
      ? eachDayOfInterval({ start: startDate, end: now })
      : eachWeekOfInterval({ start: startDate, end: now });

    // Aggregate volume by period
    const volumeByPeriod = new Map<string, number>();
    
    intervals.forEach(date => {
      const key = format(date, 'yyyy-MM-dd');
      volumeByPeriod.set(key, 0);
    });

    transactions.forEach(tx => {
      const txDate = parseISO(tx.created_at);
      const periodStart = granularity === 'daily' 
        ? startOfDay(txDate) 
        : startOfWeek(txDate, { weekStartsOn: 1 });
      const key = format(periodStart, 'yyyy-MM-dd');
      
      // Use from_amount_usd or to_amount_usd
      const volume = tx.from_amount_usd || tx.to_amount_usd || 0;
      
      if (volumeByPeriod.has(key)) {
        volumeByPeriod.set(key, (volumeByPeriod.get(key) || 0) + volume);
      }
    });

    return Array.from(volumeByPeriod.entries())
      .map(([date, volume]) => ({
        date,
        volume,
        label: granularity === 'daily' 
          ? format(parseISO(date), 'MMM d')
          : `Week of ${format(parseISO(date), 'MMM d')}`,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, granularity]);

  const totalVolume = useMemo(() => 
    chartData.reduce((sum, d) => sum + d.volume, 0),
    [chartData]
  );

  if (isLoading) {
    return (
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length || totalVolume === 0) {
    return null; // Don't show if no data
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Volume Over Time
            <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">
              <BarChart3 className="w-2.5 h-2.5 mr-1" />
              {formatUsd(totalVolume)} total
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={granularity === 'daily' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setGranularity('daily')}
            >
              Daily
            </Button>
            <Button
              variant={granularity === 'weekly' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setGranularity('weekly')}
            >
              Weekly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 lg:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatUsd}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatUsd(value), 'Volume']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default VolumeOverTimeChart;
