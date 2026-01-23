import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { okxDexService, OkxQuote, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { apiCoordinator, CACHE_TTL } from '@/lib/apiCoordinator';
import { tradeDebugger } from '@/lib/tradeDebug';

interface UseDexQuoteOptions {
  chain: Chain | null;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  amount: string;
  slippage: string;
  enabled?: boolean;
}

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  // Remove leading zeros but keep at least "0"
  return combined.replace(/^0+/, '') || '0';
}

// Generate cache key for quote requests
function getQuoteCacheKey(
  chainIndex: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  slippage: string
): string {
  return `quote:${chainIndex}:${fromAddress}:${toAddress}:${amount}:${slippage}`;
}

// Debounce delay based on input characteristics
function getDebounceDelay(amount: string): number {
  // Shorter debounce for empty/zero amounts (clear quickly)
  if (!amount || parseFloat(amount) <= 0) return 100;
  // Longer debounce while user is typing
  return 600;
}

export function useDexQuote({
  chain,
  fromToken,
  toToken,
  amount,
  slippage,
  enabled = true,
}: UseDexQuoteOptions) {
  const [quote, setQuote] = useState<OkxQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestKeyRef = useRef<string>('');
  const retryCountRef = useRef(0);

  // Memoize request parameters to detect actual changes
  const requestParams = useMemo(() => ({
    chainIndex: chain?.chainIndex || '',
    fromAddress: fromToken?.tokenContractAddress || '',
    toAddress: toToken?.tokenContractAddress || '',
    fromDecimals: fromToken?.decimals || '18',
    amount,
    slippage,
  }), [chain?.chainIndex, fromToken?.tokenContractAddress, toToken?.tokenContractAddress, fromToken?.decimals, amount, slippage]);

  const fetchQuote = useCallback(async (forceRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const { chainIndex, fromAddress, toAddress, fromDecimals, amount: amt, slippage: slip } = requestParams;

    // Validate inputs - detailed logging for debugging
    const validationChecks = {
      hasChainIndex: !!chainIndex,
      hasFromAddress: !!fromAddress,
      hasToAddress: !!toAddress,
      hasAmount: !!amt,
      amountValue: parseFloat(amt),
      amountIsPositive: parseFloat(amt) > 0,
      isEnabled: enabled,
    };
    
    const isValid = chainIndex && fromAddress && toAddress && amt && parseFloat(amt) > 0 && enabled;
    
    if (!isValid) {
      console.log('[DexQuote] Quote validation failed:', validationChecks);
      setQuote(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    
    console.log('[DexQuote] Validation passed, fetching quote for:', {
      chain: chainIndex,
      from: fromAddress.slice(0, 10) + '...',
      to: toAddress.slice(0, 10) + '...',
      amount: amt,
    });

    // Convert amount to smallest unit
    const decimals = parseInt(fromDecimals);
    const amountInSmallestUnit = toSmallestUnit(amt, decimals);
    
    // Generate cache key
    const cacheKey = getQuoteCacheKey(chainIndex, fromAddress, toAddress, amountInSmallestUnit, slip);
    
    // Skip if same request is already in progress (deduplication)
    if (cacheKey === lastRequestKeyRef.current && isLoading && !forceRefresh) {
      return;
    }
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = apiCoordinator.getFromCache<OkxQuote>(cacheKey);
      if (cached) {
        setQuote(cached);
        setError(null);
        setIsLoading(false);
        return;
      }
    }

    // Check rate limit before making request
    if (apiCoordinator.isNearRateLimit()) {
      // Use cached data if available, even if stale
      const staleCache = apiCoordinator.getFromCache<OkxQuote>(cacheKey);
      if (staleCache) {
        setQuote(staleCache);
        return;
      }
      // Otherwise wait for rate limit to reset
      await apiCoordinator.waitForSlot();
    }

    lastRequestKeyRef.current = cacheKey;
    setIsLoading(true);
    setError(null);
    
    // Determine chain type for logging
    const chainType = chainIndex === '501' ? 'solana' : 
                      chainIndex === '195' ? 'tron' : 
                      chainIndex === '784' ? 'sui' : 
                      chainIndex === '607' ? 'ton' : 'evm';
    
    tradeDebugger.logQuote(chainType as any, {
      from: fromAddress.slice(0, 8) + '...',
      to: toAddress.slice(0, 8) + '...',
      amount: amt,
      chainIndex,
    });

    try {
      // Use apiCoordinator for request deduplication
      const data = await apiCoordinator.dedupe(
        cacheKey,
        () => okxDexService.getQuote(
          chainIndex,
          fromAddress,
          toAddress,
          amountInSmallestUnit,
          slip
        ),
        CACHE_TTL.quote
      );

      // Only update if this is still the current request
      if (cacheKey === lastRequestKeyRef.current) {
        setQuote(data);
        setLastUpdated(new Date());
        setError(null);
        retryCountRef.current = 0;
        
        tradeDebugger.logQuoteResult(chainType as any, {
          inAmount: amt,
          outAmount: data.toTokenAmount || '',
          provider: 'OKX',
        }, chainIndex);
      }
    } catch (err) {
      // Only update error if this is still the current request
      if (cacheKey === lastRequestKeyRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
        
        tradeDebugger.logQuoteResult(chainType as any, {
          inAmount: amt,
          outAmount: '',
          error: errorMessage,
        }, chainIndex);
        
        // Handle rate limit errors gracefully
        if (errorMessage.includes('rate') || errorMessage.includes('50011')) {
          // Retry with exponential backoff (max 3 retries)
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            const delay = Math.pow(2, retryCountRef.current) * 1000;
            setTimeout(() => fetchQuote(true), delay);
            return;
          }
        }
        
        setError(errorMessage);
        setQuote(null);
      }
    } finally {
      if (cacheKey === lastRequestKeyRef.current) {
        setIsLoading(false);
      }
    }
  }, [requestParams, enabled, isLoading]);

  // Debounced fetch with dynamic delay
  useEffect(() => {
    const delay = getDebounceDelay(amount);
    const timer = setTimeout(() => fetchQuote(false), delay);
    return () => clearTimeout(timer);
  }, [fetchQuote, amount]);

  // Format output amount from wei to human readable using safe BigInt arithmetic
  const formattedOutputAmount = useMemo(() => {
    if (!quote || !toToken || !quote.toTokenAmount) return '';
    try {
      const decimals = parseInt(toToken.decimals) || 18;
      const amountBig = BigInt(quote.toTokenAmount);
      const divisor = BigInt(10 ** decimals);
      const whole = amountBig / divisor;
      const remainder = amountBig % divisor;
      
      if (remainder === 0n) {
        return whole.toString();
      }
      
      // Format with proper decimal places
      const remainderStr = remainder.toString().padStart(decimals, '0');
      // Trim trailing zeros but keep reasonable precision
      const trimmed = remainderStr.replace(/0+$/, '') || '0';
      const result = `${whole}.${trimmed}`;
      
      // Avoid floating point display issues by limiting to 12 significant decimals
      return result.length > 15 ? result.slice(0, 15) : result;
    } catch {
      // Fallback for invalid amounts
      return '';
    }
  }, [quote, toToken]);

  // Calculate exchange rate using string-safe arithmetic
  const exchangeRate = useMemo(() => {
    if (!quote || !fromToken || !toToken || !amount || !formattedOutputAmount) return null;
    const inputAmount = parseFloat(amount);
    const outputAmount = parseFloat(formattedOutputAmount);
    if (isNaN(inputAmount) || isNaN(outputAmount) || inputAmount <= 0) return null;
    return outputAmount / inputAmount;
  }, [quote, fromToken, toToken, amount, formattedOutputAmount]);

  // Force refresh function that bypasses cache
  const refetch = useCallback(() => {
    // Invalidate cache for this quote
    const { chainIndex, fromAddress, toAddress, fromDecimals } = requestParams;
    if (chainIndex && fromAddress && toAddress && amount) {
      const amountInSmallestUnit = toSmallestUnit(amount, parseInt(fromDecimals));
      const cacheKey = getQuoteCacheKey(chainIndex, fromAddress, toAddress, amountInSmallestUnit, slippage);
      apiCoordinator.invalidatePrefix(cacheKey);
    }
    fetchQuote(true);
  }, [fetchQuote, requestParams, amount, slippage]);

  return {
    quote,
    formattedOutputAmount,
    exchangeRate,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}
