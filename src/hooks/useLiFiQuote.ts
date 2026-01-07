import { useState, useEffect, useCallback, useRef } from 'react';
import { lifiService, LiFiQuoteResult } from '@/services/lifi';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { apiCoordinator, CACHE_TTL } from '@/lib/apiCoordinator';

interface LiFiToken {
  tokenContractAddress: string;
  tokenSymbol: string;
  decimals: string;
  tokenLogoUrl?: string;
}

interface UseLiFiQuoteOptions {
  fromChain: Chain | null;
  toChain: Chain | null;
  fromToken: LiFiToken | null;
  toToken: LiFiToken | null;
  amount: string;
  slippage: string;
  userAddress?: string;
  enabled?: boolean;
}

// Convert amount to smallest unit
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  return combined.replace(/^0+/, '') || '0';
}

// User-friendly error messages with minimum amount extraction
function getQuoteErrorMessage(error: any): { message: string; minimumAmount?: string } {
  const msg = String(error?.message || error || '');
  
  if (msg.includes('No available quotes') || msg.includes('NO_POSSIBLE_ROUTE')) {
    return { message: 'No route available for this swap' };
  }
  if (msg.includes('AMOUNT_TOO_LOW') || msg.includes('amount too low') || msg.includes('minimum')) {
    // Try to extract minimum amount from error message
    const minMatch = msg.match(/minimum[:\s]+([0-9.]+)/i) || 
                     msg.match(/at least[:\s]+([0-9.]+)/i) ||
                     msg.match(/min[:\s]+([0-9.]+)/i);
    return { 
      message: 'Amount is below the minimum for this bridge',
      minimumAmount: minMatch?.[1] || undefined
    };
  }
  if (msg.includes('INSUFFICIENT_LIQUIDITY')) {
    return { message: 'Insufficient liquidity for this route' };
  }
  if (msg.includes('rate limit') || msg.includes('429')) {
    return { message: 'Service is busy. Retrying...' };
  }
  if (msg.includes('No available quotes') || msg.includes('NO_POSSIBLE_ROUTE')) {
    return { message: 'No route available for this swap. Try different tokens or chains.' };
  }
  if (msg.includes('not supported') || msg.includes('Unsupported chain')) {
    return { message: 'This chain is not yet supported for bridging.' };
  }
  
  return { message: 'Unable to get quote. Please try again.' };
}

export function useLiFiQuote({
  fromChain,
  toChain,
  fromToken,
  toToken,
  amount,
  slippage,
  userAddress,
  enabled = true,
}: UseLiFiQuoteOptions) {
  const [quote, setQuote] = useState<LiFiQuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimumAmount, setMinimumAmount] = useState<string | null>(null);
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
      setMinimumAmount(null);
      return;
    }

    // Cross-chain requires different chains
    if (fromChain.chainIndex === toChain.chainIndex) {
      setQuote(null);
      setError(null);
      setMinimumAmount(null);
      return;
    }

    // Check if chains are supported by Li.Fi
    if (!lifiService.isChainSupported(fromChain.chainIndex) || !lifiService.isChainSupported(toChain.chainIndex)) {
      setQuote(null);
      setError('Chain not supported for cross-chain swap');
      setMinimumAmount(null);
      return;
    }

    // Use placeholder address for quote preview when wallet not connected
    const quoteAddress = userAddress || '0x0000000000000000000000000000000000000001';

    if (!isRetry) {
      setIsLoading(true);
      retryCountRef.current = 0;
    } else {
      setIsRetrying(true);
    }
    setError(null);
    setMinimumAmount(null);

    const cacheKey = `lifi-quote:${fromChain.chainIndex}:${toChain.chainIndex}:${fromToken.tokenContractAddress}:${toToken.tokenContractAddress}:${amount}`;

    try {
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      // Normalize token addresses for Li.Fi (uses 0x0... for native)
      const normalizeAddress = (addr: string) => {
        const lower = addr.toLowerCase();
        if (lower === NATIVE_TOKEN_ADDRESS.toLowerCase() || lower === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          return '0x0000000000000000000000000000000000000000';
        }
        return addr;
      };

      // Use coordinator for deduplication
      const data = await apiCoordinator.dedupe(
        cacheKey,
        async () => {
          apiCoordinator.recordRequest('lifi-quote');
          return lifiService.getQuote({
            fromChainIndex: fromChain.chainIndex,
            toChainIndex: toChain.chainIndex,
            fromToken: normalizeAddress(fromToken.tokenContractAddress),
            toToken: normalizeAddress(toToken.tokenContractAddress),
            fromAmount: amountInSmallestUnit,
            fromAddress: quoteAddress,
            slippage: parseFloat(slippage) / 100,
          });
        },
        CACHE_TTL.quote
      );

      if (data) {
        setQuote(data);
        setLastUpdated(new Date());
        setError(null);
        setMinimumAmount(null);
        retryCountRef.current = 0;
      } else {
        setError('No route available');
        setQuote(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch Li.Fi quote:', err);
      
      // Auto-retry on rate limit
      if ((err?.message?.includes('429') || err?.message?.includes('rate limit')) && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000);
        setTimeout(() => fetchQuote(true), delay);
        setError(`Service busy. Retry ${retryCountRef.current}/${maxRetries}...`);
        return;
      }
      
      const errorInfo = getQuoteErrorMessage(err);
      setError(errorInfo.message);
      setMinimumAmount(errorInfo.minimumAmount || null);
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
    const timer = setTimeout(async () => {
      await apiCoordinator.waitForSlot();
      fetchQuote();
    }, 800);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const formattedOutputAmount = quote && toToken
    ? (parseFloat(quote.toAmount) / Math.pow(10, parseInt(toToken.decimals))).toString()
    : '';

  const exchangeRate = quote && fromToken && toToken && amount && parseFloat(amount) > 0
    ? parseFloat(formattedOutputAmount) / parseFloat(amount)
    : null;

  const estimatedTimeMinutes = quote?.estimatedDurationSeconds
    ? Math.ceil(quote.estimatedDurationSeconds / 60)
    : null;

  return {
    quote,
    formattedOutputAmount,
    exchangeRate,
    estimatedTimeMinutes,
    isLoading,
    isRetrying,
    error,
    minimumAmount,
    lastUpdated,
    refetch: () => fetchQuote(false),
  };
}
