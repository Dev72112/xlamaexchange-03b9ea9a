import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { cn } from '@/lib/utils';
import {
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: 365 },
] as const;

interface PortfolioPnLChartProps {
  className?: string;
}

export function PortfolioPnLChart({ className }: PortfolioPnLChartProps) {
  const { dailyData, isLoading, getPnLMetrics, getFilteredData, exportToCSV } = usePortfolioPnL();
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);

  const filteredData = useMemo(() => 
    getFilteredData(selectedTimeframe), 
    [getFilteredData, selectedTimeframe]
  );

  const metrics = useMemo(() => 
    getPnLMetrics(selectedTimeframe), 
    [getPnLMetrics, selectedTimeframe]
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (dailyData.length < 2) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Portfolio History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            <p>Not enough data yet</p>
            <p className="text-xs mt-1">History will appear as your portfolio is tracked</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = metrics && metrics.absoluteChange >= 0;
  const chartColor = isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            P&L
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {TIMEFRAMES.map(tf => (
                <Button
                  key={tf.label}
                  variant={selectedTimeframe === tf.days ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedTimeframe(tf.days)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={exportToCSV}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to CSV</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {metrics && (
          <div className="flex items-baseline gap-3 mt-2">
            <span className={cn(
              "text-lg font-bold",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? '+' : ''}{formatCurrency(metrics.absoluteChange)}
            </span>
            <span className={cn(
              "text-sm",
              isPositive ? "text-success" : "text-destructive"
            )}>
              ({isPositive ? '+' : ''}{metrics.percentChange.toFixed(2)}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis 
                hide 
                domain={['dataMin', 'dataMax']}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                      <p className="text-xs text-muted-foreground">{formatDate(data.date)}</p>
                      <p className="text-sm font-medium">{formatCurrency(data.value)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
