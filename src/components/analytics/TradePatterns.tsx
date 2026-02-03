/**
 * Trade Patterns Chart
 * Shows when the user trades most - by hour of day and day of week
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface TradeTimestamp {
  timestamp: Date | string;
}

interface TradePatternsProps {
  trades: TradeTimestamp[];
  isLoading?: boolean;
  className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const TradePatterns = memo(function TradePatterns({
  trades,
  isLoading = false,
  className,
}: TradePatternsProps) {
  // Analyze patterns
  const patterns = useMemo(() => {
    if (trades.length === 0) return null;

    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();

    trades.forEach(trade => {
      const date = new Date(trade.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    // Find peak hour and day
    let peakHour = 0, peakHourCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > peakHourCount) {
        peakHour = hour;
        peakHourCount = count;
      }
    });

    let peakDay = 0, peakDayCount = 0;
    dayCounts.forEach((count, day) => {
      if (count > peakDayCount) {
        peakDay = day;
        peakDayCount = count;
      }
    });

    // Format hour data
    const hourData = HOURS.map(hour => ({
      hour: hour.toString().padStart(2, '0'),
      trades: hourCounts.get(hour) || 0,
      isPeak: hour === peakHour,
    }));

    // Format day data
    const dayData = DAYS.map((day, index) => ({
      day,
      trades: dayCounts.get(index) || 0,
      isPeak: index === peakDay,
    }));

    // Generate insight
    const formatHour = (h: number) => {
      if (h === 0) return '12 AM';
      if (h === 12) return '12 PM';
      return h > 12 ? `${h - 12} PM` : `${h} AM`;
    };

    const insight = `You trade most on ${DAYS[peakDay]}s around ${formatHour(peakHour)}`;

    return { hourData, dayData, insight, peakHour, peakDay };
  }, [trades]);

  if (isLoading) {
    return (
      <Card className={cn("glass border-border/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Trading Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 skeleton-shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!patterns || trades.length < 5) {
    return null; // Not enough data for meaningful patterns
  }

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Trading Patterns
          <Badge variant="outline" className="text-[10px] py-0">
            <TrendingUp className="w-2.5 h-2.5 mr-1" />
            Insight
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insight callout */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {patterns.insight}
          </p>
        </div>

        {/* Hour of Day Chart */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Hour of Day (UTC)</span>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patterns.hourData} barSize={8}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  interval={2}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [`${value} trades`, '']}
                  labelFormatter={(label) => `${label}:00`}
                />
                <Bar dataKey="trades" radius={[4, 4, 0, 0]}>
                  {patterns.hourData.map((entry, index) => (
                    <Cell 
                      key={`hour-${index}`} 
                      fill={entry.isPeak 
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--primary) / 0.4)'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week Chart */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Day of Week</span>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patterns.dayData} barSize={24}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [`${value} trades`, '']}
                />
                <Bar dataKey="trades" radius={[4, 4, 0, 0]}>
                  {patterns.dayData.map((entry, index) => (
                    <Cell 
                      key={`day-${index}`} 
                      fill={entry.isPeak 
                        ? 'hsl(var(--primary))' 
                        : 'hsl(var(--primary) / 0.4)'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default TradePatterns;
