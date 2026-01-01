import { useMemo } from 'react';
import { OkxQuote } from '@/services/okxdex';

interface UseAutoSlippageOptions {
  quote: OkxQuote | null;
  manualSlippage: string;
  isAutoEnabled: boolean;
  tradeSize?: number; // in USD
}

export type SlippageRecommendation = {
  recommended: string;
  reason: string;
  level: 'safe' | 'warning' | 'danger';
};

// Calculate optimal slippage based on price impact, liquidity, and trade size
export function useAutoSlippage({ quote, manualSlippage, isAutoEnabled, tradeSize = 0 }: UseAutoSlippageOptions) {
  const { suggestedSlippage, recommendation } = useMemo(() => {
    if (!quote) {
      return { 
        suggestedSlippage: manualSlippage,
        recommendation: null as SlippageRecommendation | null,
      };
    }

    const priceImpact = parseFloat(quote.priceImpactPercentage || '0');
    
    // Calculate liquidity score from available DEX comparison
    const dexCount = quote.quoteCompareList?.length || 0;
    const hasGoodLiquidity = dexCount >= 3;
    const hasLowLiquidity = dexCount <= 1;
    
    // Trade size considerations
    const isLargeTrade = tradeSize > 10000; // Over $10k
    const isVeryLargeTrade = tradeSize > 50000; // Over $50k
    
    let autoSlippage: number;
    let reason: string;
    let level: 'safe' | 'warning' | 'danger';
    
    // Base slippage on price impact
    if (priceImpact <= 0.1) {
      autoSlippage = 0.3;
      reason = 'Low price impact trade';
      level = 'safe';
    } else if (priceImpact <= 0.5) {
      autoSlippage = 0.5;
      reason = 'Normal market conditions';
      level = 'safe';
    } else if (priceImpact <= 1) {
      autoSlippage = 1;
      reason = 'Moderate price impact';
      level = 'safe';
    } else if (priceImpact <= 3) {
      autoSlippage = Math.min(priceImpact + 0.5, 3);
      reason = 'Higher price impact detected';
      level = 'warning';
    } else if (priceImpact <= 5) {
      autoSlippage = Math.min(priceImpact + 1, 5);
      reason = 'Significant price impact';
      level = 'warning';
    } else {
      autoSlippage = Math.min(priceImpact + 2, 15);
      reason = 'Very high price impact - reduce trade size';
      level = 'danger';
    }
    
    // Adjust for liquidity
    if (hasLowLiquidity) {
      autoSlippage = Math.min(autoSlippage * 1.5, 15);
      reason = 'Low liquidity - higher slippage recommended';
      level = priceImpact > 2 ? 'danger' : 'warning';
    } else if (!hasGoodLiquidity && priceImpact > 1) {
      autoSlippage = Math.min(autoSlippage * 1.2, 10);
    }
    
    // Adjust for trade size
    if (isVeryLargeTrade && priceImpact > 0.5) {
      autoSlippage = Math.min(autoSlippage + 1, 15);
      reason = 'Large trade size may require higher slippage';
      level = 'warning';
    } else if (isLargeTrade && priceImpact > 1) {
      autoSlippage = Math.min(autoSlippage + 0.5, 10);
    }

    const recommendation: SlippageRecommendation = {
      recommended: autoSlippage.toFixed(1),
      reason,
      level,
    };

    return { 
      suggestedSlippage: autoSlippage.toFixed(1),
      recommendation,
    };
  }, [quote, manualSlippage, tradeSize]);

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
    recommendation,
    priceImpactLevel,
    isAutoEnabled,
  };
}
