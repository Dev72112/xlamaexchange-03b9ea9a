/**
 * GasEstimate - Gas estimation display for DEX swaps
 */
import { Fuel } from 'lucide-react';

interface GasEstimateProps {
  gasDisplay: string;
  nativeSymbol: string;
}

export function GasEstimate({ gasDisplay, nativeSymbol }: GasEstimateProps) {
  return (
    <div className="px-4 sm:px-5 pb-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground p-2.5 bg-secondary/30 rounded-lg border border-border/50">
        <span className="flex items-center gap-1.5">
          <Fuel className="w-3.5 h-3.5" />
          Est. Gas
        </span>
        <span className="font-mono font-medium">
          ~{gasDisplay} {nativeSymbol}
        </span>
      </div>
    </div>
  );
}

/**
 * Calculate gas display from raw quote data
 */
export function formatGasDisplay(estimateGasFee: string | undefined): string | null {
  if (!estimateGasFee) return null;
  
  const fee = parseFloat(estimateGasFee);
  if (isNaN(fee) || fee <= 0) return null;

  // OKX returns gas in wei for EVM chains
  if (fee > 1e15) {
    // Value is in wei, convert to native token
    const inNative = fee / 1e18;
    if (inNative < 0.000001) return '< 0.000001';
    return inNative.toFixed(6);
  } else if (fee > 1e9) {
    // Might be gwei or partial wei
    const inNative = fee / 1e9;
    if (inNative < 0.000001) return '< 0.000001';
    return inNative.toFixed(6);
  } else if (fee < 1000) {
    // Already in native format or very small
    if (fee < 0.000001) return '< 0.000001';
    return fee.toFixed(6);
  }
  
  // Gas units (not a price), don't display
  return null;
}
