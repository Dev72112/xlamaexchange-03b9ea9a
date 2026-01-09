import { useMemo, useState, useEffect, useRef } from 'react';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { useTransactionHistory } from './useTransactionHistory';
import { useBridgeTransactions } from '@/contexts/BridgeTransactionContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { supabase } from '@/integrations/supabase/client';

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

interface InitialSnapshot {
  token_address: string;
  token_symbol: string;
  chain_index: string;
  balance: number;
  price: number;
  value_usd: number;
}

interface TradeVsHodlSummary {
  totalTrades: number;
  tradesAnalyzed: number;
  totalTradeValue: number;
  currentTradeValue: number;
  tradePnl: number;
  tradePnlPercent: number;
  // HODL = what initial snapshot would be worth today
  hodlPnl: number;
  hodlPnlPercent: number;
  hodlStartValue: number;    // Initial snapshot total value
  hodlCurrentValue: number;  // Initial tokens at current prices
  // Current wallet value (what you actually have)
  currentWalletValue: number;
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
  hasSnapshot: boolean;
}

// Simple price cache
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000;

async function getTokenPrice(chainIndex: string, tokenAddress: string): Promise<number> {
  const cacheKey = `${chainIndex}:${tokenAddress.toLowerCase()}`;
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
  } catch {
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

const ALL_CHAIN_INDICES = '1,56,137,42161,10,43114,250,8453,324,59144,534352,196,81457,501';

export function useTradeVsHodl(): TradeVsHodlSummary {
  const { transactions: dexTransactions } = useDexTransactions();
  const { transactions: instantTransactions } = useTransactionHistory();
  const { transactions: bridgeTransactions } = useBridgeTransactions();
  const { evmAddress, solanaAddress, tronAddress, anyConnectedAddress } = useMultiWallet();
  
  const [performances, setPerformances] = useState<TradePerformance[]>([]);
  const [walletHoldings, setWalletHoldings] = useState<WalletHolding[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<InitialSnapshot[]>([]);
  const [hodlCurrentValue, setHodlCurrentValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  
  const processedTradeIdsRef = useRef<string>('');
  const isFetchingRef = useRef(false);
  const holdingsFetchedRef = useRef<string>('');

  // Fetch initial snapshot and calculate HODL value at current prices
  useEffect(() => {
    if (!anyConnectedAddress) {
      setInitialSnapshot([]);
      setHodlCurrentValue(0);
      setHasSnapshot(false);
      return;
    }

    const addressKey = anyConnectedAddress.toLowerCase();
    let cancelled = false;

    async function fetchInitialSnapshot() {
      try {
        const { data } = await supabase
          .from('wallet_snapshots')
          .select('*')
          .eq('user_address', addressKey)
          .eq('snapshot_type', 'initial');

        if (cancelled) return;

        const holdings: InitialSnapshot[] = (data || []).map(row => ({
          token_address: row.token_address,
          token_symbol: row.token_symbol,
          chain_index: row.chain_index,
          balance: parseFloat(row.balance) || 0,
          price: row.price_at_snapshot || 0,
          value_usd: row.value_usd || 0,
        }));

        setInitialSnapshot(holdings);
        setHasSnapshot(holdings.length > 0);

        if (holdings.length === 0) {
          setHodlCurrentValue(0);
          return;
        }

        // Calculate what initial holdings would be worth at current prices
        let hodlValue = 0;
        for (const h of holdings.slice(0, 20)) { // Limit to prevent too many requests
          try {
            const currentPrice = await getTokenPrice(h.chain_index, h.token_address);
            hodlValue += h.balance * currentPrice;
          } catch {
            // Use original price as fallback
            hodlValue += h.value_usd;
          }
        }

        if (!cancelled) {
          setHodlCurrentValue(hodlValue);
        }
      } catch (err) {
        console.error('Error fetching initial snapshot:', err);
      }
    }

    fetchInitialSnapshot();
    return () => { cancelled = true; };
  }, [anyConnectedAddress]);

  // Get all confirmed trades from all sources
  const allConfirmedTrades = useMemo((): UnifiedTrade[] => {
    const trades: UnifiedTrade[] = [];
    
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
    
    return trades.sort((a, b) => b.timestamp - a.timestamp);
  }, [dexTransactions, instantTransactions, bridgeTransactions]);

  const tradeIdsFingerprint = useMemo(() => {
    return allConfirmedTrades.slice(0, 50).map(t => t.id).join(',');
  }, [allConfirmedTrades]);

  // Fetch current prices and calculate trade performance
  useEffect(() => {
    if (allConfirmedTrades.length === 0) {
      setPerformances([]);
      setIsLoading(false);
      return;
    }

    if (tradeIdsFingerprint === processedTradeIdsRef.current) return;
    if (isFetchingRef.current) return;

    let cancelled = false;
    isFetchingRef.current = true;

    async function calculatePerformances() {
      setIsLoading(true);
      const tradesToProcess = allConfirmedTrades.slice(0, 50);
      
      const pricePromises = tradesToProcess
        .filter(t => t.toTokenAddress && t.chainId)
        .map(async (trade) => {
          const price = await getTokenPrice(trade.chainId!, trade.toTokenAddress!);
          return { id: trade.id, price };
        });

      const priceResults = await Promise.all(pricePromises);
      const priceMap = new Map(priceResults.map(p => [p.id, p.price]));

      if (cancelled) {
        isFetchingRef.current = false;
        return;
      }

      const results: TradePerformance[] = [];
      
      for (const trade of tradesToProcess) {
        let currentToValueUsd = 0;
        
        if (trade.toTokenAddress && trade.chainId) {
          const toPrice = priceMap.get(trade.id) || 0;
          currentToValueUsd = trade.toAmount * toPrice;
        } else {
          currentToValueUsd = trade.fromAmountUsd * 0.98;
        }

        const tradeValueUsd = trade.fromAmountUsd;
        
        if (tradeValueUsd === 0 && currentToValueUsd === 0) continue;
        
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
    return () => { cancelled = true; };
  }, [tradeIdsFingerprint, allConfirmedTrades]);

  // Fetch current wallet balances
  useEffect(() => {
    const primaryAddress = evmAddress || solanaAddress || tronAddress;
    if (!primaryAddress) {
      setWalletHoldings([]);
      setIsLoadingHoldings(false);
      return;
    }

    if (holdingsFetchedRef.current === primaryAddress) return;

    let cancelled = false;
    
    async function fetchWalletHoldings() {
      setIsLoadingHoldings(true);
      
      try {
        const balances = await okxDexService.getWalletBalances(
          primaryAddress!,
          ALL_CHAIN_INDICES,
          true
        );

        if (cancelled) return;

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

  // Calculate summary
  const summary = useMemo((): TradeVsHodlSummary => {
    const validTrades = performances.filter(p => p.tradeValueUsd > 0 || p.currentToValueUsd > 0);
    
    // HODL values from initial snapshot
    const hodlStartValue = initialSnapshot.reduce((sum, h) => sum + h.value_usd, 0);
    const hodlPnl = hodlCurrentValue - hodlStartValue;
    const hodlPnlPercent = hodlStartValue > 0 ? (hodlPnl / hodlStartValue) * 100 : 0;

    // Current wallet value
    const currentWalletValue = walletHoldings.reduce((sum, h) => sum + h.valueUsd, 0);

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
        currentWalletValue,
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
        hasSnapshot,
      };
    }

    const totalTradeValue = validTrades.reduce((sum, t) => sum + t.tradeValueUsd, 0);
    const currentTradeValue = validTrades.reduce((sum, t) => sum + t.currentToValueUsd, 0);
    const tradePnl = currentTradeValue - totalTradeValue;
    const tradePnlPercent = totalTradeValue > 0 ? (tradePnl / totalTradeValue) * 100 : 0;
    
    // Compare: did trading outperform HODL?
    // Real comparison: current wallet value vs HODL value (what you'd have if you never traded)
    const tradeVsHodlDiff = hasSnapshot && hodlCurrentValue > 0 
      ? currentWalletValue - hodlCurrentValue 
      : tradePnl - hodlPnl;

    const winningTrades = validTrades.filter(t => t.tradePnl > 0).length;
    const losingTrades = validTrades.filter(t => t.tradePnl < 0).length;

    const sortedByPerformance = [...validTrades].sort((a, b) => b.tradePnl - a.tradePnl);
    const sortedByDate = [...validTrades].sort((a, b) => a.date - b.date);
    
    let cumulativeTradeValue = 0;
    let cumulativeOriginalValue = 0;
    
    const cumulativeData: CumulativeDataPoint[] = sortedByDate.map((trade, idx) => {
      cumulativeOriginalValue += trade.tradeValueUsd;
      cumulativeTradeValue += trade.currentToValueUsd;
      
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
      currentWalletValue,
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
      hasSnapshot,
    };
  }, [performances, allConfirmedTrades.length, isLoading, isLoadingHoldings, walletHoldings, initialSnapshot, hodlCurrentValue, hasSnapshot]);

  return summary;
}
