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

// Fibonacci Retracement Levels
export interface FibonacciLevels {
  level0: number;    // 0% (high/low depending on trend)
  level236: number;  // 23.6%
  level382: number;  // 38.2%
  level50: number;   // 50%
  level618: number;  // 61.8%
  level786: number;  // 78.6%
  level100: number;  // 100% (low/high depending on trend)
  trend: 'uptrend' | 'downtrend';
}

export function calculateFibonacciRetracement(
  data: OHLCData[],
  period: number = 50
): FibonacciLevels | null {
  if (data.length < period) return null;
  
  const recentData = data.slice(-period);
  
  // Find swing high and low in the period
  let swingHigh = recentData[0].high;
  let swingLow = recentData[0].low;
  let highIndex = 0;
  let lowIndex = 0;
  
  for (let i = 1; i < recentData.length; i++) {
    if (recentData[i].high > swingHigh) {
      swingHigh = recentData[i].high;
      highIndex = i;
    }
    if (recentData[i].low < swingLow) {
      swingLow = recentData[i].low;
      lowIndex = i;
    }
  }
  
  const range = swingHigh - swingLow;
  if (range === 0) return null;
  
  // Determine trend: uptrend if low came before high
  const trend: 'uptrend' | 'downtrend' = lowIndex < highIndex ? 'uptrend' : 'downtrend';
  
  // Calculate Fibonacci levels
  if (trend === 'uptrend') {
    // In uptrend, retracement levels are drawn from low to high
    return {
      level0: swingHigh,
      level236: swingHigh - range * 0.236,
      level382: swingHigh - range * 0.382,
      level50: swingHigh - range * 0.5,
      level618: swingHigh - range * 0.618,
      level786: swingHigh - range * 0.786,
      level100: swingLow,
      trend,
    };
  } else {
    // In downtrend, retracement levels are drawn from high to low
    return {
      level0: swingLow,
      level236: swingLow + range * 0.236,
      level382: swingLow + range * 0.382,
      level50: swingLow + range * 0.5,
      level618: swingLow + range * 0.618,
      level786: swingLow + range * 0.786,
      level100: swingHigh,
      trend,
    };
  }
}

// Volume Profile
export interface VolumeProfileBin {
  priceLevel: number;
  volume: number;
  percentage: number;
  isPointOfControl: boolean;  // Highest volume level
  isValueAreaHigh: boolean;   // 70% volume high bound
  isValueAreaLow: boolean;    // 70% volume low bound
}

export function calculateVolumeProfile(
  data: OHLCData[],
  bins: number = 24
): VolumeProfileBin[] {
  if (data.length === 0) return [];
  
  // Find price range
  let minPrice = data[0].low;
  let maxPrice = data[0].high;
  
  for (const candle of data) {
    if (candle.low < minPrice) minPrice = candle.low;
    if (candle.high > maxPrice) maxPrice = candle.high;
  }
  
  const priceRange = maxPrice - minPrice;
  if (priceRange === 0) return [];
  
  const binSize = priceRange / bins;
  
  // Initialize bins
  const volumeBins: number[] = new Array(bins).fill(0);
  const priceLevels: number[] = [];
  
  for (let i = 0; i < bins; i++) {
    priceLevels.push(minPrice + binSize * (i + 0.5)); // Mid-point of each bin
  }
  
  // Distribute volume to bins based on price range of each candle
  for (const candle of data) {
    const candleVolume = candle.volume;
    const candleRange = candle.high - candle.low;
    
    // Distribute volume proportionally to bins the candle touches
    for (let i = 0; i < bins; i++) {
      const binLow = minPrice + binSize * i;
      const binHigh = minPrice + binSize * (i + 1);
      
      // Calculate overlap between candle and bin
      const overlapLow = Math.max(candle.low, binLow);
      const overlapHigh = Math.min(candle.high, binHigh);
      
      if (overlapHigh > overlapLow) {
        const overlap = overlapHigh - overlapLow;
        const proportion = candleRange > 0 ? overlap / candleRange : 1 / bins;
        volumeBins[i] += candleVolume * proportion;
      }
    }
  }
  
  const totalVolume = volumeBins.reduce((a, b) => a + b, 0);
  if (totalVolume === 0) return [];
  
  // Find Point of Control (highest volume bin)
  let maxVolume = 0;
  let pocIndex = 0;
  for (let i = 0; i < bins; i++) {
    if (volumeBins[i] > maxVolume) {
      maxVolume = volumeBins[i];
      pocIndex = i;
    }
  }
  
  // Calculate Value Area (70% of volume centered around POC)
  const valueAreaTarget = totalVolume * 0.7;
  let valueAreaVolume = volumeBins[pocIndex];
  let vaLow = pocIndex;
  let vaHigh = pocIndex;
  
  while (valueAreaVolume < valueAreaTarget && (vaLow > 0 || vaHigh < bins - 1)) {
    const checkLow = vaLow > 0 ? volumeBins[vaLow - 1] : 0;
    const checkHigh = vaHigh < bins - 1 ? volumeBins[vaHigh + 1] : 0;
    
    if (checkLow >= checkHigh && vaLow > 0) {
      vaLow--;
      valueAreaVolume += volumeBins[vaLow];
    } else if (vaHigh < bins - 1) {
      vaHigh++;
      valueAreaVolume += volumeBins[vaHigh];
    } else if (vaLow > 0) {
      vaLow--;
      valueAreaVolume += volumeBins[vaLow];
    }
  }
  
  // Build result
  return priceLevels.map((priceLevel, i) => ({
    priceLevel,
    volume: volumeBins[i],
    percentage: (volumeBins[i] / totalVolume) * 100,
    isPointOfControl: i === pocIndex,
    isValueAreaHigh: i === vaHigh,
    isValueAreaLow: i === vaLow,
  }));
}

// Average True Range (ATR) - useful for volatility
export function calculateATR(data: OHLCData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      result.push(null);
    } else {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trueRanges.push(tr);
      
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        const sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      } else {
        const prevATR = result[i - 1]!;
        const atr = (prevATR * (period - 1) + tr) / period;
        result.push(atr);
      }
    }
  }
  
  return result;
}

// Stochastic RSI - combines RSI with Stochastic oscillator
export interface StochRSIResult {
  k: (number | null)[];  // %K line (fast)
  d: (number | null)[];  // %D line (slow, smoothed %K)
}

export function calculateStochRSI(
  data: OHLCData[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmoothing: number = 3,
  dSmoothing: number = 3
): StochRSIResult {
  // First calculate RSI
  const rsiValues = calculateRSI(data, rsiPeriod);
  
  const stochRSI: (number | null)[] = [];
  
  // Apply Stochastic formula to RSI values
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < rsiPeriod + stochPeriod - 2 || rsiValues[i] === null) {
      stochRSI.push(null);
      continue;
    }
    
    // Get RSI values for the stochastic period
    const rsiSlice: number[] = [];
    for (let j = i - stochPeriod + 1; j <= i; j++) {
      if (rsiValues[j] !== null) {
        rsiSlice.push(rsiValues[j]!);
      }
    }
    
    if (rsiSlice.length < stochPeriod) {
      stochRSI.push(null);
      continue;
    }
    
    const minRSI = Math.min(...rsiSlice);
    const maxRSI = Math.max(...rsiSlice);
    const range = maxRSI - minRSI;
    
    if (range === 0) {
      stochRSI.push(50); // Midpoint when no range
    } else {
      const currentRSI = rsiValues[i]!;
      stochRSI.push(((currentRSI - minRSI) / range) * 100);
    }
  }
  
  // Smooth %K with SMA
  const kLine: (number | null)[] = [];
  for (let i = 0; i < stochRSI.length; i++) {
    if (i < kSmoothing - 1 || stochRSI[i] === null) {
      kLine.push(null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = i - kSmoothing + 1; j <= i; j++) {
      if (stochRSI[j] !== null) {
        sum += stochRSI[j]!;
        count++;
      }
    }
    
    kLine.push(count > 0 ? sum / count : null);
  }
  
  // Smooth %K to get %D with SMA
  const dLine: (number | null)[] = [];
  for (let i = 0; i < kLine.length; i++) {
    if (i < dSmoothing - 1 || kLine[i] === null) {
      dLine.push(null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = i - dSmoothing + 1; j <= i; j++) {
      if (kLine[j] !== null) {
        sum += kLine[j]!;
        count++;
      }
    }
    
    dLine.push(count > 0 ? sum / count : null);
  }
  
  return { k: kLine, d: dLine };
}
