import { useMemo, useState, useEffect } from 'react';
import { useDexTransactionHistory, DexTransaction } from './useDexTransactionHistory';
import { useTransactionHistory, TransactionRecord } from './useTransactionHistory';
import { okxDexService } from '@/services/okxdex';

interface TradePerformance {
  id: string;
  date: number;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  // Values at time of trade
  tradeValueUsd: number;
  // Current values
  currentFromValueUsd: number; // What the FROM tokens would be worth now (HODL)
  currentToValueUsd: number;   // What the TO tokens are worth now (trade result)
  // Performance
  tradePnl: number;            // Trade result - original value
  hodlPnl: number;             // HODL value - original value  
  tradeVsHodl: number;         // Trade PnL - HODL PnL (positive = trading was better)
  tradeVsHodlPercent: number;
  chainId?: string;
  chainName?: string;
}

interface CumulativeDataPoint {
  date: string;
  tradeValue: number;
  hodlValue: number;
  tradePnl: number;
  hodlPnl: number;
  difference: number;
}

interface TradeVsHodlSummary {
  totalTrades: number;
  tradesAnalyzed: number;
  totalTradeValue: number;
  currentTradeValue: number;
  currentHodlValue: number;
  tradePnl: number;
  hodlPnl: number;
  tradeVsHodlDiff: number;
  tradeVsHodlPercent: number;
  tradingWasBetter: boolean;
  winningTrades: number;
  losingTrades: number;
  bestTrade: TradePerformance | null;
  worstTrade: TradePerformance | null;
  trades: TradePerformance[];
  cumulativeData: CumulativeDataPoint[];
  isLoading: boolean;
}

// Simple price cache
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

async function getTokenPrice(chainIndex: string, tokenAddress: string, symbol: string): Promise<number> {
  const cacheKey = `${chainIndex}:${tokenAddress}`;
  const cached = priceCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    const priceInfo = await okxDexService.getTokenPriceInfo(chainIndex, tokenAddress);
    const price = parseFloat(priceInfo?.price || '0');
    
    if (price > 0) {
      priceCache.set(cacheKey, { price, timestamp: Date.now() });
    }
    
    return price;
  } catch (error) {
    console.warn(`Failed to get price for ${symbol}:`, error);
    return 0;
  }
}

export function useTradeVsHodl(): TradeVsHodlSummary {
  const { transactions: dexTransactions } = useDexTransactionHistory();
  const { transactions: instantTransactions } = useTransactionHistory();
  const [performances, setPerformances] = useState<TradePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get only confirmed DEX swaps that have addresses and USD values
  const confirmedSwaps = useMemo(() => {
    return dexTransactions.filter(
      tx => tx.type === 'swap' && 
            tx.status === 'confirmed' && 
            tx.fromAmountUsd && 
            tx.fromAmountUsd > 0 &&
            tx.fromTokenAddress &&
            tx.toTokenAddress
    );
  }, [dexTransactions]);

  // Fetch current prices and calculate performance
  useEffect(() => {
    if (confirmedSwaps.length === 0) {
      setPerformances([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function calculatePerformances() {
      setIsLoading(true);
      const results: TradePerformance[] = [];

      // Process in batches to avoid rate limits
      for (const tx of confirmedSwaps.slice(0, 20)) { // Limit to last 20 trades
        if (cancelled) break;

        try {
          // Get current prices for both tokens using stored addresses
          const [fromPrice, toPrice] = await Promise.all([
            getTokenPrice(tx.chainId, tx.fromTokenAddress!, tx.fromTokenSymbol),
            getTokenPrice(tx.chainId, tx.toTokenAddress!, tx.toTokenSymbol),
          ]);

          const fromAmount = parseFloat(tx.fromTokenAmount) || 0;
          const toAmount = parseFloat(tx.toTokenAmount) || 0;
          const tradeValueUsd = tx.fromAmountUsd || 0;

          // Current values
          const currentFromValueUsd = fromAmount * fromPrice; // HODL value
          const currentToValueUsd = toAmount * toPrice;       // Trade result

          // PnL calculations
          const tradePnl = currentToValueUsd - tradeValueUsd;
          const hodlPnl = currentFromValueUsd - tradeValueUsd;
          const tradeVsHodl = tradePnl - hodlPnl;
          const tradeVsHodlPercent = tradeValueUsd > 0 ? (tradeVsHodl / tradeValueUsd) * 100 : 0;

          results.push({
            id: tx.id,
            date: tx.timestamp,
            fromSymbol: tx.fromTokenSymbol,
            toSymbol: tx.toTokenSymbol,
            fromAmount,
            toAmount,
            tradeValueUsd,
            currentFromValueUsd,
            currentToValueUsd,
            tradePnl,
            hodlPnl,
            tradeVsHodl,
            tradeVsHodlPercent,
            chainId: tx.chainId,
            chainName: tx.chainName,
          });

          // Small delay between API calls
          await new Promise(r => setTimeout(r, 100));
        } catch (error) {
          console.warn('Error calculating performance for trade:', error);
        }
      }

      if (!cancelled) {
        setPerformances(results);
        setIsLoading(false);
      }
    }

    calculatePerformances();

    return () => {
      cancelled = true;
    };
  }, [confirmedSwaps]);

  // Calculate summary
  const summary = useMemo((): TradeVsHodlSummary => {
    const validTrades = performances.filter(p => p.tradeValueUsd > 0 && (p.currentFromValueUsd > 0 || p.currentToValueUsd > 0));

    if (validTrades.length === 0) {
      return {
        totalTrades: confirmedSwaps.length,
        tradesAnalyzed: 0,
        totalTradeValue: 0,
        currentTradeValue: 0,
        currentHodlValue: 0,
        tradePnl: 0,
        hodlPnl: 0,
        tradeVsHodlDiff: 0,
        tradeVsHodlPercent: 0,
        tradingWasBetter: false,
        winningTrades: 0,
        losingTrades: 0,
        bestTrade: null,
        worstTrade: null,
        trades: [],
        cumulativeData: [],
        isLoading,
      };
    }

    const totalTradeValue = validTrades.reduce((sum, t) => sum + t.tradeValueUsd, 0);
    const currentTradeValue = validTrades.reduce((sum, t) => sum + t.currentToValueUsd, 0);
    const currentHodlValue = validTrades.reduce((sum, t) => sum + t.currentFromValueUsd, 0);
    
    const tradePnl = currentTradeValue - totalTradeValue;
    const hodlPnl = currentHodlValue - totalTradeValue;
    const tradeVsHodlDiff = tradePnl - hodlPnl;
    const tradeVsHodlPercent = totalTradeValue > 0 ? (tradeVsHodlDiff / totalTradeValue) * 100 : 0;

    const winningTrades = validTrades.filter(t => t.tradeVsHodl > 0).length;
    const losingTrades = validTrades.filter(t => t.tradeVsHodl < 0).length;

    const sortedByPerformance = [...validTrades].sort((a, b) => b.tradeVsHodl - a.tradeVsHodl);

    // Build cumulative chart data (sorted by date, oldest first)
    const sortedByDate = [...validTrades].sort((a, b) => a.date - b.date);
    let cumulativeTradeValue = 0;
    let cumulativeHodlValue = 0;
    let cumulativeOriginalValue = 0;
    
    const cumulativeData: CumulativeDataPoint[] = sortedByDate.map(trade => {
      cumulativeOriginalValue += trade.tradeValueUsd;
      cumulativeTradeValue += trade.currentToValueUsd;
      cumulativeHodlValue += trade.currentFromValueUsd;
      
      return {
        date: new Date(trade.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        tradeValue: cumulativeTradeValue,
        hodlValue: cumulativeHodlValue,
        tradePnl: cumulativeTradeValue - cumulativeOriginalValue,
        hodlPnl: cumulativeHodlValue - cumulativeOriginalValue,
        difference: (cumulativeTradeValue - cumulativeOriginalValue) - (cumulativeHodlValue - cumulativeOriginalValue),
      };
    });

    return {
      totalTrades: confirmedSwaps.length,
      tradesAnalyzed: validTrades.length,
      totalTradeValue,
      currentTradeValue,
      currentHodlValue,
      tradePnl,
      hodlPnl,
      tradeVsHodlDiff,
      tradeVsHodlPercent,
      tradingWasBetter: tradeVsHodlDiff > 0,
      winningTrades,
      losingTrades,
      bestTrade: sortedByPerformance[0] || null,
      worstTrade: sortedByPerformance[sortedByPerformance.length - 1] || null,
      trades: validTrades,
      cumulativeData,
      isLoading,
    };
  }, [performances, confirmedSwaps.length, isLoading]);

  return summary;
}