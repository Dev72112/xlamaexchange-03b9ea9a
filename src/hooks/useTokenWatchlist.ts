import { useState, useEffect, useCallback } from 'react';
import { okxDexService, TokenPriceInfo } from '@/services/okxdex';

const WATCHLIST_KEY = 'xlama_token_watchlist';

export interface WatchlistToken {
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUrl: string;
  decimals: string;
}

export interface WatchlistTokenWithPrice extends WatchlistToken {
  price?: string;
  change24H?: string;
  marketCap?: string;
  volume24H?: string;
  isLoading?: boolean;
}

export function useTokenWatchlist() {
  const [tokens, setTokens] = useState<WatchlistToken[]>(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [tokensWithPrices, setTokensWithPrices] = useState<WatchlistTokenWithPrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tokens));
  }, [tokens]);

  // Fetch prices for all tokens
  const fetchPrices = useCallback(async () => {
    if (tokens.length === 0) {
      setTokensWithPrices([]);
      return;
    }

    setIsLoadingPrices(true);
    
    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        try {
          const priceInfo = await okxDexService.getTokenPriceInfo(
            token.chainIndex,
            token.tokenContractAddress
          );
          
          return {
            ...token,
            price: priceInfo?.price,
            change24H: priceInfo?.priceChange24H,
            marketCap: priceInfo?.marketCap,
            volume24H: priceInfo?.volume24H,
            isLoading: false,
          };
        } catch {
          return { ...token, isLoading: false };
        }
      })
    );

    setTokensWithPrices(updatedTokens);
    setIsLoadingPrices(false);
  }, [tokens]);

  // Fetch prices on mount and when tokens change
  useEffect(() => {
    fetchPrices();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const addToken = useCallback((token: WatchlistToken) => {
    setTokens(prev => {
      const exists = prev.some(
        t => t.chainIndex === token.chainIndex && 
             t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
      );
      if (exists) return prev;
      return [...prev, token];
    });
  }, []);

  const removeToken = useCallback((chainIndex: string, tokenContractAddress: string) => {
    setTokens(prev => 
      prev.filter(
        t => !(t.chainIndex === chainIndex && 
               t.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase())
      )
    );
  }, []);

  const isInWatchlist = useCallback((chainIndex: string, tokenContractAddress: string) => {
    return tokens.some(
      t => t.chainIndex === chainIndex && 
           t.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase()
    );
  }, [tokens]);

  const toggleToken = useCallback((token: WatchlistToken) => {
    if (isInWatchlist(token.chainIndex, token.tokenContractAddress)) {
      removeToken(token.chainIndex, token.tokenContractAddress);
    } else {
      addToken(token);
    }
  }, [isInWatchlist, addToken, removeToken]);

  return {
    tokens: tokensWithPrices,
    rawTokens: tokens,
    isLoadingPrices,
    addToken,
    removeToken,
    toggleToken,
    isInWatchlist,
    refreshPrices: fetchPrices,
  };
}
