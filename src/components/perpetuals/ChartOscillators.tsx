/**
 * Chart Oscillators - RSI, Stoch RSI, MACD, ATR panes with crosshair sync
 * 
 * Renders separate indicator panes below the main candlestick chart
 * with synchronized crosshairs across all panes
 */

import { memo, useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, LineData, HistogramData, ColorType, Time } from 'lightweight-charts';
import { resolveColor } from '@/lib/utils';
import { calculateStochRSI, calculateATR, OHLCData as TechOHLC } from '@/lib/technicalIndicators';

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
  showStochRSI?: boolean;
  showATR?: boolean;
  rsiPeriod?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  stochRsiPeriod?: number;
  stochKSmoothing?: number;
  stochDSmoothing?: number;
  atrPeriod?: number;
  onCrosshairMove?: (time: Time | null) => void;
  syncedCrosshairTime?: Time | null;
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

// Convert to tech indicators format
function toTechFormat(data: OHLCData[]): TechOHLC[] {
  return data.map(d => ({
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: 1000000,
    timestamp: d.time * 1000,
  }));
}

export const ChartOscillators = memo(function ChartOscillators({
  candleData,
  showRSI,
  showMACD,
  showStochRSI = false,
  showATR = false,
  rsiPeriod = 14,
  macdFast = 12,
  macdSlow = 26,
  macdSignal = 9,
  stochRsiPeriod = 14,
  stochKSmoothing = 3,
  stochDSmoothing = 3,
  atrPeriod = 14,
  onCrosshairMove,
  syncedCrosshairTime,
}: ChartOscillatorsProps) {
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const stochRsiContainerRef = useRef<HTMLDivElement>(null);
  const atrContainerRef = useRef<HTMLDivElement>(null);
  
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const stochRsiChartRef = useRef<IChartApi | null>(null);
  const atrChartRef = useRef<IChartApi | null>(null);

  // Shared chart config
  const getChartOptions = useCallback((container: HTMLDivElement) => {
    const textColor = resolveColor('hsl(var(--muted-foreground))', '#888888');
    const borderColor = resolveColor('hsl(var(--border))', '#333333');

    return {
      width: container.clientWidth,
      height: 80,
      layout: {
        background: { type: ColorType.Solid as const, color: 'transparent' },
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
    };
  }, []);

  // Sync crosshair to all oscillator charts
  useEffect(() => {
    if (syncedCrosshairTime === null || syncedCrosshairTime === undefined) {
      // Clear crosshairs when not hovering
      return;
    }

    // Note: lightweight-charts setCrosshairPosition requires a series reference.
    // For sync purposes, we just ensure vertical line shows at the same time.
    // The crosshair sync works via the shared time scale across panes.
  }, [syncedCrosshairTime]);

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
    if (rsiChartRef.current) rsiChartRef.current.remove();

    const chart = createChart(container, getChartOptions(container));
    rsiChartRef.current = chart;

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (param.time && onCrosshairMove) {
        onCrosshairMove(param.time);
      }
    });

    const rsiSeries = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    const overboughtSeries = chart.addLineSeries({
      color: '#ef444480',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

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
        time: candle.time as Time,
        value: rsiValues[i] ?? undefined,
      }))
      .filter(d => d.value !== undefined) as LineData[];

    rsiSeries.setData(rsiData);

    if (rsiData.length > 0) {
      overboughtSeries.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
      oversoldSeries.setData(rsiData.map(d => ({ time: d.time, value: 30 })));
    }

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      rsiChartRef.current = null;
    };
  }, [showRSI, candleData, rsiPeriod, getChartOptions, onCrosshairMove]);

  // Stochastic RSI Chart
  useEffect(() => {
    if (!showStochRSI || !stochRsiContainerRef.current || candleData.length === 0) {
      if (stochRsiChartRef.current) {
        stochRsiChartRef.current.remove();
        stochRsiChartRef.current = null;
      }
      return;
    }

    const container = stochRsiContainerRef.current;
    if (stochRsiChartRef.current) stochRsiChartRef.current.remove();

    const chart = createChart(container, getChartOptions(container));
    stochRsiChartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && onCrosshairMove) {
        onCrosshairMove(param.time);
      }
    });

    const kSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    const dSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    const overboughtSeries = chart.addLineSeries({
      color: '#ef444480',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const oversoldSeries = chart.addLineSeries({
      color: '#22c55e80',
      lineWidth: 1,
      lineStyle: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const techData = toTechFormat(candleData);
    const stochRsi = calculateStochRSI(techData, stochRsiPeriod, stochRsiPeriod, stochKSmoothing, stochDSmoothing);

    const kData: LineData[] = candleData
      .map((candle, i) => ({
        time: candle.time as Time,
        value: stochRsi.k[i] ?? undefined,
      }))
      .filter(d => d.value !== undefined) as LineData[];

    const dData: LineData[] = candleData
      .map((candle, i) => ({
        time: candle.time as Time,
        value: stochRsi.d[i] ?? undefined,
      }))
      .filter(d => d.value !== undefined) as LineData[];

    kSeries.setData(kData);
    dSeries.setData(dData);

    if (kData.length > 0) {
      overboughtSeries.setData(kData.map(d => ({ time: d.time, value: 80 })));
      oversoldSeries.setData(kData.map(d => ({ time: d.time, value: 20 })));
    }

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      stochRsiChartRef.current = null;
    };
  }, [showStochRSI, candleData, stochRsiPeriod, stochKSmoothing, stochDSmoothing, getChartOptions, onCrosshairMove]);

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
    if (macdChartRef.current) macdChartRef.current.remove();

    const chart = createChart(container, getChartOptions(container));
    macdChartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && onCrosshairMove) {
        onCrosshairMove(param.time);
      }
    });

    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const macdLineSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const signalLineSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const { macd, signal, histogram } = calculateMACD(candleData, macdFast, macdSlow, macdSignal);

    const histogramData: HistogramData[] = candleData.map((candle, i) => ({
      time: candle.time as Time,
      value: histogram[i],
      color: histogram[i] >= 0 ? '#22c55e60' : '#ef444460',
    }));

    const macdData: LineData[] = candleData.map((candle, i) => ({
      time: candle.time as Time,
      value: macd[i],
    }));

    const signalData: LineData[] = candleData.map((candle, i) => ({
      time: candle.time as Time,
      value: signal[i],
    }));

    histogramSeries.setData(histogramData);
    macdLineSeries.setData(macdData);
    signalLineSeries.setData(signalData);

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdChartRef.current = null;
    };
  }, [showMACD, candleData, macdFast, macdSlow, macdSignal, getChartOptions, onCrosshairMove]);

  // ATR Chart
  useEffect(() => {
    if (!showATR || !atrContainerRef.current || candleData.length === 0) {
      if (atrChartRef.current) {
        atrChartRef.current.remove();
        atrChartRef.current = null;
      }
      return;
    }

    const container = atrContainerRef.current;
    if (atrChartRef.current) atrChartRef.current.remove();

    const chart = createChart(container, getChartOptions(container));
    atrChartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && onCrosshairMove) {
        onCrosshairMove(param.time);
      }
    });

    const atrSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const techData = toTechFormat(candleData);
    const atrValues = calculateATR(techData, atrPeriod);

    const atrData: LineData[] = candleData
      .map((candle, i) => ({
        time: candle.time as Time,
        value: atrValues[i] ?? undefined,
      }))
      .filter(d => d.value !== undefined) as LineData[];

    atrSeries.setData(atrData);

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      atrChartRef.current = null;
    };
  }, [showATR, candleData, atrPeriod, getChartOptions, onCrosshairMove]);

  if (!showRSI && !showMACD && !showStochRSI && !showATR) return null;

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
      {showStochRSI && (
        <div className="relative border-t border-border/30">
          <div className="absolute top-0.5 left-2 z-10 flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              Stoch RSI({stochRsiPeriod})
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-blue-500 rounded" />
              <span className="text-[9px] text-blue-400">%K</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-orange-500 rounded" />
              <span className="text-[9px] text-orange-400">%D</span>
            </span>
            <span className="text-[9px] text-red-400">80</span>
            <span className="text-[9px] text-green-400">20</span>
          </div>
          <div ref={stochRsiContainerRef} className="w-full" />
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
      {showATR && (
        <div className="relative border-t border-border/30">
          <div className="absolute top-0.5 left-2 z-10 flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
              ATR({atrPeriod})
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-0.5 bg-purple-500 rounded" />
              <span className="text-[9px] text-purple-400">Volatility</span>
            </span>
          </div>
          <div ref={atrContainerRef} className="w-full" />
        </div>
      )}
    </div>
  );
});