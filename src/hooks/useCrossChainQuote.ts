import { useState, useEffect, useCallback, useRef } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { apiCoordinator, CACHE_TTL } from '@/lib/apiCoordinator';

interface CrossChainQuote {
  fromChainIndex: string;
  toChainIndex: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGasFee: string;
  bridgeFee: string;
  estimatedTime: string; // in seconds
  bridgeName: string;
  routerList: Array<{
    router: string;
    routerPercent: string;
    fromDexRouterList?: Array<{
      dexName: string;
      fromToken: OkxToken;
      toToken: OkxToken;
    }>;
    toDexRouterList?: Array<{
      dexName: string;
      fromToken: OkxToken;
      toToken: OkxToken;
    }>;
  }>;
}

interface UseCrossChainQuoteOptions {
  fromChain: Chain | null;
  toChain: Chain | null;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  amount: string;
  slippage: string;
  userAddress?: string;
  enabled?: boolean;
}

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  return combined.replace(/^0+/, '') || '0';
}

// User-friendly error messages
function getQuoteErrorMessage(error: any): string {
  const msg = String(error?.message || error || '');
  
  if (msg.includes('50011') || msg.includes('Too Many')) {
    return 'Service is busy. Retrying...';
  }
  if (msg.includes('No route') || msg.includes('route')) {
    return 'No route available for this swap';
  }
  if (msg.includes('amount') || msg.includes('Amount')) {
    return 'Amount is too small for this bridge';
  }
  if (msg.includes('non-2xx') || msg.includes('fetch')) {
    return 'Network error. Retrying...';
  }
  
  return 'Unable to get quote. Please try again.';
}

export function useCrossChainQuote({
  fromChain,
  toChain,
  fromToken,
  toToken,
  amount,
  slippage,
  userAddress,
  enabled = true,
}: UseCrossChainQuoteOptions) {
  const [quote, setQuote] = useState<CrossChainQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchQuote = useCallback(async (isRetry = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!fromChain || !toChain || !fromToken || !toToken || !amount || parseFloat(amount) <= 0 || !enabled) {
      setQuote(null);
      setError(null);
      return;
    }

    // Cross-chain requires different chains
    if (fromChain.chainIndex === toChain.chainIndex) {
      setQuote(null);
      setError(null);
      return;
    }

    if (!isRetry) {
      setIsLoading(true);
      retryCountRef.current = 0;
    } else {
      setIsRetrying(true);
    }
    setError(null);

    const cacheKey = `cross-chain-quote:${fromChain.chainIndex}:${toChain.chainIndex}:${fromToken.tokenContractAddress}:${toToken.tokenContractAddress}:${amount}`;

    try {
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      // Use coordinator for deduplication
      const data = await apiCoordinator.dedupe(
        cacheKey,
        async () => {
          apiCoordinator.recordRequest('cross-chain-quote');
          return okxDexService.getCrossChainQuote(
            fromChain.chainIndex,
            toChain.chainIndex,
            fromToken.tokenContractAddress,
            toToken.tokenContractAddress,
            amountInSmallestUnit,
            slippage,
            userAddress || undefined
          );
        },
        CACHE_TTL.quote
      );

      if (data && !data.error) {
        setQuote(data);
        setLastUpdated(new Date());
        setError(null);
        retryCountRef.current = 0;
      } else {
        const errorMsg = data?.error || data?.msg || 'No route available';
        
        // Auto-retry on rate limit
        if ((errorMsg.includes('50011') || errorMsg.includes('Too Many')) && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000);
          setTimeout(() => fetchQuote(true), delay);
          setError(`Service busy. Retry ${retryCountRef.current}/${maxRetries}...`);
          return;
        }
        
        setError(getQuoteErrorMessage(errorMsg));
        setQuote(null);
      }
    } catch (err) {
      console.error('Failed to fetch cross-chain quote:', err);
      
      // Auto-retry on network errors
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000);
        setTimeout(() => fetchQuote(true), delay);
        setError(`Network error. Retry ${retryCountRef.current}/${maxRetries}...`);
        return;
      }
      
      setError(getQuoteErrorMessage(err));
      setQuote(null);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [
    fromChain?.chainIndex, 
    toChain?.chainIndex, 
    fromToken?.tokenContractAddress, 
    toToken?.tokenContractAddress, 
    amount, 
    slippage, 
    userAddress,
    enabled
  ]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 600); // Slightly longer debounce
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const formattedOutputAmount = quote && toToken
    ? (parseFloat(quote.toTokenAmount) / Math.pow(10, parseInt(toToken.decimals))).toString()
    : '';

  const exchangeRate = quote && fromToken && toToken && amount && parseFloat(amount) > 0
    ? parseFloat(formattedOutputAmount) / parseFloat(amount)
    : null;

  const estimatedTimeMinutes = quote?.estimatedTime
    ? Math.ceil(parseInt(quote.estimatedTime) / 60)
    : null;

  return {
    quote,
    formattedOutputAmount,
    exchangeRate,
    estimatedTimeMinutes,
    isLoading,
    isRetrying,
    error,
    lastUpdated,
    refetch: () => fetchQuote(false),
  };
}
