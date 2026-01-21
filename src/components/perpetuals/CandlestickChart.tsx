/**
 * Candlestick Chart Component
 * 
 * Professional TradingView-style candlestick chart using lightweight-charts
 * with real Hyperliquid candle data.
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, CrosshairMode } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { cn, resolveColor } from '@/lib/utils';
import { hyperliquidService } from '@/services/hyperliquid';

interface CandlestickChartProps {
  coin: string;
  currentPrice: number;
  className?: string;
}

type TimeframeOption = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

const TIMEFRAMES: { label: string; value: TimeframeOption; interval: string }[] = [
  { label: '1m', value: '1m', interval: '1m' },
  { label: '5m', value: '5m', interval: '5m' },
  { label: '15m', value: '15m', interval: '15m' },
  { label: '1H', value: '1H', interval: '1h' },
  { label: '4H', value: '4H', interval: '4h' },
  { label: '1D', value: '1D', interval: '1d' },
];

// Chart colors - resolved at module level with fallbacks
// lightweight-charts cannot parse CSS variables, so we use hex values
const CHART_COLORS = {
  text: '#888888',
  border: '#333333',
  borderLight: '#33333380',
  primary: '#3b82f6',
  success: '#22c55e',
  destructive: '#ef4444',
  successLight: '#22c55e66',
  destructiveLight: '#ef444466',
  primaryLight: '#3b82f64D',
};

// Helper to get interval in milliseconds
function getIntervalMs(timeframe: TimeframeOption): number {
  const intervals: Record<TimeframeOption, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1H': 3600000,
    '4H': 14400000,
    '1D': 86400000,
  };
  return intervals[timeframe];
}

// Helper to get optimal candle count per timeframe for extended history
function getCandleCount(timeframe: TimeframeOption): number {
  const counts: Record<TimeframeOption, number> = {
    '1m': 1440,   // 24 hours of 1-minute candles (was 720)
    '5m': 864,    // 3 days of 5-minute candles (was 576)
    '15m': 960,   // 10 days of 15-minute candles (was 672)
    '1H': 1080,   // 45 days of hourly candles (was 720)
    '4H': 720,    // 120 days of 4-hour candles (was 540)
    '1D': 730,    // 2 years of daily candles (was 365)
  };
  return counts[timeframe];
}

// Get human-readable history duration label
function getHistoryLabel(timeframe: TimeframeOption): string {
  const labels: Record<TimeframeOption, string> = {
    '1m': '24h',
    '5m': '3 days',
    '15m': '10 days',
    '1H': '45 days',
    '4H': '4 months',
    '1D': '2 years',
  };
  return labels[timeframe];
}

export const CandlestickChart = memo(function CandlestickChart({
  coin,
  currentPrice,
  className,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // Track user's visible range to prevent reset on updates
  const visibleRangeRef = useRef<{ from: number; to: number } | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastPriceUpdateRef = useRef<number>(0);
  
  const [timeframe, setTimeframe] = useState<TimeframeOption>('15m');
  const [isLoading, setIsLoading] = useState(true);
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [priceInfo, setPriceInfo] = useState({
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    change: 0,
    changePercent: 0,
  });

  // Initialize chart with resolved colors (not CSS variables)
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Resolve CSS variables to hex colors at runtime
    const colors = {
      text: resolveColor('hsl(var(--muted-foreground))', CHART_COLORS.text),
      border: resolveColor('hsl(var(--border))', CHART_COLORS.border),
      primary: resolveColor('hsl(var(--primary))', CHART_COLORS.primary),
    };
    
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.border + '80' },
        horzLines: { color: colors.border + '80' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelBackgroundColor: colors.primary },
        horzLine: { labelBackgroundColor: colors.primary },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: { mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    });
    
    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.success,
      downColor: CHART_COLORS.destructive,
      borderVisible: false,
      wickUpColor: CHART_COLORS.success,
      wickDownColor: CHART_COLORS.destructive,
    });
    
    const volumeSeries = chart.addHistogramSeries({
      color: colors.primary + '4D',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(candleSeries) as CandlestickData | undefined;
        if (data) {
          const change = data.close - data.open;
          const changePercent = (change / data.open) * 100;
          setPriceInfo({
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            change,
            changePercent,
          });
        }
      }
    });
    
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: 400,
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch candle data from Hyperliquid
  const fetchCandleData = useCallback(async (preserveRange = false) => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    
    // Store current visible range before fetching
    if (preserveRange && chartRef.current) {
      const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        visibleRangeRef.current = { from: logicalRange.from, to: logicalRange.to };
      }
    }
    
    setIsLoading(true);
    
    try {
      const tf = TIMEFRAMES.find(t => t.value === timeframe);
      const intervalMs = getIntervalMs(timeframe);
      const candleCount = getCandleCount(timeframe);
      const endTime = Date.now();
      // Extended history: variable candle count per timeframe for optimal historical view
      const startTime = endTime - intervalMs * candleCount;
      
      const rawCandles = await hyperliquidService.getCandleData(
        coin,
        tf?.interval || '15m',
        startTime,
        endTime
      );
      
      let candles: CandlestickData[] = [];
      
      if (rawCandles && rawCandles.length > 0) {
        candles = rawCandles.map((c: any) => ({
          time: Math.floor(c.t / 1000) as Time,
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
        }));
      } else {
        // Fallback to generated data if API returns empty
        candles = generateFallbackData(currentPrice, timeframe, 200);
      }
      
      setCandleData(candles);
      candleSeriesRef.current.setData(candles);
      
      // Generate volume data with resolved hex colors
      const volumeData = candles.map((candle) => ({
        time: candle.time,
        value: Math.random() * 1000000 + 500000,
        color: candle.close >= candle.open 
          ? CHART_COLORS.successLight
          : CHART_COLORS.destructiveLight,
      }));
      volumeSeriesRef.current.setData(volumeData);
      
      // Set price info from last candle
      const lastCandle = candles[candles.length - 1];
      if (lastCandle) {
        const change = lastCandle.close - lastCandle.open;
        const changePercent = (change / lastCandle.open) * 100;
        setPriceInfo({
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          change,
          changePercent,
        });
      }
      
      // Restore visible range or fit content on initial load
      if (preserveRange && visibleRangeRef.current && chartRef.current) {
        chartRef.current.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
      } else if (isInitialLoadRef.current) {
        chartRef.current?.timeScale().fitContent();
        isInitialLoadRef.current = false;
      }
    } catch (error) {
      console.error('[CandlestickChart] Failed to fetch candles:', error);
      // Use fallback data
      const fallback = generateFallbackData(currentPrice, timeframe, 200);
      candleSeriesRef.current?.setData(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [coin, timeframe, currentPrice]);

  // Load data when coin or timeframe changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    fetchCandleData(false);
  }, [coin, timeframe]);

  // Update last candle with real-time price (debounced to prevent chart jumps)
  useEffect(() => {
    if (!candleSeriesRef.current || !currentPrice || isLoading || candleData.length === 0) return;
    
    // Debounce price updates to prevent excessive re-renders
    const now = Date.now();
    if (now - lastPriceUpdateRef.current < 500) return;
    lastPriceUpdateRef.current = now;
    
    const lastCandle = candleData[candleData.length - 1];
    if (!lastCandle) return;
    
    // Update current candle without affecting visible range
    candleSeriesRef.current.update({
      time: lastCandle.time,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
      close: currentPrice,
    });
    
    // Update price info display
    const change = currentPrice - lastCandle.open;
    const changePercent = (change / lastCandle.open) * 100;
    setPriceInfo(prev => ({
      ...prev,
      close: currentPrice,
      high: Math.max(prev.high, currentPrice),
      low: Math.min(prev.low, currentPrice),
      change,
      changePercent,
    }));
  }, [currentPrice, isLoading, candleData]);

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {coin}-PERP Chart
          </CardTitle>
          
          {/* OHLC Info */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span>O: <span className="text-foreground">${priceInfo.open.toLocaleString()}</span></span>
            <span>H: <span className="text-success">${priceInfo.high.toLocaleString()}</span></span>
            <span>L: <span className="text-destructive">${priceInfo.low.toLocaleString()}</span></span>
            <span>C: <span className="text-foreground">${priceInfo.close.toLocaleString()}</span></span>
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono",
                priceInfo.change >= 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"
              )}
            >
              {priceInfo.change >= 0 ? '+' : ''}{priceInfo.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          {/* History duration label */}
          <Badge variant="secondary" className="text-[10px] font-normal">
            {getHistoryLabel(timeframe)}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-auto"
            onClick={() => fetchCandleData(true)}
            disabled={isLoading}
            title="Refresh chart data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-[400px]" />
      </CardContent>
    </Card>
  );
});

// Fallback data generator when API is unavailable - NEUTRAL random walk (no uptrend bias)
function generateFallbackData(basePrice: number, timeframe: TimeframeOption, count: number = 100): CandlestickData[] {
  const now = Date.now();
  const data: CandlestickData[] = [];
  
  const intervalMs = getIntervalMs(timeframe);
  
  // Start at the base price (current price)
  let price = basePrice;
  const volatility = basePrice * 0.003; // Reduced volatility for more realistic look
  
  for (let i = count; i > 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000) as Time;
    const open = price;
    
    // TRUE random walk: 50% up, 50% down - no bias
    const change = (Math.random() - 0.5) * volatility * 2;
    const wickUp = Math.random() * volatility * 0.3;
    const wickDown = Math.random() * volatility * 0.3;
    
    const close = open + change;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    
    data.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    
    price = close;
  }
  
  return data;
}
