import { useMemo, useCallback } from 'react';
import { useDexTransactionHistory, DexTransaction } from './useDexTransactionHistory';
import { useTransactionHistory, TransactionRecord } from './useTransactionHistory';

interface TradePairStats {
  pair: string;
  count: number;
  volume: number;
}

interface DailyVolume {
  date: string;
  volume: number;
  count: number;
}

interface TradeAnalytics {
  // Summary stats
  totalTrades: number;
  totalVolume: number;
  avgTradeSize: number;
  successRate: number;
  
  // Time-based
  dailyVolume: DailyVolume[];
  weeklyVolume: DailyVolume[];
  
  // Pair analysis
  topPairs: TradePairStats[];
  uniqueTokens: number;
  
  // Chain analysis
  chainDistribution: { chain: string; count: number; percentage: number }[];
  
  // Performance
  bestTradingDay: { date: string; volume: number } | null;
  avgTradesPerDay: number;
  tradingStreak: number;
}

export function useTradeAnalytics() {
  const { transactions: dexTransactions } = useDexTransactionHistory();
  const { transactions: instantTransactions } = useTransactionHistory();

  const analytics = useMemo((): TradeAnalytics => {
    // Combine all swap transactions
    const allSwaps = [
      ...dexTransactions.filter(tx => tx.type === 'swap'),
      ...instantTransactions,
    ];

    const totalTrades = allSwaps.length;

    // Calculate success rate from DEX transactions
    const successfulSwaps = dexTransactions.filter(
      tx => tx.type === 'swap' && tx.status === 'confirmed'
    ).length;
    const successRate = dexTransactions.length > 0 
      ? (successfulSwaps / dexTransactions.filter(tx => tx.type === 'swap').length) * 100 
      : 100;

    // Estimate total volume (simplified - uses amount strings)
    let totalVolume = 0;
    allSwaps.forEach(tx => {
      const amount = 'fromAmount' in tx 
        ? parseFloat(tx.fromAmount || '0') 
        : parseFloat(tx.fromTokenAmount || '0');
      if (!isNaN(amount)) totalVolume += amount;
    });

    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

    // Group by day
    const volumeByDay = new Map<string, { volume: number; count: number }>();
    allSwaps.forEach(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      const date = new Date(timestamp).toISOString().split('T')[0];
      const existing = volumeByDay.get(date) || { volume: 0, count: 0 };
      const amount = 'fromAmount' in tx 
        ? parseFloat(tx.fromAmount || '0') 
        : parseFloat(tx.fromTokenAmount || '0');
      
      volumeByDay.set(date, {
        volume: existing.volume + (isNaN(amount) ? 0 : amount),
        count: existing.count + 1,
      });
    });

    const dailyVolume = Array.from(volumeByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Weekly aggregation
    const weeklyVolume = dailyVolume.reduce<DailyVolume[]>((acc, day) => {
      const weekStart = getWeekStart(day.date);
      const existing = acc.find(w => w.date === weekStart);
      if (existing) {
        existing.volume += day.volume;
        existing.count += day.count;
      } else {
        acc.push({ date: weekStart, volume: day.volume, count: day.count });
      }
      return acc;
    }, []);

    // Top pairs analysis
    const pairCounts = new Map<string, { count: number; volume: number }>();
    allSwaps.forEach(tx => {
      const fromSymbol = 'fromTicker' in tx ? tx.fromTicker : tx.fromTokenSymbol;
      const toSymbol = 'toTicker' in tx ? tx.toTicker : tx.toTokenSymbol;
      const pair = `${fromSymbol}/${toSymbol}`;
      const existing = pairCounts.get(pair) || { count: 0, volume: 0 };
      const amount = 'fromAmount' in tx 
        ? parseFloat(tx.fromAmount || '0') 
        : parseFloat(tx.fromTokenAmount || '0');
      
      pairCounts.set(pair, {
        count: existing.count + 1,
        volume: existing.volume + (isNaN(amount) ? 0 : amount),
      });
    });

    const topPairs = Array.from(pairCounts.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Unique tokens
    const uniqueTokensSet = new Set<string>();
    allSwaps.forEach(tx => {
      const fromSymbol = 'fromTicker' in tx ? tx.fromTicker : tx.fromTokenSymbol;
      const toSymbol = 'toTicker' in tx ? tx.toTicker : tx.toTokenSymbol;
      uniqueTokensSet.add(fromSymbol);
      uniqueTokensSet.add(toSymbol);
    });

    // Chain distribution (DEX only)
    const chainCounts = new Map<string, number>();
    dexTransactions.forEach(tx => {
      const current = chainCounts.get(tx.chainName) || 0;
      chainCounts.set(tx.chainName, current + 1);
    });

    const chainDistribution = Array.from(chainCounts.entries())
      .map(([chain, count]) => ({
        chain,
        count,
        percentage: dexTransactions.length > 0 ? (count / dexTransactions.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Best trading day
    const bestTradingDay = dailyVolume.length > 0
      ? dailyVolume.reduce((best, day) => day.volume > best.volume ? day : best)
      : null;

    // Average trades per day
    const uniqueDays = new Set(allSwaps.map(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return new Date(timestamp).toISOString().split('T')[0];
    }));
    const avgTradesPerDay = uniqueDays.size > 0 ? totalTrades / uniqueDays.size : 0;

    // Trading streak (consecutive days)
    const tradingStreak = calculateTradingStreak(Array.from(uniqueDays).sort());

    return {
      totalTrades,
      totalVolume,
      avgTradeSize,
      successRate,
      dailyVolume,
      weeklyVolume,
      topPairs,
      uniqueTokens: uniqueTokensSet.size,
      chainDistribution,
      bestTradingDay: bestTradingDay ? { date: bestTradingDay.date, volume: bestTradingDay.volume } : null,
      avgTradesPerDay,
      tradingStreak,
    };
  }, [dexTransactions, instantTransactions]);

  return analytics;
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

function calculateTradingStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}
