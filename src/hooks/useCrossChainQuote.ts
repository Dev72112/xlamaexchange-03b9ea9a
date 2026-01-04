import { useState, useEffect, useCallback, useRef } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';

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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async () => {
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

    setIsLoading(true);
    setError(null);

    try {
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      const data = await okxDexService.getCrossChainQuote(
        fromChain.chainIndex,
        toChain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage,
        userAddress || ''
      );

      if (data && !data.error) {
        setQuote(data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(data?.error || 'No route available for this cross-chain swap');
        setQuote(null);
      }
    } catch (err) {
      console.error('Failed to fetch cross-chain quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to get cross-chain quote');
      setQuote(null);
    } finally {
      setIsLoading(false);
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
    const timer = setTimeout(fetchQuote, 500);
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
    error,
    lastUpdated,
    refetch: fetchQuote,
  };
}
