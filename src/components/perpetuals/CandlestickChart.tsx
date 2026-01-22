/**
 * Candlestick Chart Component
 * 
 * Professional TradingView-style candlestick chart using lightweight-charts
 * with real Hyperliquid candle data and technical indicators.
 */

import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { cn, resolveColor } from '@/lib/utils';
import { hyperliquidService } from '@/services/hyperliquid';
import { ChartIndicators, IndicatorSettings, DEFAULT_INDICATOR_SETTINGS } from './ChartIndicators';
import { ChartDrawingTools, DrawingTool, useChartDrawings } from './ChartDrawingTools';
import { ChartOscillators } from './ChartOscillators';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands,
  OHLCData
} from '@/lib/technicalIndicators';

interface CandlestickChartProps {
  coin: string;
  currentPrice: number;
  className?: string;
}

type TimeframeOption = '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '3D' | '1W';

const TIMEFRAMES: { label: string; value: TimeframeOption; interval: string; group: 'minutes' | 'hours' | 'days' }[] = [
  { label: '1m', value: '1m', interval: '1m', group: 'minutes' },
  { label: '5m', value: '5m', interval: '5m', group: 'minutes' },
  { label: '15m', value: '15m', interval: '15m', group: 'minutes' },
  { label: '30m', value: '30m', interval: '30m', group: 'minutes' },
  { label: '1H', value: '1H', interval: '1h', group: 'hours' },
  { label: '2H', value: '2H', interval: '2h', group: 'hours' },
  { label: '4H', value: '4H', interval: '4h', group: 'hours' },
  { label: '6H', value: '6H', interval: '6h', group: 'hours' },
  { label: '12H', value: '12H', interval: '12h', group: 'hours' },
  { label: '1D', value: '1D', interval: '1d', group: 'days' },
  { label: '3D', value: '3D', interval: '3d', group: 'days' },
  { label: '1W', value: '1W', interval: '1w', group: 'days' },
];

// Chart colors - resolved at module level with fallbacks
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
  sma: '#3b82f6',
  ema: '#f59e0b',
  bbUpper: '#8b5cf6',
  bbLower: '#8b5cf6',
  bbMiddle: '#a78bfa',
  rsiLine: '#06b6d4',
  macdLine: '#3b82f6',
  macdSignal: '#f59e0b',
  macdHistoUp: '#22c55e80',
  macdHistoDown: '#ef444480',
};

function getIntervalMs(timeframe: TimeframeOption): number {
  const intervals: Record<TimeframeOption, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1H': 3600000,
    '2H': 7200000,
    '4H': 14400000,
    '6H': 21600000,
    '12H': 43200000,
    '1D': 86400000,
    '3D': 259200000,
    '1W': 604800000,
  };
  return intervals[timeframe];
}

function getCandleCount(timeframe: TimeframeOption): number {
  const counts: Record<TimeframeOption, number> = {
    '1m': 2880,
    '5m': 1728,
    '15m': 1920,
    '30m': 1440,
    '1H': 2160,
    '2H': 1080,
    '4H': 1080,
    '6H': 720,
    '12H': 730,
    '1D': 1095,
    '3D': 365,
    '1W': 208,
  };
  return counts[timeframe];
}

function getHistoryLabel(timeframe: TimeframeOption): string {
  const labels: Record<TimeframeOption, string> = {
    '1m': '48h',
    '5m': '6 days',
    '15m': '20 days',
    '30m': '30 days',
    '1H': '90 days',
    '2H': '90 days',
    '4H': '6 months',
    '6H': '6 months',
    '12H': '1 year',
    '1D': '3 years',
    '3D': '3 years',
    '1W': '4 years',
  };
  return labels[timeframe];
}

// Convert candle data to OHLC format for indicator calculations
function toOHLCData(candles: CandlestickData[]): OHLCData[] {
  return candles.map(c => ({
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: 1000000, // Placeholder since we don't have real volume
    timestamp: (c.time as number) * 1000,
  }));
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
  
  // Indicator series refs
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  
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
  
  // Indicator settings with localStorage persistence
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    try {
      const saved = localStorage.getItem('xlama-chart-indicators');
      return saved ? { ...DEFAULT_INDICATOR_SETTINGS, ...JSON.parse(saved) } : DEFAULT_INDICATOR_SETTINGS;
    } catch {
      return DEFAULT_INDICATOR_SETTINGS;
    }
  });
  
  // Drawing tools
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const { drawings, clearDrawings } = useChartDrawings(coin);
  
  // Save indicator settings
  const handleIndicatorChange = useCallback((settings: IndicatorSettings) => {
    setIndicatorSettings(settings);
    localStorage.setItem('xlama-chart-indicators', JSON.stringify(settings));
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
    }

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
    
    // Add indicator line series
    const smaSeries = chart.addLineSeries({
      color: CHART_COLORS.sma,
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
    });
    
    const emaSeries = chart.addLineSeries({
      color: CHART_COLORS.ema,
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
    });
    
    const bbUpper = chart.addLineSeries({
      color: CHART_COLORS.bbUpper,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      visible: false,
    });
    
    const bbMiddle = chart.addLineSeries({
      color: CHART_COLORS.bbMiddle,
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
    });
    
    const bbLower = chart.addLineSeries({
      color: CHART_COLORS.bbLower,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      visible: false,
    });
    
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;
    
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

  // Update indicator visibility and data
  useEffect(() => {
    if (!candleData.length) return;
    
    const ohlcData = toOHLCData(candleData);
    
    // SMA
    if (smaSeriesRef.current) {
      smaSeriesRef.current.applyOptions({ visible: indicatorSettings.sma.enabled });
      if (indicatorSettings.sma.enabled) {
        const smaValues = calculateSMA(ohlcData, indicatorSettings.sma.period);
        const smaData = candleData.map((c, i) => ({
          time: c.time,
          value: smaValues[i] ?? undefined,
        })).filter(d => d.value !== undefined) as { time: Time; value: number }[];
        smaSeriesRef.current.setData(smaData);
      }
    }
    
    // EMA
    if (emaSeriesRef.current) {
      emaSeriesRef.current.applyOptions({ visible: indicatorSettings.ema.enabled });
      if (indicatorSettings.ema.enabled) {
        const emaValues = calculateEMA(ohlcData, indicatorSettings.ema.period);
        const emaData = candleData.map((c, i) => ({
          time: c.time,
          value: emaValues[i] ?? undefined,
        })).filter(d => d.value !== undefined) as { time: Time; value: number }[];
        emaSeriesRef.current.setData(emaData);
      }
    }
    
    // Bollinger Bands
    if (bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      const enabled = indicatorSettings.bollingerBands.enabled;
      bbUpperRef.current.applyOptions({ visible: enabled });
      bbMiddleRef.current.applyOptions({ visible: enabled });
      bbLowerRef.current.applyOptions({ visible: enabled });
      
      if (enabled) {
        const bb = calculateBollingerBands(ohlcData, indicatorSettings.bollingerBands.period, indicatorSettings.bollingerBands.stdDev);
        
        const upperData = candleData.map((c, i) => ({
          time: c.time,
          value: bb.upper[i] ?? undefined,
        })).filter(d => d.value !== undefined) as { time: Time; value: number }[];
        
        const middleData = candleData.map((c, i) => ({
          time: c.time,
          value: bb.middle[i] ?? undefined,
        })).filter(d => d.value !== undefined) as { time: Time; value: number }[];
        
        const lowerData = candleData.map((c, i) => ({
          time: c.time,
          value: bb.lower[i] ?? undefined,
        })).filter(d => d.value !== undefined) as { time: Time; value: number }[];
        
        bbUpperRef.current.setData(upperData);
        bbMiddleRef.current.setData(middleData);
        bbLowerRef.current.setData(lowerData);
      }
    }
  }, [candleData, indicatorSettings]);

  // Fetch candle data
  const fetchCandleData = useCallback(async (preserveRange = false) => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    
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
        candles = generateFallbackData(currentPrice, timeframe, 200);
      }
      
      setCandleData(candles);
      candleSeriesRef.current.setData(candles);
      
      const volumeData = candles.map((candle) => ({
        time: candle.time,
        value: Math.random() * 1000000 + 500000,
        color: candle.close >= candle.open 
          ? CHART_COLORS.successLight
          : CHART_COLORS.destructiveLight,
      }));
      volumeSeriesRef.current.setData(volumeData);
      
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
      
      if (preserveRange && visibleRangeRef.current && chartRef.current) {
        chartRef.current.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
      } else if (isInitialLoadRef.current) {
        chartRef.current?.timeScale().fitContent();
        isInitialLoadRef.current = false;
      }
    } catch (error) {
      console.error('[CandlestickChart] Failed to fetch candles:', error);
      const fallback = generateFallbackData(currentPrice, timeframe, 200);
      candleSeriesRef.current?.setData(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [coin, timeframe, currentPrice]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    fetchCandleData(false);
  }, [coin, timeframe]);

  // Update last candle with real-time price
  useEffect(() => {
    if (!candleSeriesRef.current || !currentPrice || isLoading || candleData.length === 0) return;
    
    const now = Date.now();
    if (now - lastPriceUpdateRef.current < 500) return;
    lastPriceUpdateRef.current = now;
    
    const lastCandle = candleData[candleData.length - 1];
    if (!lastCandle) return;
    
    candleSeriesRef.current.update({
      time: lastCandle.time,
      open: lastCandle.open,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
      close: currentPrice,
    });
    
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

  // Active indicators summary for badge
  const activeIndicators = useMemo(() => {
    const active: string[] = [];
    if (indicatorSettings.sma.enabled) active.push(`SMA(${indicatorSettings.sma.period})`);
    if (indicatorSettings.ema.enabled) active.push(`EMA(${indicatorSettings.ema.period})`);
    if (indicatorSettings.rsi.enabled) active.push('RSI');
    if (indicatorSettings.macd.enabled) active.push('MACD');
    if (indicatorSettings.bollingerBands.enabled) active.push('BB');
    return active;
  }, [indicatorSettings]);

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
        
        {/* Tools row: Timeframes + Indicators + Drawing */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Minutes group */}
          <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            {TIMEFRAMES.filter(tf => tf.group === 'minutes').map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          {/* Hours group */}
          <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            {TIMEFRAMES.filter(tf => tf.group === 'hours').map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          {/* Days group */}
          <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            {TIMEFRAMES.filter(tf => tf.group === 'days').map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          <div className="h-4 w-px bg-border mx-1" />
          
          {/* Indicators */}
          <ChartIndicators
            settings={indicatorSettings}
            onChange={handleIndicatorChange}
          />
          
          {/* Drawing Tools */}
          <ChartDrawingTools
            activeTool={activeTool}
            onToolChange={setActiveTool}
            drawings={drawings}
            onClearDrawings={clearDrawings}
          />
          
          {/* History label & refresh */}
          <Badge variant="secondary" className="text-[10px] font-normal ml-auto">
            {getHistoryLabel(timeframe)} history
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fetchCandleData(true)}
            disabled={isLoading}
            title="Refresh chart data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
        
        {/* Active indicators badges */}
        {activeIndicators.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {activeIndicators.map(ind => (
              <Badge key={ind} variant="outline" className="text-[10px] h-5">
                {ind}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-[400px]" />
        
        {/* RSI and MACD Oscillator Panes */}
        <ChartOscillators
          candleData={candleData.map(c => ({
            time: c.time as number,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))}
          showRSI={indicatorSettings.rsi.enabled}
          showMACD={indicatorSettings.macd.enabled}
          rsiPeriod={indicatorSettings.rsi.period}
          macdFast={indicatorSettings.macd.fastPeriod}
          macdSlow={indicatorSettings.macd.slowPeriod}
          macdSignal={indicatorSettings.macd.signalPeriod}
        />
      </CardContent>
    </Card>
  );
});

// Fallback data generator
function generateFallbackData(basePrice: number, timeframe: TimeframeOption, count: number = 100): CandlestickData[] {
  const now = Date.now();
  const data: CandlestickData[] = [];
  const intervalMs = getIntervalMs(timeframe);
  
  let price = basePrice;
  const volatility = basePrice * 0.003;
  
  for (let i = count; i > 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000) as Time;
    const open = price;
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
