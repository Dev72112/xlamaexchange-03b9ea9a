import { useMemo } from 'react';
import { useDexTransactionHistory, DexTransaction } from './useDexTransactionHistory';
import { useTransactionHistory, TransactionRecord } from './useTransactionHistory';

interface TradePairStats {
  pair: string;
  count: number;
  volume: number;
  volumeUsd: number;
}

interface DailyVolume {
  date: string;
  volume: number;
  volumeUsd: number;
  count: number;
}

interface HourlyDistribution {
  hour: number;
  count: number;
  label: string;
}

interface TokenStats {
  symbol: string;
  trades: number;
  volumeUsd: number;
}

export interface TradeAnalytics {
  // Summary stats
  totalTrades: number;
  totalVolumeUsd: number;
  avgTradeSizeUsd: number;
  successRate: number;
  failedTrades: number;
  pendingTrades: number;
  
  // Time-based
  dailyVolume: DailyVolume[];
  weeklyVolume: DailyVolume[];
  hourlyDistribution: HourlyDistribution[];
  
  // Pair analysis
  topPairs: TradePairStats[];
  uniqueTokens: number;
  topTokens: TokenStats[];
  
  // Chain analysis
  chainDistribution: { chain: string; count: number; percentage: number; volumeUsd: number }[];
  
  // Performance
  bestTradingDay: { date: string; volumeUsd: number; count: number } | null;
  avgTradesPerDay: number;
  tradingStreak: number;
  activeDays: number;
  
  // Recent activity
  last7DaysTrades: number;
  last30DaysTrades: number;
  weekOverWeekChange: number;
}

export function useTradeAnalytics(): TradeAnalytics {
  const { transactions: dexTransactions } = useDexTransactionHistory();
  const { transactions: instantTransactions } = useTransactionHistory();

  const analytics = useMemo((): TradeAnalytics => {
    // Return empty analytics if no transactions (wallet not connected or no data)
    const hasData = dexTransactions.length > 0 || instantTransactions.length > 0;
    // Combine all swap transactions
    const dexSwaps = dexTransactions.filter(tx => tx.type === 'swap');
    const allSwaps = [
      ...dexSwaps,
      ...instantTransactions,
    ];

    const totalTrades = allSwaps.length;

    // Calculate success/fail/pending rates
    const successfulDexSwaps = dexSwaps.filter(tx => tx.status === 'confirmed').length;
    const failedDexSwaps = dexSwaps.filter(tx => tx.status === 'failed').length;
    const pendingDexSwaps = dexSwaps.filter(tx => tx.status === 'pending').length;
    
    const successfulInstant = instantTransactions.filter(tx => tx.status === 'completed').length;
    const failedInstant = instantTransactions.filter(tx => tx.status === 'failed').length;
    const pendingInstant = instantTransactions.filter(tx => tx.status === 'pending').length;
    
    const successfulTotal = successfulDexSwaps + successfulInstant;
    const failedTrades = failedDexSwaps + failedInstant;
    const pendingTrades = pendingDexSwaps + pendingInstant;
    
    const successRate = totalTrades > 0 
      ? (successfulTotal / totalTrades) * 100 
      : 100;

    // Calculate total volume in USD
    let totalVolumeUsd = 0;
    allSwaps.forEach(tx => {
      if ('fromAmountUsd' in tx && typeof tx.fromAmountUsd === 'number') {
        totalVolumeUsd += tx.fromAmountUsd;
      } else if ('fromAmountUsd' in tx && typeof (tx as any).fromAmountUsd === 'number') {
        totalVolumeUsd += (tx as any).fromAmountUsd;
      }
    });

    const avgTradeSizeUsd = totalTrades > 0 ? totalVolumeUsd / totalTrades : 0;

    // Group by day with USD volume
    const volumeByDay = new Map<string, { volume: number; volumeUsd: number; count: number }>();
    allSwaps.forEach(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      const date = new Date(timestamp).toISOString().split('T')[0];
      const existing = volumeByDay.get(date) || { volume: 0, volumeUsd: 0, count: 0 };
      
      const amount = 'fromAmount' in tx 
        ? parseFloat(tx.fromAmount || '0') 
        : parseFloat((tx as DexTransaction).fromTokenAmount || '0');
      
      const amountUsd = 'fromAmountUsd' in tx ? (tx.fromAmountUsd || 0) : 0;
      
      volumeByDay.set(date, {
        volume: existing.volume + (isNaN(amount) ? 0 : amount),
        volumeUsd: existing.volumeUsd + amountUsd,
        count: existing.count + 1,
      });
    });

    const dailyVolume = Array.from(volumeByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90); // Last 90 days

    // Weekly aggregation
    const weeklyVolume = dailyVolume.reduce<DailyVolume[]>((acc, day) => {
      const weekStart = getWeekStart(day.date);
      const existing = acc.find(w => w.date === weekStart);
      if (existing) {
        existing.volume += day.volume;
        existing.volumeUsd += day.volumeUsd;
        existing.count += day.count;
      } else {
        acc.push({ date: weekStart, volume: day.volume, volumeUsd: day.volumeUsd, count: day.count });
      }
      return acc;
    }, []);

    // Hourly distribution
    const hourCounts = new Map<number, number>();
    allSwaps.forEach(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      const hour = new Date(timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    const hourlyDistribution: HourlyDistribution[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts.get(i) || 0,
      label: `${i.toString().padStart(2, '0')}:00`
    }));

    // Top pairs analysis with USD
    const pairCounts = new Map<string, { count: number; volume: number; volumeUsd: number }>();
    allSwaps.forEach(tx => {
      const fromSymbol = 'fromTicker' in tx ? tx.fromTicker : (tx as DexTransaction).fromTokenSymbol;
      const toSymbol = 'toTicker' in tx ? tx.toTicker : (tx as DexTransaction).toTokenSymbol;
      const pair = `${fromSymbol}/${toSymbol}`;
      const existing = pairCounts.get(pair) || { count: 0, volume: 0, volumeUsd: 0 };
      
      const amount = 'fromAmount' in tx 
        ? parseFloat(tx.fromAmount || '0') 
        : parseFloat((tx as DexTransaction).fromTokenAmount || '0');
      
      const amountUsd = 'fromAmountUsd' in tx ? (tx.fromAmountUsd || 0) : 0;
      
      pairCounts.set(pair, {
        count: existing.count + 1,
        volume: existing.volume + (isNaN(amount) ? 0 : amount),
        volumeUsd: existing.volumeUsd + amountUsd,
      });
    });

    const topPairs = Array.from(pairCounts.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.volumeUsd - a.volumeUsd || b.count - a.count)
      .slice(0, 10);

    // Unique tokens & top tokens
    const tokenStats = new Map<string, { trades: number; volumeUsd: number }>();
    allSwaps.forEach(tx => {
      const fromSymbol = 'fromTicker' in tx ? tx.fromTicker : (tx as DexTransaction).fromTokenSymbol;
      const toSymbol = 'toTicker' in tx ? tx.toTicker : (tx as DexTransaction).toTokenSymbol;
      const amountUsd = 'fromAmountUsd' in tx ? (tx.fromAmountUsd || 0) : 0;
      
      // From token
      const fromStats = tokenStats.get(fromSymbol) || { trades: 0, volumeUsd: 0 };
      tokenStats.set(fromSymbol, {
        trades: fromStats.trades + 1,
        volumeUsd: fromStats.volumeUsd + amountUsd,
      });
      
      // To token
      const toStats = tokenStats.get(toSymbol) || { trades: 0, volumeUsd: 0 };
      tokenStats.set(toSymbol, {
        trades: toStats.trades + 1,
        volumeUsd: toStats.volumeUsd,
      });
    });

    const topTokens = Array.from(tokenStats.entries())
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.volumeUsd - a.volumeUsd)
      .slice(0, 10);

    // Chain distribution with USD (DEX only)
    const chainStats = new Map<string, { count: number; volumeUsd: number }>();
    dexSwaps.forEach(tx => {
      const current = chainStats.get(tx.chainName) || { count: 0, volumeUsd: 0 };
      chainStats.set(tx.chainName, {
        count: current.count + 1,
        volumeUsd: current.volumeUsd + (tx.fromAmountUsd || 0),
      });
    });

    const chainDistribution = Array.from(chainStats.entries())
      .map(([chain, data]) => ({
        chain,
        count: data.count,
        volumeUsd: data.volumeUsd,
        percentage: dexSwaps.length > 0 ? (data.count / dexSwaps.length) * 100 : 0,
      }))
      .sort((a, b) => b.volumeUsd - a.volumeUsd);

    // Best trading day (by USD volume)
    const bestTradingDay = dailyVolume.length > 0
      ? dailyVolume.reduce((best, day) => day.volumeUsd > best.volumeUsd ? day : best)
      : null;

    // Unique trading days
    const uniqueDays = new Set(allSwaps.map(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return new Date(timestamp).toISOString().split('T')[0];
    }));
    const activeDays = uniqueDays.size;
    const avgTradesPerDay = activeDays > 0 ? totalTrades / activeDays : 0;

    // Trading streak (consecutive days)
    const tradingStreak = calculateTradingStreak(Array.from(uniqueDays).sort());

    // Recent activity metrics
    const now = Date.now();
    const last7Days = allSwaps.filter(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return now - timestamp < 7 * 24 * 60 * 60 * 1000;
    }).length;
    
    const last30Days = allSwaps.filter(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return now - timestamp < 30 * 24 * 60 * 60 * 1000;
    }).length;

    // Week over week change
    const thisWeekStart = now - 7 * 24 * 60 * 60 * 1000;
    const lastWeekStart = now - 14 * 24 * 60 * 60 * 1000;
    
    const thisWeekTrades = allSwaps.filter(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return timestamp >= thisWeekStart;
    }).length;
    
    const lastWeekTrades = allSwaps.filter(tx => {
      const timestamp = 'createdAt' in tx ? tx.createdAt : tx.timestamp;
      return timestamp >= lastWeekStart && timestamp < thisWeekStart;
    }).length;
    
    const weekOverWeekChange = lastWeekTrades > 0 
      ? ((thisWeekTrades - lastWeekTrades) / lastWeekTrades) * 100 
      : thisWeekTrades > 0 ? 100 : 0;

    return {
      totalTrades,
      totalVolumeUsd,
      avgTradeSizeUsd,
      successRate,
      failedTrades,
      pendingTrades,
      dailyVolume,
      weeklyVolume,
      hourlyDistribution,
      topPairs,
      uniqueTokens: tokenStats.size,
      topTokens,
      chainDistribution,
      bestTradingDay: bestTradingDay ? { 
        date: bestTradingDay.date, 
        volumeUsd: bestTradingDay.volumeUsd,
        count: bestTradingDay.count
      } : null,
      avgTradesPerDay,
      tradingStreak,
      activeDays,
      last7DaysTrades: last7Days,
      last30DaysTrades: last30Days,
      weekOverWeekChange,
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