/**
 * Hyperliquid Orderbook Component
 * 
 * Real-time orderbook display with bids and asks.
 */

import { memo, useMemo } from 'react';
import { HyperliquidOrderbook as OrderbookData } from '@/services/hyperliquid';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface HyperliquidOrderbookProps {
  orderbook: OrderbookData | null;
  isLoading?: boolean;
  currentPrice?: number;
}

export const HyperliquidOrderbook = memo(function HyperliquidOrderbook({
  orderbook,
  isLoading,
  currentPrice,
}: HyperliquidOrderbookProps) {
  // Calculate max size for width scaling
  const maxSize = useMemo(() => {
    if (!orderbook) return 1;
    const allSizes = [
      ...orderbook.bids.map(l => parseFloat(l.size)),
      ...orderbook.asks.map(l => parseFloat(l.size)),
    ];
    return Math.max(...allSizes, 1);
  }, [orderbook]);

  if (isLoading || !orderbook) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs font-mono">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 text-muted-foreground pb-1 border-b border-border/50">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="space-y-0.5">
        {orderbook.asks.slice().reverse().map((level, i) => {
          const price = parseFloat(level.price);
          const size = parseFloat(level.size);
          const widthPercent = (size / maxSize) * 100;
          
          return (
            <div 
              key={`ask-${i}`}
              className="grid grid-cols-3 gap-2 py-0.5 relative"
            >
              {/* Background bar */}
              <div 
                className="absolute inset-y-0 right-0 bg-destructive/10"
                style={{ width: `${widthPercent}%` }}
              />
              <span className="text-destructive relative z-10">
                {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-right relative z-10">
                {size.toFixed(4)}
              </span>
              <span className="text-right text-muted-foreground relative z-10">
                {(price * size).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread / Current Price */}
      <div className="py-2 text-center border-y border-border/50 bg-secondary/30">
        <span className="text-sm font-medium">
          ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—'}
        </span>
        {orderbook.asks[0] && orderbook.bids[0] && (
          <span className="text-muted-foreground ml-2">
            Spread: {(
              ((parseFloat(orderbook.asks[0].price) - parseFloat(orderbook.bids[0].price)) / parseFloat(orderbook.bids[0].price)) * 100
            ).toFixed(4)}%
          </span>
        )}
      </div>

      {/* Bids */}
      <div className="space-y-0.5">
        {orderbook.bids.map((level, i) => {
          const price = parseFloat(level.price);
          const size = parseFloat(level.size);
          const widthPercent = (size / maxSize) * 100;
          
          return (
            <div 
              key={`bid-${i}`}
              className="grid grid-cols-3 gap-2 py-0.5 relative"
            >
              {/* Background bar */}
              <div 
                className="absolute inset-y-0 right-0 bg-success/10"
                style={{ width: `${widthPercent}%` }}
              />
              <span className="text-success relative z-10">
                {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-right relative z-10">
                {size.toFixed(4)}
              </span>
              <span className="text-right text-muted-foreground relative z-10">
                {(price * size).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
