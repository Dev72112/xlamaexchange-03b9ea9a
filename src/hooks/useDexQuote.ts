import { useState, useEffect, useCallback, useRef } from 'react';
import { okxDexService, OkxQuote, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';

interface UseDexQuoteOptions {
  chain: Chain | null;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  amount: string;
  slippage: string;
  enabled?: boolean;
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

  const fetchQuote = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!chain || !fromToken || !toToken || !amount || parseFloat(amount) <= 0 || !enabled) {
      setQuote(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to smallest unit (wei, etc.)
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      const data = await okxDexService.getQuote(
        chain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage
      );

      setQuote(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch DEX quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [chain?.chainIndex, fromToken?.tokenContractAddress, toToken?.tokenContractAddress, amount, slippage, enabled]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Format output amount from wei to human readable
  const formattedOutputAmount = quote && toToken
    ? (parseFloat(quote.toTokenAmount) / Math.pow(10, parseInt(toToken.decimals))).toString()
    : '';

  // Calculate exchange rate
  const exchangeRate = quote && fromToken && toToken && amount && parseFloat(amount) > 0
    ? parseFloat(formattedOutputAmount) / parseFloat(amount)
    : null;

  return {
    quote,
    formattedOutputAmount,
    exchangeRate,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchQuote,
  };
}
