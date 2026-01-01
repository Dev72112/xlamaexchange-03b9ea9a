import { useState, useEffect, useCallback, useMemo } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';

interface UseBridgeQuoteOptions {
  fromChain: Chain | null;
  toChain: Chain | null;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  amount: string;
  slippage: string;
  userAddress?: string;
  enabled?: boolean;
}

interface BridgeQuoteResult {
  toTokenAmount: string;
  estimatedTime: string;
  bridgeFee: string;
  minAmount?: string;
  routes?: any[];
  routerResult?: any;
}

// Convert amount to smallest unit (integer string, no scientific notation)
function toSmallestUnit(amount: string, decimals: number): string {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return '0';
  
  const multiplier = Math.pow(10, decimals);
  const result = num * multiplier;
  
  // Convert to string without scientific notation
  if (result >= 1e21) {
    return BigInt(Math.floor(result)).toString();
  }
  return Math.floor(result).toString();
}

export function useBridgeQuote({
  fromChain,
  toChain,
  fromToken,
  toToken,
  amount,
  slippage,
  userAddress,
  enabled = true,
}: UseBridgeQuoteOptions) {
  const [quote, setQuote] = useState<BridgeQuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!fromChain || !toChain || !fromToken || !toToken) {
      setQuote(null);
      setError(null);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const decimals = parseInt(fromToken.decimals) || 18;
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      console.log('Fetching bridge quote:', {
        fromChain: fromChain.chainIndex,
        toChain: toChain.chainIndex,
        fromToken: fromToken.tokenSymbol,
        toToken: toToken.tokenSymbol,
        amount: amountInSmallestUnit,
      });

      const result = await okxDexService.getCrossChainQuote(
        fromChain.chainIndex,
        toChain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage,
        userAddress || '0x0000000000000000000000000000000000000000' // Dummy address for quotes without wallet
      );

      if (result && result.routerResult) {
        const routerResult = result.routerResult;
        
        // Parse output amount
        const toDecimals = parseInt(toToken.decimals) || 18;
        const outputAmount = routerResult.toTokenAmount || '0';
        const formattedOutput = (parseFloat(outputAmount) / Math.pow(10, toDecimals)).toString();

        setQuote({
          toTokenAmount: formattedOutput,
          estimatedTime: routerResult.estimatedTime || result.estimatedTime || '5-10 min',
          bridgeFee: routerResult.bridgeFee || '0',
          minAmount: result.minCrossChainAmount,
          routes: routerResult.routes || [],
          routerResult: routerResult,
        });
        setLastUpdated(new Date());
        setError(null);
      } else if (result) {
        // Fallback for different response formats
        const toDecimals = parseInt(toToken.decimals) || 18;
        const outputAmount = result.toTokenAmount || result.routerResult?.toTokenAmount || '0';
        const formattedOutput = parseFloat(outputAmount) > 1e10 
          ? (parseFloat(outputAmount) / Math.pow(10, toDecimals)).toString()
          : outputAmount;

        setQuote({
          toTokenAmount: formattedOutput,
          estimatedTime: result.estimatedTime || '5-10 min',
          bridgeFee: result.bridgeFee || '0',
          minAmount: result.minCrossChainAmount,
          routes: result.routes || [],
          routerResult: result,
        });
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError('No bridge route available');
        setQuote(null);
      }
    } catch (err: any) {
      console.error('Bridge quote error:', err);
      const errorMsg = err?.message || 'Failed to get bridge quote';
      
      // Parse specific errors
      if (errorMsg.includes('Insufficient liquidity')) {
        setError('Insufficient liquidity for this bridge route');
      } else if (errorMsg.includes('not supported')) {
        setError('This bridge route is not supported');
      } else if (errorMsg.includes('minimum')) {
        setError('Amount below minimum bridge requirement (~$15)');
      } else {
        setError(errorMsg.slice(0, 100));
      }
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [fromChain, toChain, fromToken, toToken, amount, slippage, userAddress]);

  // Debounced fetch
  useEffect(() => {
    if (!enabled) {
      setQuote(null);
      setError(null);
      return;
    }

    const timer = setTimeout(fetchQuote, 600);
    return () => clearTimeout(timer);
  }, [fetchQuote, enabled]);

  // Computed values
  const formattedOutputAmount = useMemo(() => {
    if (!quote?.toTokenAmount) return null;
    const num = parseFloat(quote.toTokenAmount);
    if (isNaN(num)) return null;
    return num.toFixed(6);
  }, [quote?.toTokenAmount]);

  const exchangeRate = useMemo(() => {
    if (!quote?.toTokenAmount || !amount) return null;
    const inputNum = parseFloat(amount);
    const outputNum = parseFloat(quote.toTokenAmount);
    if (isNaN(inputNum) || isNaN(outputNum) || inputNum === 0) return null;
    return outputNum / inputNum;
  }, [quote?.toTokenAmount, amount]);

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
