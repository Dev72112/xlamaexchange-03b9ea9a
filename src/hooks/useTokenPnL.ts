import { useMemo, useState, useEffect, useRef } from 'react';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { okxDexService } from '@/services/okxdex';

export interface TokenPnLData {
  symbol: string;
  chainIndex: string;
  tokenAddress: string;
  totalBought: number;
  totalSold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  currentPrice: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  pnLPercentage: number;
  trades: number;
}

export interface TokenPnLAnalytics {
  tokens: TokenPnLData[];
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnL: number;
  bestPerformer: TokenPnLData | null;
  worstPerformer: TokenPnLData | null;
  isLoading: boolean;
}

// Unified trade record for P&L calculation
interface UnifiedTrade {
  chainIndex: string;
  fromSymbol: string;
  fromAddress: string;
  fromAmount: number;
  fromAmountUsd: number;
  toSymbol: string;
  toAddress: string;
  toAmount: number;
  toAmountUsd: number;
  timestamp: number;
  type: 'dex' | 'instant' | 'bridge';
}

export function useTokenPnL(chainFilter?: string): TokenPnLAnalytics {
  const { transactions: dexTransactions } = useDexTransactions();
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const pricesFetchedRef = useRef(false);

  // Unify all trades into a common format with USD value calculation fallbacks
  // NOTE: Only DEX swaps generate true P&L - Bridge and Instant are asset transfers/conversions
  const unifiedTrades = useMemo((): UnifiedTrade[] => {
    const trades: UnifiedTrade[] = [];
    
    // Only DEX transactions contribute to actual P&L
    // Bridge = same asset, different chain (no P&L)
    // Instant = exchange at market rate (P&L is realized immediately, hard to track)
    dexTransactions
      .filter(tx => tx.type === 'swap' && tx.status === 'confirmed')
      .filter(tx => !chainFilter || chainFilter === 'all' || tx.chainId === chainFilter)
      .forEach(tx => {
        const fromAmount = parseFloat(tx.fromTokenAmount) || 0;
        const toAmount = parseFloat(tx.toTokenAmount) || 0;
        
        // Calculate USD values with fallback to price * amount
        const fromTokenPrice = tx.fromTokenPrice || 0;
        const toTokenPrice = tx.toTokenPrice || 0;
        
        const fromAmountUsd = tx.fromAmountUsd || (fromAmount * fromTokenPrice);
        const toAmountUsd = tx.toAmountUsd || (toAmount * toTokenPrice);
        
        trades.push({
          chainIndex: tx.chainId,
          fromSymbol: tx.fromTokenSymbol,
          fromAddress: tx.fromTokenAddress || '',
          fromAmount,
          fromAmountUsd,
          toSymbol: tx.toTokenSymbol,
          toAddress: tx.toTokenAddress || '',
          toAmount,
          toAmountUsd,
          timestamp: tx.timestamp,
          type: 'dex',
        });
      });
    
    return trades;
  }, [dexTransactions, chainFilter]);

  // Extract unique tokens that need price updates
  const uniqueTokens = useMemo(() => {
    const tokens = new Map<string, { chainIndex: string; address: string; symbol: string }>();
    
    unifiedTrades.forEach(trade => {
      // Track "to" tokens (tokens bought) - skip if no address or instant
      if (trade.toAddress && trade.chainIndex !== 'instant') {
        const key = `${trade.chainIndex}-${trade.toAddress.toLowerCase()}`;
        if (!tokens.has(key)) {
          tokens.set(key, {
            chainIndex: trade.chainIndex,
            address: trade.toAddress,
            symbol: trade.toSymbol,
          });
        }
      }
    });

    return Array.from(tokens.values());
  }, [unifiedTrades]);

  // Fetch current prices for tokens - only once per unique token set
  useEffect(() => {
    if (uniqueTokens.length === 0) return;
    
    // Create stable key to prevent re-fetching
    const tokenKey = uniqueTokens.map(t => `${t.chainIndex}-${t.address}`).sort().join(',');
    if (pricesFetchedRef.current) return;

    const fetchPrices = async () => {
      setIsLoading(true);
      const newPrices = new Map<string, number>();

      // Batch requests by chain to avoid rate limits
      const tokensByChain = new Map<string, typeof uniqueTokens>();
      uniqueTokens.forEach(token => {
        const existing = tokensByChain.get(token.chainIndex) || [];
        existing.push(token);
        tokensByChain.set(token.chainIndex, existing);
      });

      for (const [chainIndex, tokens] of tokensByChain) {
        // Limit to 5 tokens per chain to avoid rate limits
        const limitedTokens = tokens.slice(0, 5);
        
        for (const token of limitedTokens) {
          try {
            const priceInfo = await okxDexService.getTokenPriceInfo(chainIndex, token.address);
            if (priceInfo?.price) {
              const key = `${chainIndex}-${token.address.toLowerCase()}`;
              newPrices.set(key, parseFloat(priceInfo.price));
            }
          } catch (err) {
            console.error(`Failed to fetch price for ${token.symbol}:`, err);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      pricesFetchedRef.current = true;
      setPrices(newPrices);
      setIsLoading(false);
    };

    fetchPrices();
  }, [uniqueTokens]);

  const analytics = useMemo((): TokenPnLAnalytics => {
    // Track buys and sells per token
    const tokenData = new Map<string, {
      symbol: string;
      chainIndex: string;
      tokenAddress: string;
      buyVolume: number;
      buyValue: number;
      sellVolume: number;
      sellValue: number;
      trades: number;
    }>();

    unifiedTrades.forEach(trade => {
      // Track tokens received (buys)
      if (trade.toAddress || trade.type === 'instant') {
        // For instant trades, use symbol as key since we don't have addresses
        const key = trade.type === 'instant' 
          ? `instant-${trade.toSymbol.toLowerCase()}`
          : `${trade.chainIndex}-${trade.toAddress.toLowerCase()}`;
        
        const existing = tokenData.get(key) || {
          symbol: trade.toSymbol,
          chainIndex: trade.chainIndex,
          tokenAddress: trade.toAddress,
          buyVolume: 0,
          buyValue: 0,
          sellVolume: 0,
          sellValue: 0,
          trades: 0,
        };
        
        existing.buyVolume += trade.toAmount;
        existing.buyValue += trade.toAmountUsd;
        existing.trades += 1;
        tokenData.set(key, existing);
      }

      // Track tokens sent (sells)
      if (trade.fromAddress || trade.type === 'instant') {
        const key = trade.type === 'instant'
          ? `instant-${trade.fromSymbol.toLowerCase()}`
          : `${trade.chainIndex}-${trade.fromAddress.toLowerCase()}`;
        
        const existing = tokenData.get(key);
        if (existing) {
          existing.sellVolume += trade.fromAmount;
          existing.sellValue += trade.fromAmountUsd;
        }
      }
    });

    // Calculate P&L for each token
    const tokens: TokenPnLData[] = Array.from(tokenData.entries())
      .filter(([_, data]) => data.buyVolume > 0) // Only tokens we actually bought
      .map(([key, data]) => {
        const avgBuyPrice = data.buyVolume > 0 ? data.buyValue / data.buyVolume : 0;
        const avgSellPrice = data.sellVolume > 0 ? data.sellValue / data.sellVolume : 0;
        const currentPrice = prices.get(key) || avgBuyPrice; // Fallback to avg buy price
        
        // Realized P&L = (Sell Value) - (Cost of Sold Tokens)
        const costOfSold = data.sellVolume * avgBuyPrice;
        const realizedPnL = data.sellValue - costOfSold;
        
        // Unrealized P&L = (Remaining Holdings * Current Price) - (Remaining Holdings * Avg Buy Price)
        const remainingHoldings = Math.max(0, data.buyVolume - data.sellVolume);
        const unrealizedPnL = remainingHoldings * (currentPrice - avgBuyPrice);
        
        const totalPnL = realizedPnL + unrealizedPnL;
        const totalInvested = data.buyValue;
        const pnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

        return {
          symbol: data.symbol,
          chainIndex: data.chainIndex,
          tokenAddress: data.tokenAddress,
          totalBought: data.buyVolume,
          totalSold: data.sellVolume,
          avgBuyPrice,
          avgSellPrice,
          currentPrice,
          realizedPnL,
          unrealizedPnL,
          totalPnL,
          pnLPercentage,
          trades: data.trades,
        };
      })
      .sort((a, b) => b.totalPnL - a.totalPnL);

    const totalRealizedPnL = tokens.reduce((sum, t) => sum + t.realizedPnL, 0);
    const totalUnrealizedPnL = tokens.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const totalPnL = totalRealizedPnL + totalUnrealizedPnL;

    const bestPerformer = tokens.length > 0 ? tokens[0] : null;
    const worstPerformer = tokens.length > 0 ? tokens[tokens.length - 1] : null;

    return {
      tokens,
      totalRealizedPnL,
      totalUnrealizedPnL,
      totalPnL,
      bestPerformer,
      worstPerformer,
      isLoading,
    };
  }, [unifiedTrades, prices, isLoading]);

  return analytics;
}
