import { useMemo, useState, useEffect } from 'react';
import { useDexTransactionHistory } from './useDexTransactionHistory';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { usePortfolioPnL } from './usePortfolioPnL';
import { okxDexService } from '@/services/okxdex';

interface TradePerformance {
  id: string;
  date: number;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  tradeValueUsd: number;
  currentToValueUsd: number;
  tradePnl: number;
  tradePnlPercent: number;
  chainId?: string;
  chainName?: string;
}

interface CumulativeDataPoint {
  date: string;
  tradePnl: number;
  hodlPnl: number;
  tradeValue: number;
  hodlValue: number;
}

interface TradeVsHodlSummary {
  totalTrades: number;
  tradesAnalyzed: number;
  totalTradeValue: number;
  currentTradeValue: number;
  tradePnl: number;
  tradePnlPercent: number;
  // HODL = actual wallet holdings performance
  hodlPnl: number;
  hodlPnlPercent: number;
  hodlStartValue: number;
  hodlCurrentValue: number;
  // Comparison
  tradeVsHodlDiff: number;
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
  const { dailyData: hodlData, getPnLMetrics } = usePortfolioPnL();
  const [performances, setPerformances] = useState<TradePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get only confirmed DEX swaps that have addresses and USD values
  const confirmedSwaps = useMemo(() => {
    return dexTransactions.filter(
      tx => tx.type === 'swap' && 
            tx.status === 'confirmed' && 
            tx.fromAmountUsd && 
            tx.fromAmountUsd > 0 &&
            tx.toTokenAddress
    );
  }, [dexTransactions]);

  // Fetch current prices and calculate trade performance
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
      for (const tx of confirmedSwaps.slice(0, 20)) {
        if (cancelled) break;

        try {
          // Get current price for received token
          const toPrice = await getTokenPrice(tx.chainId, tx.toTokenAddress!, tx.toTokenSymbol);

          const fromAmount = parseFloat(tx.fromTokenAmount) || 0;
          const toAmount = parseFloat(tx.toTokenAmount) || 0;
          const tradeValueUsd = tx.fromAmountUsd || 0;
          const currentToValueUsd = toAmount * toPrice;
          
          const tradePnl = currentToValueUsd - tradeValueUsd;
          const tradePnlPercent = tradeValueUsd > 0 ? (tradePnl / tradeValueUsd) * 100 : 0;

          results.push({
            id: tx.id,
            date: tx.timestamp,
            fromSymbol: tx.fromTokenSymbol,
            toSymbol: tx.toTokenSymbol,
            fromAmount,
            toAmount,
            tradeValueUsd,
            currentToValueUsd,
            tradePnl,
            tradePnlPercent,
            chainId: tx.chainId,
            chainName: tx.chainName,
          });

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

    return () => { cancelled = true; };
  }, [confirmedSwaps]);

  // Calculate summary comparing trades vs actual HODL (wallet holdings)
  const summary = useMemo((): TradeVsHodlSummary => {
    const validTrades = performances.filter(p => p.tradeValueUsd > 0 && p.currentToValueUsd > 0);
    
    // Get HODL metrics from portfolio snapshots (actual wallet holdings)
    const hodlMetrics = getPnLMetrics(90); // 90-day comparison
    const hodlPnl = hodlMetrics?.absoluteChange || 0;
    const hodlPnlPercent = hodlMetrics?.percentChange || 0;
    const hodlStartValue = hodlMetrics?.startValue || 0;
    const hodlCurrentValue = hodlMetrics?.endValue || 0;

    if (validTrades.length === 0) {
      return {
        totalTrades: confirmedSwaps.length,
        tradesAnalyzed: 0,
        totalTradeValue: 0,
        currentTradeValue: 0,
        tradePnl: 0,
        tradePnlPercent: 0,
        hodlPnl,
        hodlPnlPercent,
        hodlStartValue,
        hodlCurrentValue,
        tradeVsHodlDiff: 0,
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
    const tradePnl = currentTradeValue - totalTradeValue;
    const tradePnlPercent = totalTradeValue > 0 ? (tradePnl / totalTradeValue) * 100 : 0;
    
    // Compare trade performance vs HODL performance (percentage-based for fairness)
    const tradeVsHodlDiff = tradePnlPercent - hodlPnlPercent;

    const winningTrades = validTrades.filter(t => t.tradePnl > 0).length;
    const losingTrades = validTrades.filter(t => t.tradePnl < 0).length;

    const sortedByPerformance = [...validTrades].sort((a, b) => b.tradePnl - a.tradePnl);

    // Build cumulative chart data
    const sortedByDate = [...validTrades].sort((a, b) => a.date - b.date);
    let cumulativeTradeValue = 0;
    let cumulativeOriginalValue = 0;
    
    // Match HODL data to trade dates
    const cumulativeData: CumulativeDataPoint[] = sortedByDate.map((trade, idx) => {
      cumulativeOriginalValue += trade.tradeValueUsd;
      cumulativeTradeValue += trade.currentToValueUsd;
      
      // Find closest HODL snapshot
      const tradeDate = new Date(trade.date).toISOString().split('T')[0];
      const hodlSnapshot = hodlData.find(h => h.date <= tradeDate) || hodlData[0];
      const hodlValue = hodlSnapshot?.value || hodlStartValue;
      
      // Scale HODL P&L proportionally based on how far through the trades we are
      const progress = (idx + 1) / sortedByDate.length;
      const scaledHodlPnl = hodlPnl * progress;
      
      return {
        date: new Date(trade.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        tradePnl: cumulativeTradeValue - cumulativeOriginalValue,
        hodlPnl: scaledHodlPnl,
        tradeValue: cumulativeTradeValue,
        hodlValue: hodlStartValue + scaledHodlPnl,
      };
    });

    return {
      totalTrades: confirmedSwaps.length,
      tradesAnalyzed: validTrades.length,
      totalTradeValue,
      currentTradeValue,
      tradePnl,
      tradePnlPercent,
      hodlPnl,
      hodlPnlPercent,
      hodlStartValue,
      hodlCurrentValue,
      tradeVsHodlDiff,
      tradingWasBetter: tradeVsHodlDiff > 0,
      winningTrades,
      losingTrades,
      bestTrade: sortedByPerformance[0] || null,
      worstTrade: sortedByPerformance[sortedByPerformance.length - 1] || null,
      trades: validTrades,
      cumulativeData,
      isLoading,
    };
  }, [performances, confirmedSwaps.length, isLoading, hodlData, getPnLMetrics]);

  return summary;
}
