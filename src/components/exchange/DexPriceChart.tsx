import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { okxDexService, CandlestickData, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  ReferenceLine,
} from 'recharts';

interface DexPriceChartProps {
  chain: Chain | null;
  token: OkxToken | null;
  className?: string;
}

const TIME_FRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1H', label: '1H' },
  { value: '4H', label: '4H' },
  { value: '1D', label: '1D' },
];

export function DexPriceChart({ chain, token, className }: DexPriceChartProps) {
  const [candlesticks, setCandlesticks] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('1H');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandlesticks = async () => {
      if (!chain || !token) {
        setCandlesticks([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await okxDexService.getCandlesticks(
          chain.chainIndex,
          token.tokenContractAddress,
          timeFrame,
          50
        );
        setCandlesticks(data.reverse()); // Oldest first for chart
      } catch (err) {
        console.error('Failed to fetch candlesticks:', err);
        setError('Failed to load chart data');
        setCandlesticks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandlesticks();
  }, [chain?.chainIndex, token?.tokenContractAddress, timeFrame]);

  const chartData = useMemo(() => {
    return candlesticks.map((candle) => {
      const open = parseFloat(candle.o);
      const close = parseFloat(candle.c);
      const high = parseFloat(candle.h);
      const low = parseFloat(candle.l);
      const isUp = close >= open;

      return {
        time: new Date(parseInt(candle.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: parseInt(candle.ts),
        open,
        close,
        high,
        low,
        volume: parseFloat(candle.volUsd),
        // For candlestick visualization using bars
        candleBody: Math.abs(close - open),
        candleBase: Math.min(open, close),
        wickHigh: high,
        wickLow: low,
        isUp,
        color: isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
      };
    });
  }, [candlesticks]);

  const { priceChange, priceChangePercent, currentPrice, isPositive } = useMemo(() => {
    if (chartData.length < 2) {
      return { priceChange: 0, priceChangePercent: 0, currentPrice: 0, isPositive: true };
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const change = last.close - first.open;
    const changePercent = (change / first.open) * 100;
    return {
      priceChange: change,
      priceChangePercent: changePercent,
      currentPrice: last.close,
      isPositive: change >= 0,
    };
  }, [chartData]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.0001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  if (!chain || !token) {
    return null;
  }

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={token.tokenLogoUrl}
              alt={token.tokenSymbol}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
              }}
            />
            <div>
              <CardTitle className="text-lg font-bold">{token.tokenSymbol}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{formatPrice(currentPrice)}</span>
                {chartData.length > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(priceChangePercent).toFixed(2)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
            {TIME_FRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={timeFrame === tf.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFrame(tf.value)}
                className="h-7 text-xs px-2"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No chart data available</p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => formatPrice(value).replace('$', '')}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'close') return [formatPrice(value), 'Price'];
                    if (name === 'volume') return [`$${value.toLocaleString()}`, 'Volume'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <ReferenceLine
                  y={chartData[0]?.open}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Bar
                  dataKey="volume"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.2}
                  yAxisId="volume"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
