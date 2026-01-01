import { useMemo } from 'react';
import { OkxQuote } from '@/services/okxdex';

interface UseAutoSlippageOptions {
  quote: OkxQuote | null;
  manualSlippage: string;
  isAutoEnabled: boolean;
}

// Calculate optimal slippage based on price impact and market conditions
export function useAutoSlippage({ quote, manualSlippage, isAutoEnabled }: UseAutoSlippageOptions) {
  const suggestedSlippage = useMemo(() => {
    if (!quote || !isAutoEnabled) {
      return manualSlippage;
    }

    const priceImpact = parseFloat(quote.priceImpactPercentage || '0');
    
    // Auto slippage calculation based on price impact
    // Higher price impact = higher slippage tolerance needed
    let autoSlippage: number;
    
    if (priceImpact <= 0.1) {
      // Very low impact - minimal slippage
      autoSlippage = 0.3;
    } else if (priceImpact <= 0.5) {
      // Low impact - standard slippage
      autoSlippage = 0.5;
    } else if (priceImpact <= 1) {
      // Moderate impact - slightly higher
      autoSlippage = 1;
    } else if (priceImpact <= 3) {
      // Higher impact - increase tolerance
      autoSlippage = Math.min(priceImpact + 0.5, 3);
    } else if (priceImpact <= 5) {
      // Significant impact
      autoSlippage = Math.min(priceImpact + 1, 5);
    } else {
      // Very high impact - cap at reasonable max
      autoSlippage = Math.min(priceImpact + 2, 10);
    }

    return autoSlippage.toFixed(1);
  }, [quote, manualSlippage, isAutoEnabled]);

  const priceImpactLevel = useMemo(() => {
    if (!quote) return 'unknown';
    const impact = parseFloat(quote.priceImpactPercentage || '0');
    
    if (impact <= 0.5) return 'low';
    if (impact <= 2) return 'medium';
    if (impact <= 5) return 'high';
    return 'extreme';
  }, [quote]);

  return {
    slippage: isAutoEnabled ? suggestedSlippage : manualSlippage,
    suggestedSlippage,
    priceImpactLevel,
    isAutoEnabled,
  };
}
