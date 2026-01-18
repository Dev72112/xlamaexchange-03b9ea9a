/**
 * Candlestick Chart Component
 * 
 * Professional TradingView-style candlestick chart using lightweight-charts.
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, CrosshairMode } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandlestickChartProps {
  coin: string;
  currentPrice: number;
  className?: string;
}

type TimeframeOption = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

const TIMEFRAMES: { label: string; value: TimeframeOption }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1H' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
];

// Generate mock candlestick data - in production, fetch from Hyperliquid API
function generateCandleData(basePrice: number, timeframe: TimeframeOption, count: number = 100): CandlestickData[] {
  const now = Date.now();
  const data: CandlestickData[] = [];
  
  const intervalMs: Record<TimeframeOption, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1H': 3600000,
    '4H': 14400000,
    '1D': 86400000,
  };
  
  let price = basePrice * 0.95; // Start slightly below current
  const volatility = basePrice * 0.005; // 0.5% volatility per candle
  
  for (let i = count; i > 0; i--) {
    const time = Math.floor((now - i * intervalMs[timeframe]) / 1000) as Time;
    const open = price;
    const change = (Math.random() - 0.48) * volatility; // Slight upward bias
    const high = open + Math.abs(change) + Math.random() * volatility * 0.5;
    const low = open - Math.abs(change) - Math.random() * volatility * 0.5;
    const close = open + change;
    
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

export const CandlestickChart = memo(function CandlestickChart({
  coin,
  currentPrice,
  className,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const [timeframe, setTimeframe] = useState<TimeframeOption>('15m');
  const [isLoading, setIsLoading] = useState(true);
  const [priceInfo, setPriceInfo] = useState({
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    change: 0,
    changePercent: 0,
  });

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }
    
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--muted-foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border) / 0.5)' },
        horzLines: { color: 'hsl(var(--border) / 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          labelBackgroundColor: 'hsl(var(--primary))',
        },
        horzLine: {
          labelBackgroundColor: 'hsl(var(--primary))',
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });
    
    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: 'hsl(142.1 76.2% 36.3%)', // success color
      downColor: 'hsl(0 84.2% 60.2%)', // destructive color
      borderVisible: false,
      wickUpColor: 'hsl(142.1 76.2% 36.3%)',
      wickDownColor: 'hsl(0 84.2% 60.2%)',
    });
    
    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: 'hsl(var(--primary) / 0.3)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    
    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });
    
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    
    // Subscribe to crosshair move
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
    
    // Handle resize
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

  // Load/update data when coin or timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !currentPrice) return;
    
    setIsLoading(true);
    
    // Simulate data fetch - in production, call Hyperliquid API
    setTimeout(() => {
      const candleData = generateCandleData(currentPrice, timeframe);
      candleSeriesRef.current?.setData(candleData);
      
      // Generate volume data
      const volumeData = candleData.map((candle) => ({
        time: candle.time,
        value: Math.random() * 1000000 + 500000,
        color: candle.close >= candle.open 
          ? 'hsl(142.1 76.2% 36.3% / 0.4)' 
          : 'hsl(0 84.2% 60.2% / 0.4)',
      }));
      volumeSeriesRef.current?.setData(volumeData);
      
      // Set initial price info from last candle
      const lastCandle = candleData[candleData.length - 1];
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
      
      // Fit content
      chartRef.current?.timeScale().fitContent();
      setIsLoading(false);
    }, 300);
  }, [coin, timeframe, currentPrice]);

  // Update last candle with real-time price
  useEffect(() => {
    if (!candleSeriesRef.current || !currentPrice || isLoading) return;
    
    // Update the last candle's close price
    const now = Math.floor(Date.now() / 1000) as Time;
    candleSeriesRef.current.update({
      time: now,
      open: priceInfo.open || currentPrice,
      high: Math.max(priceInfo.high || currentPrice, currentPrice),
      low: Math.min(priceInfo.low || currentPrice, currentPrice),
      close: currentPrice,
    });
  }, [currentPrice, isLoading, priceInfo.open, priceInfo.high, priceInfo.low]);

  const handleRefresh = useCallback(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    setIsLoading(true);
    setTimeout(() => {
      const candleData = generateCandleData(currentPrice, timeframe);
      candleSeriesRef.current?.setData(candleData);
      chartRef.current?.timeScale().fitContent();
      setIsLoading(false);
    }, 200);
  }, [currentPrice, timeframe]);

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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-auto"
            onClick={handleRefresh}
            disabled={isLoading}
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
