import { useMemo, useState, useEffect, useRef } from 'react';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { useTransactionHistory } from './useTransactionHistory';
import { useBridgeTransactions } from '@/contexts/BridgeTransactionContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { useMultiWallet } from '@/contexts/MultiWalletContext';

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

// Wallet holdings for HODL analysis
export interface WalletHolding {
  symbol: string;
  balance: number;
  valueUsd: number;
  price: number;
  chainIndex: string;
  tokenAddress: string;
}

interface TradeVsHodlSummary {
  totalTrades: number;
  tradesAnalyzed: number;
  totalTradeValue: number;
  currentTradeValue: number;
  tradePnl: number;
  tradePnlPercent: number;
  // HODL = actual wallet holdings value
  hodlPnl: number;
  hodlPnlPercent: number;
  hodlStartValue: number;
  hodlCurrentValue: number;
  // Wallet holdings breakdown
  walletHoldings: WalletHolding[];
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
  isLoadingHoldings: boolean;
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

// Get all connected chains for balance fetching
const ALL_CHAIN_INDICES = '1,56,137,42161,10,43114,250,8453,324,59144,534352,196,81457';

export function useTradeVsHodl(): TradeVsHodlSummary {
  const { transactions: dexTransactions } = useDexTransactions();
  const { transactions: instantTransactions } = useTransactionHistory();
  const { transactions: bridgeTransactions } = useBridgeTransactions();
  const { evmAddress, solanaAddress, tronAddress, isOkxConnected } = useMultiWallet();
  
  const [performances, setPerformances] = useState<TradePerformance[]>([]);
  const [walletHoldings, setWalletHoldings] = useState<WalletHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  
  // Track which trades we've already processed to prevent refetching
  const processedTradeIdsRef = useRef<string>('');
  const isFetchingRef = useRef(false);
  const holdingsFetchedRef = useRef<string>('');

  // Get all confirmed trades from all sources - STABLE memo
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

  // Create a stable trade ID fingerprint
  const tradeIdsFingerprint = useMemo(() => {
    return allConfirmedTrades.slice(0, 50).map(t => t.id).join(',');
  }, [allConfirmedTrades]);

  // Fetch current prices and calculate trade performance - BATCHED
  useEffect(() => {
    // Skip if no trades or already fetching same set
    if (allConfirmedTrades.length === 0) {
      setPerformances([]);
      setIsLoading(false);
      return;
    }

    // Skip if we've already processed these exact trades
    if (tradeIdsFingerprint === processedTradeIdsRef.current) {
      return;
    }

    // Skip if already fetching
    if (isFetchingRef.current) {
      return;
    }

    let cancelled = false;
    isFetchingRef.current = true;

    async function calculatePerformances() {
      setIsLoading(true);
      const tradesToProcess = allConfirmedTrades.slice(0, 50);
      
      // Batch fetch all prices at once
      const pricePromises = tradesToProcess
        .filter(t => t.toTokenAddress && t.chainId)
        .map(async (trade) => {
          const price = await getTokenPrice(trade.chainId!, trade.toTokenAddress!, trade.toSymbol);
          return { id: trade.id, price };
        });

      const priceResults = await Promise.all(pricePromises);
      const priceMap = new Map(priceResults.map(p => [p.id, p.price]));

      if (cancelled) {
        isFetchingRef.current = false;
        return;
      }

      // Now calculate all performances synchronously
      const results: TradePerformance[] = [];
      
      for (const trade of tradesToProcess) {
        let currentToValueUsd = 0;
        
        if (trade.toTokenAddress && trade.chainId) {
          const toPrice = priceMap.get(trade.id) || 0;
          currentToValueUsd = trade.toAmount * toPrice;
        } else {
          // For instant/bridge without live pricing, estimate based on original value
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
      }

      if (!cancelled) {
        processedTradeIdsRef.current = tradeIdsFingerprint;
        setPerformances(results);
        setIsLoading(false);
      }
      
      isFetchingRef.current = false;
    }

    calculatePerformances();

    return () => { 
      cancelled = true; 
    };
  }, [tradeIdsFingerprint, allConfirmedTrades]);

  // Fetch actual wallet balances for HODL analysis
  useEffect(() => {
    const primaryAddress = evmAddress || solanaAddress || tronAddress;
    if (!primaryAddress) {
      setWalletHoldings([]);
      setIsLoadingHoldings(false);
      return;
    }

    // Skip if we've already fetched for this address
    if (holdingsFetchedRef.current === primaryAddress) {
      return;
    }

    let cancelled = false;
    
    async function fetchWalletHoldings() {
      setIsLoadingHoldings(true);
      
      try {
        // Fetch wallet balances from OKX API
        const balances = await okxDexService.getWalletBalances(
          primaryAddress!,
          ALL_CHAIN_INDICES,
          true // exclude risk tokens
        );

        if (cancelled) return;

        // Convert to WalletHolding format
        const holdings: WalletHolding[] = balances
          .filter(b => parseFloat(b.balance) > 0 && parseFloat(b.tokenPrice) > 0)
          .map(b => ({
            symbol: b.symbol,
            balance: parseFloat(b.balance),
            valueUsd: parseFloat(b.balance) * parseFloat(b.tokenPrice),
            price: parseFloat(b.tokenPrice),
            chainIndex: b.chainIndex,
            tokenAddress: b.tokenContractAddress,
          }))
          .sort((a, b) => b.valueUsd - a.valueUsd);

        if (!cancelled) {
          holdingsFetchedRef.current = primaryAddress!;
          setWalletHoldings(holdings);
        }
      } catch (error) {
        console.warn('Failed to fetch wallet holdings:', error);
        if (!cancelled) {
          setWalletHoldings([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHoldings(false);
        }
      }
    }

    fetchWalletHoldings();

    return () => { cancelled = true; };
  }, [evmAddress, solanaAddress, tronAddress]);

  // Calculate summary comparing trades vs actual wallet holdings
  const summary = useMemo((): TradeVsHodlSummary => {
    const validTrades = performances.filter(p => p.tradeValueUsd > 0 || p.currentToValueUsd > 0);
    
    // Calculate HODL value from actual wallet holdings
    const hodlCurrentValue = walletHoldings.reduce((sum, h) => sum + h.valueUsd, 0);
    
    // For P&L, we don't have historical data, so estimate based on trade volume
    // This is a rough approximation - true HODL P&L would require historical snapshots
    const totalTradeVolume = validTrades.reduce((sum, t) => sum + t.tradeValueUsd, 0);
    const tradePnl = validTrades.reduce((sum, t) => sum + t.tradePnl, 0);
    
    // Estimate HODL start value: current holdings minus trade profits/losses
    // This assumes trades were made from the current portfolio
    const hodlStartValue = hodlCurrentValue > 0 ? hodlCurrentValue - tradePnl : totalTradeVolume;
    const hodlPnl = hodlCurrentValue - hodlStartValue;
    const hodlPnlPercent = hodlStartValue > 0 ? (hodlPnl / hodlStartValue) * 100 : 0;

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
        walletHoldings,
        tradeVsHodlDiff: 0,
        tradingWasBetter: false,
        winningTrades: 0,
        losingTrades: 0,
        bestTrade: null,
        worstTrade: null,
        trades: [],
        cumulativeData: [],
        isLoading,
        isLoadingHoldings,
      };
    }

    const totalTradeValue = validTrades.reduce((sum, t) => sum + t.tradeValueUsd, 0);
    const currentTradeValue = validTrades.reduce((sum, t) => sum + t.currentToValueUsd, 0);
    const calculatedTradePnl = currentTradeValue - totalTradeValue;
    const tradePnlPercent = totalTradeValue > 0 ? (calculatedTradePnl / totalTradeValue) * 100 : 0;
    
    // Compare trade performance vs HODL performance (percentage-based for fairness)
    const tradeVsHodlDiff = tradePnlPercent - hodlPnlPercent;

    const winningTrades = validTrades.filter(t => t.tradePnl > 0).length;
    const losingTrades = validTrades.filter(t => t.tradePnl < 0).length;

    const sortedByPerformance = [...validTrades].sort((a, b) => b.tradePnl - a.tradePnl);

    // Build cumulative chart data
    const sortedByDate = [...validTrades].sort((a, b) => a.date - b.date);
    let cumulativeTradeValue = 0;
    let cumulativeOriginalValue = 0;
    
    // Build cumulative chart data
    const cumulativeData: CumulativeDataPoint[] = sortedByDate.map((trade, idx) => {
      cumulativeOriginalValue += trade.tradeValueUsd;
      cumulativeTradeValue += trade.currentToValueUsd;
      
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
      tradePnl: calculatedTradePnl,
      tradePnlPercent,
      hodlPnl,
      hodlPnlPercent,
      hodlStartValue,
      hodlCurrentValue,
      walletHoldings,
      tradeVsHodlDiff,
      tradingWasBetter: tradeVsHodlDiff > 0,
      winningTrades,
      losingTrades,
      bestTrade: sortedByPerformance[0] || null,
      worstTrade: sortedByPerformance[sortedByPerformance.length - 1] || null,
      trades: validTrades,
      cumulativeData,
      isLoading,
      isLoadingHoldings,
    };
  }, [performances, allConfirmedTrades.length, isLoading, isLoadingHoldings, walletHoldings]);

  return summary;
}
