import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import type { DCAOrder } from '@/hooks/useDCAOrders';
import { format, parseISO, differenceInDays } from 'date-fns';

interface DCAHistoryChartProps {
  orders: DCAOrder[];
  currentValues: Map<string, number>;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  invested: number;
  value: number;
  purchases: { symbol: string; amount: string }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as ChartDataPoint;
  
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground mb-2">
        {format(new Date(data.timestamp), 'MMM d, yyyy')}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Invested:</span>
          <span className="text-sm font-medium">${data.invested.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">Value:</span>
          <span className="text-sm font-medium">${data.value.toFixed(2)}</span>
        </div>
        {data.purchases.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Purchases:</p>
            {data.purchases.map((p, i) => (
              <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                {p.amount} {p.symbol}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export function DCAHistoryChart({ orders, currentValues }: DCAHistoryChartProps) {
  const chartData = useMemo(() => {
    if (orders.length === 0) return [];

    // Collect all execution events
    const events: { date: Date; invested: number; orderId: string; symbol: string; amount: string }[] = [];

    orders.forEach(order => {
      const startDate = parseISO(order.start_date);
      const completedIntervals = order.completed_intervals || 0;
      const amountPerInterval = parseFloat(order.amount_per_interval);

      // Calculate interval in days
      let intervalDays = 1;
      switch (order.frequency) {
        case 'weekly': intervalDays = 7; break;
        case 'biweekly': intervalDays = 14; break;
        case 'monthly': intervalDays = 30; break;
      }

      // Generate events for completed intervals
      for (let i = 0; i < completedIntervals; i++) {
        const eventDate = new Date(startDate);
        eventDate.setDate(eventDate.getDate() + (i * intervalDays));
        
        events.push({
          date: eventDate,
          invested: amountPerInterval,
          orderId: order.id,
          symbol: order.to_token_symbol,
          amount: order.total_received 
            ? (parseFloat(order.total_received) / completedIntervals).toFixed(4)
            : '0'
        });
      }
    });

    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (events.length === 0) return [];

    // Build cumulative chart data
    const dataPoints: ChartDataPoint[] = [];
    let cumulativeInvested = 0;
    
    // Group events by date
    const eventsByDate = new Map<string, typeof events>();
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    // Calculate total current value
    let totalCurrentValue = 0;
    orders.forEach(order => {
      const value = currentValues.get(order.id);
      if (value) totalCurrentValue += value;
    });

    const totalInvested = orders.reduce((sum, o) => sum + parseFloat(o.total_spent || '0'), 0);

    // Generate data points
    eventsByDate.forEach((dayEvents, dateKey) => {
      const dayInvested = dayEvents.reduce((sum, e) => sum + e.invested, 0);
      cumulativeInvested += dayInvested;

      // Estimate value at this point (linear interpolation)
      const progress = cumulativeInvested / totalInvested;
      const estimatedValue = totalCurrentValue * progress;

      dataPoints.push({
        date: dateKey,
        timestamp: new Date(dateKey).getTime(),
        invested: cumulativeInvested,
        value: estimatedValue,
        purchases: dayEvents.map(e => ({ symbol: e.symbol, amount: e.amount }))
      });
    });

    // Add current point
    if (dataPoints.length > 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const lastPoint = dataPoints[dataPoints.length - 1];
      
      if (lastPoint.date !== today) {
        dataPoints.push({
          date: today,
          timestamp: new Date().getTime(),
          invested: totalInvested,
          value: totalCurrentValue,
          purchases: []
        });
      } else {
        lastPoint.value = totalCurrentValue;
      }
    }

    return dataPoints;
  }, [orders, currentValues]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;

    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const totalInvested = last.invested;
    const currentValue = last.value;
    const roi = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
    const days = differenceInDays(new Date(last.timestamp), new Date(first.timestamp));

    return { totalInvested, currentValue, roi, days };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            DCA History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No DCA execution history yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            DCA History
          </CardTitle>
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{stats.days} days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">${stats.totalInvested.toFixed(2)}</span>
              </div>
              <Badge variant={stats.roi >= 0 ? 'default' : 'destructive'}>
                {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                stroke="hsl(var(--border))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="invested"
                name="Total Invested"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#investedGradient)"
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Current Value"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fill="url(#valueGradient)"
              />
              {/* Purchase markers */}
              {chartData
                .filter(d => d.purchases.length > 0)
                .map((d, i) => (
                  <ReferenceDot
                    key={i}
                    x={d.timestamp}
                    y={d.invested}
                    r={4}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
