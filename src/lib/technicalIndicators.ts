// Technical Indicator Calculations for Trading Charts

export interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

// Simple Moving Average
export function calculateSMA(data: OHLCData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

// Exponential Moving Average
export function calculateEMA(data: OHLCData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first value
  let prevEMA = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is the SMA
      const sum = data.slice(0, period).reduce((acc, d) => acc + d.close, 0);
      prevEMA = sum / period;
      result.push(prevEMA);
    } else {
      // EMA = (Close - Previous EMA) * multiplier + Previous EMA
      const ema = (data[i].close - prevEMA) * multiplier + prevEMA;
      prevEMA = ema;
      result.push(ema);
    }
  }
  
  return result;
}

// Relative Strength Index (RSI)
export function calculateRSI(data: OHLCData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // First value is null (no previous close)
  result.push(null);
  
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First RSI - simple average
      avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    } else {
      // Smoothed RSI
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

// MACD (Moving Average Convergence Divergence)
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  data: OHLCData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macdLine: (number | null)[] = fastEMA.map((fast, i) => {
    const slow = slowEMA[i];
    if (fast === null || slow === null) return null;
    return fast - slow;
  });
  
  // Signal Line = EMA of MACD Line
  const macdData: OHLCData[] = macdLine.map((m, i) => ({
    open: m ?? 0,
    high: m ?? 0,
    low: m ?? 0,
    close: m ?? 0,
    volume: 0,
    timestamp: data[i]?.timestamp ?? 0,
  }));
  
  const signalLine = calculateEMA(macdData, signalPeriod);
  
  // Histogram = MACD Line - Signal Line
  const histogram: (number | null)[] = macdLine.map((macd, i) => {
    const signal = signalLine[i];
    if (macd === null || signal === null) return null;
    return macd - signal;
  });
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

// Bollinger Bands
export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calculateBollingerBands(
  data: OHLCData[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      
      upper.push(mean + stdDev * sd);
      lower.push(mean - stdDev * sd);
    }
  }
  
  return { upper, middle, lower };
}

// Volume Weighted Average Price (VWAP) - for intraday
export function calculateVWAP(data: OHLCData[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    cumulativeTPV += typicalPrice * data[i].volume;
    cumulativeVolume += data[i].volume;
    
    if (cumulativeVolume === 0) {
      result.push(null);
    } else {
      result.push(cumulativeTPV / cumulativeVolume);
    }
  }
  
  return result;
}
