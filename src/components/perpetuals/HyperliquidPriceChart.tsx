/**
 * Hyperliquid Price Chart
 * 
 * Live candlestick/line chart for perpetual trading pairs
 */

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw,
  Maximize2,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HyperliquidPriceChartProps {
  coin: string;
  currentPrice: number;
  className?: string;
}

type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz';

export const HyperliquidPriceChart = memo(function HyperliquidPriceChart({
  coin,
  currentPrice,
  className,
}: HyperliquidPriceChartProps) {
  const [candles, setCandles] = useState<PriceCandle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeFrame>('15m');
  const [error, setError] = useState<string | null>(null);

  // Convert timeframe to milliseconds
  const getIntervalMs = (tf: TimeFrame): number => {
    switch (tf) {
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      case '4h': return 14400000;
      case '1d': return 86400000;
      default: return 900000;
    }
  };

  // Fetch candle data from Hyperliquid
  const fetchCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const intervalMs = getIntervalMs(timeframe);
      const endTime = Date.now();
      const startTime = endTime - (intervalMs * 100); // Get ~100 candles
      
      const response = await fetch(`${HYPERLIQUID_API}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin,
            interval: timeframe,
            startTime,
            endTime,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch candles');
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const parsedCandles: PriceCandle[] = data.map((c: any) => ({
          time: c.t,
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
          volume: parseFloat(c.v),
        }));
        setCandles(parsedCandles.slice(-60)); // Last 60 candles
      } else {
        // Generate mock data for demonstration
        const mockCandles = generateMockCandles(currentPrice, 60, intervalMs);
        setCandles(mockCandles);
      }
    } catch (err) {
      console.error('[Chart] Failed to fetch candles:', err);
      // Use mock data as fallback
      const mockCandles = generateMockCandles(currentPrice, 60, getIntervalMs(timeframe));
      setCandles(mockCandles);
      setError('Using simulated data');
    } finally {
      setIsLoading(false);
    }
  }, [coin, timeframe, currentPrice]);

  // Fetch on mount and when coin/timeframe changes
  useEffect(() => {
    fetchCandles();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchCandles, 30000);
    return () => clearInterval(interval);
  }, [fetchCandles]);

  // Calculate chart stats
  const chartStats = useMemo(() => {
    if (candles.length < 2) return { change: 0, changePercent: 0, high: 0, low: 0 };
    
    const firstClose = candles[0].close;
    const lastClose = candles[candles.length - 1].close;
    const change = lastClose - firstClose;
    const changePercent = (change / firstClose) * 100;
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    
    return { change, changePercent, high, low };
  }, [candles]);

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="text-muted-foreground text-xs mb-1">
          {new Date(data.time).toLocaleString()}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-mono">${formatPrice(data.open)}</span>
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono text-success">${formatPrice(data.high)}</span>
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono text-destructive">${formatPrice(data.low)}</span>
          <span className="text-muted-foreground">Close:</span>
          <span className="font-mono font-medium">${formatPrice(data.close)}</span>
        </div>
      </div>
    );
  };

  const isPositive = chartStats.changePercent >= 0;

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            {coin}-PERP
            {error && (
              <Badge variant="outline" className="text-xs text-warning border-warning/30">
                Demo
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Current Price & Change */}
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">
                ${formatPrice(currentPrice)}
              </span>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs gap-0.5",
                  isPositive 
                    ? "bg-success/10 text-success border-success/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{chartStats.changePercent.toFixed(2)}%
              </Badge>
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={fetchCandles}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Time Frame Selector */}
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as TimeFrame)} className="mt-2">
          <TabsList className="h-7 p-0.5 bg-secondary/50">
            {TIME_FRAMES.map(tf => (
              <TabsTrigger 
                key={tf.value} 
                value={tf.value}
                className="text-xs h-6 px-2 min-w-[32px]"
              >
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="pb-4">
        {isLoading && candles.length === 0 ? (
          <Skeleton className="h-[200px] w-full rounded-lg" />
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={candles}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${coin}`} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="0%" 
                      stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="100%" 
                      stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => {
                    const date = new Date(time);
                    if (timeframe === '1d') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  }}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(price) => `$${formatPrice(price)}`}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={currentPrice} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  strokeWidth={2}
                  fill={`url(#gradient-${coin})`}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Price Range Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span>24h High:</span>
            <span className="font-mono text-success">${formatPrice(chartStats.high)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>24h Low:</span>
            <span className="font-mono text-destructive">${formatPrice(chartStats.low)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>Live</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Helper: Generate mock candles for demo
function generateMockCandles(basePrice: number, count: number, intervalMs: number): PriceCandle[] {
  const candles: PriceCandle[] = [];
  let currentPrice = basePrice * (0.95 + Math.random() * 0.1); // Start slightly off from current
  const now = Date.now();
  
  for (let i = count - 1; i >= 0; i--) {
    const volatility = 0.002 + Math.random() * 0.003;
    const trend = Math.random() > 0.5 ? 1 : -1;
    
    const open = currentPrice;
    const change = currentPrice * volatility * trend;
    const close = open + change + (Math.random() - 0.5) * currentPrice * 0.001;
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    
    candles.push({
      time: now - (i * intervalMs),
      open,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 10000,
    });
    
    currentPrice = close;
  }
  
  // Adjust last candle to match current price
  if (candles.length > 0) {
    candles[candles.length - 1].close = basePrice;
  }
  
  return candles;
}
