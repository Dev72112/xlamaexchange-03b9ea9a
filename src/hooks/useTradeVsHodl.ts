import { useMemo, useState, useEffect } from 'react';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { useTransactionHistory } from './useTransactionHistory';
import { useBridgeTransactions } from '@/contexts/BridgeTransactionContext';
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
  source: 'dex' | 'instant' | 'bridge';
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

interface UnifiedTrade {
  id: string;
  timestamp: number;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  fromAmountUsd: number;
  toTokenAddress?: string;
  chainId?: string;
  chainName?: string;
  source: 'dex' | 'instant' | 'bridge';
}

export function useTradeVsHodl(): TradeVsHodlSummary {
  const { transactions: dexTransactions } = useDexTransactions();
  const { transactions: instantTransactions } = useTransactionHistory();
  const { transactions: bridgeTransactions } = useBridgeTransactions();
  const { dailyData: hodlData, getPnLMetrics } = usePortfolioPnL();
  const [performances, setPerformances] = useState<TradePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get all confirmed trades from all sources
  const allConfirmedTrades = useMemo((): UnifiedTrade[] => {
    const trades: UnifiedTrade[] = [];
    
    // DEX swaps (confirmed only)
    dexTransactions
      .filter(tx => tx.type === 'swap' && tx.status === 'confirmed' && tx.toTokenAddress)
      .forEach(tx => trades.push({
        id: tx.id,
        timestamp: tx.timestamp,
        fromSymbol: tx.fromTokenSymbol,
        toSymbol: tx.toTokenSymbol,
        fromAmount: parseFloat(tx.fromTokenAmount) || 0,
        toAmount: parseFloat(tx.toTokenAmount) || 0,
        fromAmountUsd: tx.fromAmountUsd || 0,
        toTokenAddress: tx.toTokenAddress,
        chainId: tx.chainId,
        chainName: tx.chainName,
        source: 'dex',
      }));
    
    // Instant swaps (completed only)
    instantTransactions
      .filter(tx => tx.status === 'completed')
      .forEach(tx => trades.push({
        id: tx.id,
        timestamp: tx.createdAt,
        fromSymbol: tx.fromTicker,
        toSymbol: tx.toTicker,
        fromAmount: parseFloat(tx.fromAmount) || 0,
        toAmount: parseFloat(tx.toAmount || '0') || 0,
        fromAmountUsd: typeof tx.fromAmountUsd === 'number' ? tx.fromAmountUsd : parseFloat(String(tx.fromAmountUsd) || '0'),
        source: 'instant',
      }));
    
    // Bridge transactions (completed only)
    bridgeTransactions
      .filter(tx => tx.status === 'completed')
      .forEach(tx => trades.push({
        id: tx.id,
        timestamp: tx.startTime,
        fromSymbol: tx.fromToken.symbol,
        toSymbol: tx.toToken.symbol,
        fromAmount: parseFloat(tx.fromAmount) || 0,
        toAmount: parseFloat(tx.toAmount || '0') || 0,
        fromAmountUsd: tx.fromAmountUsd || 0,
        chainId: tx.toChain.chainId.toString(),
        chainName: tx.toChain.name,
        source: 'bridge',
      }));
    
    // Sort by date descending (newest first)
    return trades.sort((a, b) => b.timestamp - a.timestamp);
  }, [dexTransactions, instantTransactions, bridgeTransactions]);

  // Fetch current prices and calculate trade performance
  useEffect(() => {
    if (allConfirmedTrades.length === 0) {
      setPerformances([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function calculatePerformances() {
      setIsLoading(true);
      const results: TradePerformance[] = [];

      // Process up to 50 trades (increased from 20)
      for (const trade of allConfirmedTrades.slice(0, 50)) {
        if (cancelled) break;

        try {
          // For DEX trades with token address, get current price
          let currentToValueUsd = 0;
          if (trade.toTokenAddress && trade.chainId) {
            const toPrice = await getTokenPrice(trade.chainId, trade.toTokenAddress, trade.toSymbol);
            currentToValueUsd = trade.toAmount * toPrice;
          } else {
            // For instant/bridge without live pricing, estimate based on original value
            // (they're typically 1:1 value transfers minus fees)
            currentToValueUsd = trade.fromAmountUsd * 0.98; // ~2% fee estimate
          }

          const tradeValueUsd = trade.fromAmountUsd;
          
          // Skip if we couldn't get any USD values
          if (tradeValueUsd === 0 && currentToValueUsd === 0) {
            continue;
          }
          
          const tradePnl = currentToValueUsd - tradeValueUsd;
          const tradePnlPercent = tradeValueUsd > 0 ? (tradePnl / tradeValueUsd) * 100 : 0;

          results.push({
            id: trade.id,
            date: trade.timestamp,
            fromSymbol: trade.fromSymbol,
            toSymbol: trade.toSymbol,
            fromAmount: trade.fromAmount,
            toAmount: trade.toAmount,
            tradeValueUsd,
            currentToValueUsd,
            tradePnl,
            tradePnlPercent,
            chainId: trade.chainId,
            chainName: trade.chainName,
            source: trade.source,
          });

          await new Promise(r => setTimeout(r, 50)); // Reduced delay
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
  }, [allConfirmedTrades]);

  // Calculate summary comparing trades vs actual HODL (wallet holdings)
  const summary = useMemo((): TradeVsHodlSummary => {
    const validTrades = performances.filter(p => p.tradeValueUsd > 0 || p.currentToValueUsd > 0);
    
    // Get HODL metrics from portfolio snapshots (actual wallet holdings)
    const hodlMetrics = getPnLMetrics(90); // 90-day comparison
    
    // Use portfolio snapshots if available, otherwise use current wallet balance
    const hodlPnl = hodlMetrics?.absoluteChange || 0;
    const hodlPnlPercent = hodlMetrics?.percentChange || 0;
    const hodlStartValue = hodlMetrics?.startValue || 0;
    const hodlCurrentValue = hodlMetrics?.endValue || 0;

    const totalTradesCount = allConfirmedTrades.length;

    if (validTrades.length === 0) {
      return {
        totalTrades: totalTradesCount,
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
      totalTrades: totalTradesCount,
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
  }, [performances, allConfirmedTrades.length, isLoading, hodlData, getPnLMetrics]);

  return summary;
}