/**
 * Chart Oscillators - RSI and MACD panes
 * 
 * Renders separate indicator panes below the main candlestick chart
 */

import { memo, useEffect, useRef } from 'react';
import { createChart, IChartApi, LineData, HistogramData, ColorType } from 'lightweight-charts';
import { resolveColor } from '@/lib/utils';

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartOscillatorsProps {
  candleData: OHLCData[];
  showRSI: boolean;
  showMACD: boolean;
  rsiPeriod?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
}

// Calculate RSI
function calculateRSI(data: OHLCData[], period: number): (number | null)[] {
  const rsi: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }

    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i < period) {
      rsi.push(null);
      continue;
    }

    if (i === period) {
      // First calculation - simple average
      let totalGain = 0;
      let totalLoss = 0;
      for (let j = 1; j <= period; j++) {
        const c = data[j].close - data[j - 1].close;
        totalGain += c > 0 ? c : 0;
        totalLoss += c < 0 ? Math.abs(c) : 0;
      }
      avgGain = totalGain / period;
      avgLoss = totalLoss / period;
    } else {
      // Smoothed average
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i]);
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }

  return ema;
}

// Calculate MACD
function calculateMACD(
  data: OHLCData[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] } {
  const closes = data.map(d => d.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return { macd: macdLine, signal: signalLine, histogram };
}

export const ChartOscillators = memo(function ChartOscillators({
  candleData,
  showRSI,
  showMACD,
  rsiPeriod = 14,
  macdFast = 12,
  macdSlow = 26,
  macdSignal = 9,
}: ChartOscillatorsProps) {
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // RSI Chart
  useEffect(() => {
    if (!showRSI || !rsiContainerRef.current || candleData.length === 0) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      return;
    }

    const container = rsiContainerRef.current;
    
    // Clean up existing chart
    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
    }

    const textColor = resolveColor('hsl(var(--muted-foreground))', '#888888');
    const borderColor = resolveColor('hsl(var(--border))', '#333333');

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 80,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
      },
      grid: {
        vertLines: { color: borderColor + '40' },
        horzLines: { color: borderColor + '40' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: true, labelVisible: false },
      },
    });

    rsiChartRef.current = chart;

    // RSI line
    const rsiSeries = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    // Overbought line (70)
    const overboughtSeries = chart.addLineSeries({
      color: '#ef444480',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Oversold line (30)
    const oversoldSeries = chart.addLineSeries({
      color: '#22c55e80',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const rsiValues = calculateRSI(candleData, rsiPeriod);
    const rsiData: LineData[] = candleData
      .map((candle, i) => ({
        time: candle.time as any,
        value: rsiValues[i] ?? undefined,
      }))
      .filter(d => d.value !== undefined) as LineData[];

    rsiSeries.setData(rsiData);

    // Set overbought/oversold levels
    if (rsiData.length > 0) {
      overboughtSeries.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
      oversoldSeries.setData(rsiData.map(d => ({ time: d.time, value: 30 })));
    }

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      rsiChartRef.current = null;
    };
  }, [showRSI, candleData, rsiPeriod]);

  // MACD Chart
  useEffect(() => {
    if (!showMACD || !macdContainerRef.current || candleData.length === 0) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
      }
      return;
    }

    const container = macdContainerRef.current;
    
    // Clean up existing chart
    if (macdChartRef.current) {
      macdChartRef.current.remove();
    }

    const textColor = resolveColor('hsl(var(--muted-foreground))', '#888888');
    const borderColor = resolveColor('hsl(var(--border))', '#333333');

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 80,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
      },
      grid: {
        vertLines: { color: borderColor + '40' },
        horzLines: { color: borderColor + '40' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: true, labelVisible: false },
      },
    });

    macdChartRef.current = chart;

    // MACD histogram
    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // MACD line
    const macdLineSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // Signal line
    const signalLineSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const { macd, signal, histogram } = calculateMACD(candleData, macdFast, macdSlow, macdSignal);

    const histogramData: HistogramData[] = candleData.map((candle, i) => ({
      time: candle.time as any,
      value: histogram[i],
      color: histogram[i] >= 0 ? '#22c55e60' : '#ef444460',
    }));

    const macdData: LineData[] = candleData.map((candle, i) => ({
      time: candle.time as any,
      value: macd[i],
    }));

    const signalData: LineData[] = candleData.map((candle, i) => ({
      time: candle.time as any,
      value: signal[i],
    }));

    histogramSeries.setData(histogramData);
    macdLineSeries.setData(macdData);
    signalLineSeries.setData(signalData);

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdChartRef.current = null;
    };
  }, [showMACD, candleData, macdFast, macdSlow, macdSignal]);

  if (!showRSI && !showMACD) return null;

  return (
    <div className="space-y-px border-t border-border/50 mt-1">
      {showRSI && (
        <div className="relative">
          <div className="absolute top-0.5 left-2 z-10 flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              RSI({rsiPeriod})
            </span>
            <span className="text-[9px] text-red-400">70</span>
            <span className="text-[9px] text-green-400">30</span>
          </div>
          <div ref={rsiContainerRef} className="w-full" />
        </div>
      )}
      {showMACD && (
        <div className="relative border-t border-border/30">
          <div className="absolute top-0.5 left-2 z-10 flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              MACD({macdFast},{macdSlow},{macdSignal})
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-blue-500 rounded" />
              <span className="text-[9px] text-blue-400">MACD</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-orange-500 rounded" />
              <span className="text-[9px] text-orange-400">Signal</span>
            </span>
          </div>
          <div ref={macdContainerRef} className="w-full" />
        </div>
      )}
    </div>
  );
});
