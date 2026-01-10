import { useMemo, useState, useEffect, useRef } from 'react';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService } from '@/services/okxdex';
import { supabase } from '@/integrations/supabase/client';

export interface TokenPnLData {
  symbol: string;
  chainIndex: string;
  tokenAddress: string;
  totalBought: number;
  totalBoughtUsd: number;
  totalSold: number;
  totalSoldUsd: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  currentPrice: number;
  currentBalance: number;
  currentValueUsd: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  pnLPercentage: number;
  trades: number;
  costBasis: number; // From initial snapshot
}

export interface TokenPnLAnalytics {
  tokens: TokenPnLData[];
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnL: number;
  bestPerformer: TokenPnLData | null;
  worstPerformer: TokenPnLData | null;
  isLoading: boolean;
  hasSnapshot: boolean;
}

interface InitialHolding {
  token_address: string;
  token_symbol: string;
  chain_index: string;
  balance: number;
  price: number;
  value_usd: number;
}

// Price cache
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000;

async function getCachedPrice(chainIndex: string, tokenAddress: string): Promise<number> {
  const key = `${chainIndex}:${tokenAddress.toLowerCase()}`;
  const cached = priceCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    const priceInfo = await okxDexService.getTokenPriceInfo(chainIndex, tokenAddress);
    const price = parseFloat(priceInfo?.price || '0');
    
    if (price > 0) {
      priceCache.set(key, { price, timestamp: Date.now() });
    }
    return price;
  } catch {
    return 0;
  }
}

export function useTokenPnL(chainFilter?: string): TokenPnLAnalytics {
  const { transactions: dexTransactions } = useDexTransactions();
  const { anyConnectedAddress } = useMultiWallet();
  
  const [initialHoldings, setInitialHoldings] = useState<InitialHolding[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [currentBalances, setCurrentBalances] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  
  const fetchedForRef = useRef<string>('');

  // Fetch initial snapshot and current balances
  useEffect(() => {
    if (!anyConnectedAddress) {
      setInitialHoldings([]);
      setIsLoading(false);
      return;
    }

    const addressKey = anyConnectedAddress.toLowerCase();
    if (fetchedForRef.current === addressKey) return;

    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      
      try {
        // Fetch initial snapshot
        const { data: snapshotData } = await supabase
          .from('wallet_snapshots')
          .select('*')
          .eq('user_address', addressKey)
          .eq('snapshot_type', 'initial');

        if (cancelled) return;

        const holdings: InitialHolding[] = (snapshotData || []).map(row => ({
          token_address: row.token_address,
          token_symbol: row.token_symbol,
          chain_index: row.chain_index,
          balance: parseFloat(row.balance) || 0,
          price: row.price_at_snapshot || 0,
          value_usd: row.value_usd || 0,
        }));

        setInitialHoldings(holdings);
        setHasSnapshot(holdings.length > 0);

        // Fetch current balances
        const chains = '1,56,137,42161,10,43114,250,8453,324,59144,534352,196,81457,501';
        const balances = await okxDexService.getWalletBalances(anyConnectedAddress, chains, true);
        
        if (cancelled) return;

        const balanceMap = new Map<string, number>();
        const priceMap = new Map<string, number>();
        
        balances.forEach(b => {
          const key = `${b.chainIndex}:${b.tokenContractAddress?.toLowerCase() || 'native'}`;
          balanceMap.set(key, parseFloat(b.balance) || 0);
          const price = parseFloat(b.tokenPrice) || 0;
          if (price > 0) {
            priceMap.set(key, price);
          }
        });

        setCurrentBalances(balanceMap);
        setCurrentPrices(priceMap);
        fetchedForRef.current = addressKey;
      } catch (err) {
        console.error('Error fetching P&L data:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [anyConnectedAddress]);

  // Process trades and calculate P&L
  const analytics = useMemo((): TokenPnLAnalytics => {
    // Build trade aggregates per token
    const tokenTrades = new Map<string, {
      symbol: string;
      chainIndex: string;
      tokenAddress: string;
      buyVolume: number;
      buyValueUsd: number;
      sellVolume: number;
      sellValueUsd: number;
      trades: number;
    }>();

    // Only DEX swaps with prices contribute to P&L
    dexTransactions
      .filter(tx => tx.type === 'swap' && tx.status === 'confirmed')
      .filter(tx => !chainFilter || chainFilter === 'all' || tx.chainId === chainFilter)
      .forEach(tx => {
        // Track tokens bought (toToken)
        if (tx.toTokenAddress) {
          const key = `${tx.chainId}:${tx.toTokenAddress.toLowerCase()}`;
          const existing = tokenTrades.get(key) || {
            symbol: tx.toTokenSymbol,
            chainIndex: tx.chainId,
            tokenAddress: tx.toTokenAddress,
            buyVolume: 0,
            buyValueUsd: 0,
            sellVolume: 0,
            sellValueUsd: 0,
            trades: 0,
          };
          
          const toAmount = parseFloat(tx.toTokenAmount) || 0;
          const toValueUsd = tx.toAmountUsd || 0;
          
          existing.buyVolume += toAmount;
          existing.buyValueUsd += toValueUsd;
          existing.trades += 1;
          tokenTrades.set(key, existing);
        }

        // Track tokens sold (fromToken)
        if (tx.fromTokenAddress) {
          const key = `${tx.chainId}:${tx.fromTokenAddress.toLowerCase()}`;
          const existing = tokenTrades.get(key);
          
          if (existing) {
            const fromAmount = parseFloat(tx.fromTokenAmount) || 0;
            const fromValueUsd = tx.fromAmountUsd || 0;
            
            existing.sellVolume += fromAmount;
            existing.sellValueUsd += fromValueUsd;
          }
        }
      });

    // Build initial holdings map for cost basis
    const initialCostBasis = new Map<string, { balance: number; price: number; valueUsd: number }>();
    initialHoldings.forEach(h => {
      const key = `${h.chain_index}:${h.token_address.toLowerCase()}`;
      initialCostBasis.set(key, {
        balance: h.balance,
        price: h.price,
        valueUsd: h.value_usd,
      });
    });

    // Calculate P&L for each token
    const tokens: TokenPnLData[] = [];
    
    // Include all traded tokens
    tokenTrades.forEach((data, key) => {
      const initial = initialCostBasis.get(key);
      const currentPrice = currentPrices.get(key) || 0;
      const currentBalance = currentBalances.get(key) || 0;
      
      // Cost basis from initial snapshot or average buy price
      const costBasisPrice = initial?.price || (data.buyVolume > 0 ? data.buyValueUsd / data.buyVolume : 0);
      
      // Realized P&L = (Sell Revenue) - (Cost of Sold Tokens using FIFO)
      const costOfSold = data.sellVolume * costBasisPrice;
      const realizedPnL = data.sellValueUsd - costOfSold;
      
      // Unrealized P&L = (Current Holdings Value) - (Cost Basis of Current Holdings)
      const currentValueUsd = currentBalance * currentPrice;
      const costOfHoldings = currentBalance * costBasisPrice;
      const unrealizedPnL = currentValueUsd - costOfHoldings;
      
      const totalPnL = realizedPnL + unrealizedPnL;
      const totalInvested = (initial?.valueUsd || 0) + data.buyValueUsd;
      const pnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

      tokens.push({
        symbol: data.symbol,
        chainIndex: data.chainIndex,
        tokenAddress: data.tokenAddress,
        totalBought: data.buyVolume,
        totalBoughtUsd: data.buyValueUsd,
        totalSold: data.sellVolume,
        totalSoldUsd: data.sellValueUsd,
        avgBuyPrice: data.buyVolume > 0 ? data.buyValueUsd / data.buyVolume : 0,
        avgSellPrice: data.sellVolume > 0 ? data.sellValueUsd / data.sellVolume : 0,
        currentPrice,
        currentBalance,
        currentValueUsd,
        realizedPnL,
        unrealizedPnL,
        totalPnL,
        pnLPercentage,
        trades: data.trades,
        costBasis: costBasisPrice,
      });
    });

    // Sort by total P&L descending
    tokens.sort((a, b) => b.totalPnL - a.totalPnL);

    const totalRealizedPnL = tokens.reduce((sum, t) => sum + t.realizedPnL, 0);
    const totalUnrealizedPnL = tokens.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const totalPnL = totalRealizedPnL + totalUnrealizedPnL;

    return {
      tokens,
      totalRealizedPnL,
      totalUnrealizedPnL,
      totalPnL,
      bestPerformer: tokens.length > 0 ? tokens[0] : null,
      worstPerformer: tokens.length > 0 ? tokens[tokens.length - 1] : null,
      isLoading,
      hasSnapshot,
    };
  }, [dexTransactions, chainFilter, initialHoldings, currentPrices, currentBalances, isLoading, hasSnapshot]);

  return analytics;
}
