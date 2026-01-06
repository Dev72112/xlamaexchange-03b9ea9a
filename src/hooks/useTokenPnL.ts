import { useMemo, useState, useEffect } from 'react';
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

export function useTokenPnL(chainFilter?: string): TokenPnLAnalytics {
  const { transactions } = useDexTransactions();
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Extract unique tokens that need price updates
  const uniqueTokens = useMemo(() => {
    let swaps = transactions.filter(tx => tx.type === 'swap' && tx.status === 'confirmed');
    
    if (chainFilter && chainFilter !== 'all') {
      swaps = swaps.filter(tx => tx.chainId === chainFilter);
    }

    const tokens = new Map<string, { chainIndex: string; address: string; symbol: string }>();
    
    swaps.forEach(tx => {
      // Track "to" tokens (tokens bought)
      if (tx.toTokenAddress) {
        const key = `${tx.chainId}-${tx.toTokenAddress.toLowerCase()}`;
        if (!tokens.has(key)) {
          tokens.set(key, {
            chainIndex: tx.chainId,
            address: tx.toTokenAddress,
            symbol: tx.toTokenSymbol,
          });
        }
      }
    });

    return Array.from(tokens.values());
  }, [transactions, chainFilter]);

  // Fetch current prices for tokens
  useEffect(() => {
    if (uniqueTokens.length === 0) return;

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
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setPrices(newPrices);
      setIsLoading(false);
    };

    fetchPrices();
  }, [uniqueTokens]);

  const analytics = useMemo((): TokenPnLAnalytics => {
    let swaps = transactions.filter(tx => tx.type === 'swap' && tx.status === 'confirmed');
    
    if (chainFilter && chainFilter !== 'all') {
      swaps = swaps.filter(tx => tx.chainId === chainFilter);
    }

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

    swaps.forEach(tx => {
      // Track tokens received (buys)
      if (tx.toTokenAddress) {
        const key = `${tx.chainId}-${tx.toTokenAddress.toLowerCase()}`;
        const amount = parseFloat(tx.toTokenAmount) || 0;
        const valueUsd = tx.toAmountUsd || 0;
        
        const existing = tokenData.get(key) || {
          symbol: tx.toTokenSymbol,
          chainIndex: tx.chainId,
          tokenAddress: tx.toTokenAddress,
          buyVolume: 0,
          buyValue: 0,
          sellVolume: 0,
          sellValue: 0,
          trades: 0,
        };
        
        existing.buyVolume += amount;
        existing.buyValue += valueUsd;
        existing.trades += 1;
        tokenData.set(key, existing);
      }

      // Track tokens sent (sells)
      if (tx.fromTokenAddress) {
        const key = `${tx.chainId}-${tx.fromTokenAddress.toLowerCase()}`;
        const amount = parseFloat(tx.fromTokenAmount) || 0;
        const valueUsd = tx.fromAmountUsd || 0;
        
        const existing = tokenData.get(key);
        if (existing) {
          existing.sellVolume += amount;
          existing.sellValue += valueUsd;
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
  }, [transactions, chainFilter, prices, isLoading]);

  return analytics;
}
