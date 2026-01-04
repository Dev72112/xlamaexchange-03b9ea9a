import { useState, useCallback } from 'react';
import { okxDexService, CandlestickData } from '@/services/okxdex';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands,
  OHLCData 
} from '@/lib/technicalIndicators';

export interface PricePrediction {
  currentPrice: number;
  predictedPrice: number;
  predictedChange: number;
  confidence: 'low' | 'medium' | 'high';
  signals: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    value: string;
  }[];
  trend: 'bullish' | 'bearish' | 'neutral';
  supportLevel: number;
  resistanceLevel: number;
  timeframe: string;
}

export function usePricePrediction() {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertToOHLC = (candles: CandlestickData[]): OHLCData[] => {
    return candles.map(c => ({
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.vol),
      timestamp: parseInt(c.ts),
    }));
  };

  const analyzeTrend = (
    ohlcData: OHLCData[],
    sma20: (number | null)[],
    sma50: (number | null)[],
    rsi: (number | null)[],
    macd: ReturnType<typeof calculateMACD>
  ): PricePrediction['signals'] => {
    const signals: PricePrediction['signals'] = [];
    const lastIndex = ohlcData.length - 1;
    const currentPrice = ohlcData[lastIndex].close;

    // SMA Crossover Signal
    const lastSma20 = sma20[lastIndex];
    const lastSma50 = sma50[lastIndex];
    if (lastSma20 !== null && lastSma50 !== null) {
      const smaSignal = lastSma20 > lastSma50 ? 'bullish' : lastSma20 < lastSma50 ? 'bearish' : 'neutral';
      signals.push({
        name: 'SMA Crossover (20/50)',
        signal: smaSignal,
        value: `${lastSma20.toFixed(4)} / ${lastSma50.toFixed(4)}`,
      });
    }

    // RSI Signal
    const lastRsi = rsi[lastIndex];
    if (lastRsi !== null) {
      let rsiSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (lastRsi < 30) rsiSignal = 'bullish'; // Oversold
      else if (lastRsi > 70) rsiSignal = 'bearish'; // Overbought
      signals.push({
        name: 'RSI (14)',
        signal: rsiSignal,
        value: lastRsi.toFixed(2),
      });
    }

    // MACD Signal
    const lastMacd = macd.macd[lastIndex];
    const lastSignal = macd.signal[lastIndex];
    const lastHistogram = macd.histogram[lastIndex];
    if (lastMacd !== null && lastSignal !== null) {
      const macdSignal = lastMacd > lastSignal ? 'bullish' : 'bearish';
      signals.push({
        name: 'MACD',
        signal: macdSignal,
        value: `${lastMacd.toFixed(6)}`,
      });
    }

    // Price vs SMA20 Signal
    if (lastSma20 !== null) {
      const priceSignal = currentPrice > lastSma20 ? 'bullish' : 'bearish';
      signals.push({
        name: 'Price vs SMA20',
        signal: priceSignal,
        value: `${((currentPrice / lastSma20 - 1) * 100).toFixed(2)}%`,
      });
    }

    // Momentum Signal (based on recent price action)
    const momentum = ohlcData.slice(-5).reduce((acc, d, i, arr) => {
      if (i === 0) return 0;
      return acc + (d.close - arr[i - 1].close);
    }, 0);
    signals.push({
      name: 'Momentum (5-period)',
      signal: momentum > 0 ? 'bullish' : momentum < 0 ? 'bearish' : 'neutral',
      value: `${momentum > 0 ? '+' : ''}${momentum.toFixed(6)}`,
    });

    return signals;
  };

  const calculatePrediction = (
    ohlcData: OHLCData[],
    signals: PricePrediction['signals']
  ): { predictedChange: number; confidence: PricePrediction['confidence'] } => {
    const bullishCount = signals.filter(s => s.signal === 'bullish').length;
    const bearishCount = signals.filter(s => s.signal === 'bearish').length;
    const totalSignals = signals.length;

    // Confidence based on signal agreement
    const agreement = Math.max(bullishCount, bearishCount) / totalSignals;
    const confidence: PricePrediction['confidence'] = 
      agreement > 0.7 ? 'high' : agreement > 0.5 ? 'medium' : 'low';

    // Calculate predicted change based on historical volatility and signal strength
    const returns = ohlcData.slice(-20).map((d, i, arr) => {
      if (i === 0) return 0;
      return (d.close - arr[i - 1].close) / arr[i - 1].close;
    });
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length);

    // Direction based on signals
    const direction = bullishCount > bearishCount ? 1 : bullishCount < bearishCount ? -1 : 0;
    
    // Predicted change: direction * volatility * confidence multiplier
    const confidenceMultiplier = confidence === 'high' ? 1.5 : confidence === 'medium' ? 1 : 0.5;
    const predictedChange = direction * volatility * 100 * confidenceMultiplier;

    return { predictedChange: Math.max(-20, Math.min(20, predictedChange)), confidence };
  };

  const findSupportResistance = (ohlcData: OHLCData[]): { support: number; resistance: number } => {
    const lows = ohlcData.map(d => d.low);
    const highs = ohlcData.map(d => d.high);
    
    // Simple approach: recent support/resistance levels
    const recentLows = lows.slice(-20);
    const recentHighs = highs.slice(-20);
    
    const support = Math.min(...recentLows);
    const resistance = Math.max(...recentHighs);
    
    return { support, resistance };
  };

  const predict = useCallback(async (
    chainIndex: string,
    tokenAddress: string,
    timeframe: '1H' | '4H' | '1D' = '1H'
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch candlestick data
      const candles = await okxDexService.getCandlesticks(
        chainIndex,
        tokenAddress,
        timeframe,
        100
      );

      if (candles.length < 50) {
        setError('Insufficient historical data for prediction');
        setPrediction(null);
        return null;
      }

      const ohlcData = convertToOHLC(candles);
      
      // Calculate indicators
      const sma20 = calculateSMA(ohlcData, 20);
      const sma50 = calculateSMA(ohlcData, 50);
      const ema12 = calculateEMA(ohlcData, 12);
      const rsi = calculateRSI(ohlcData, 14);
      const macd = calculateMACD(ohlcData);
      const bollinger = calculateBollingerBands(ohlcData, 20, 2);

      // Analyze signals
      const signals = analyzeTrend(ohlcData, sma20, sma50, rsi, macd);
      
      // Calculate prediction
      const { predictedChange, confidence } = calculatePrediction(ohlcData, signals);
      
      // Find support/resistance
      const { support, resistance } = findSupportResistance(ohlcData);

      // Determine overall trend
      const bullishSignals = signals.filter(s => s.signal === 'bullish').length;
      const bearishSignals = signals.filter(s => s.signal === 'bearish').length;
      const trend: PricePrediction['trend'] = 
        bullishSignals > bearishSignals ? 'bullish' : 
        bearishSignals > bullishSignals ? 'bearish' : 'neutral';

      const currentPrice = ohlcData[ohlcData.length - 1].close;
      const predictedPrice = currentPrice * (1 + predictedChange / 100);

      const result: PricePrediction = {
        currentPrice,
        predictedPrice,
        predictedChange,
        confidence,
        signals,
        trend,
        supportLevel: support,
        resistanceLevel: resistance,
        timeframe: timeframe === '1H' ? '1 Hour' : timeframe === '4H' ? '4 Hours' : '1 Day',
      };

      setPrediction(result);
      return result;
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Failed to generate prediction');
      setPrediction(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    predict,
    prediction,
    isLoading,
    error,
  };
}
