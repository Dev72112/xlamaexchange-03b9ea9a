import { AlertTriangle, ArrowDown, CheckCircle2, Info, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OkxToken, OkxQuote } from "@/services/okxdex";
import { Chain } from "@/data/chains";
import { cn } from "@/lib/utils";

interface SwapReviewModalProps {
  fromToken: OkxToken;
  toToken: OkxToken;
  fromAmount: string;
  toAmount: string;
  quote: OkxQuote;
  chain: Chain;
  slippage: string;
  gasEstimateNative?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SwapReviewModal({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  quote,
  chain,
  slippage,
  gasEstimateNative,
  onConfirm,
  onCancel,
  isLoading,
}: SwapReviewModalProps) {
  const priceImpact = parseFloat(quote.priceImpactPercentage || '0');
  const hasPriceImpactWarning = priceImpact > 1;
  const hasHighPriceImpact = priceImpact > 5;

  // Calculate minimum received after slippage
  const slippagePercent = parseFloat(slippage) / 100;
  const minReceived = parseFloat(toAmount) * (1 - slippagePercent);

  // Calculate exchange rate
  const rate = parseFloat(toAmount) / parseFloat(fromAmount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review Swap</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm the details below before swapping
        </p>
      </div>

      {/* Token swap visual */}
      <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
        {/* From */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={fromToken.tokenLogoUrl || `https://ui-avatars.com/api/?name=${fromToken.tokenSymbol}&background=random`}
              alt={fromToken.tokenSymbol}
              className="w-10 h-10 rounded-full shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${fromToken.tokenSymbol}&background=random`;
              }}
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">{fromToken.tokenSymbol}</div>
              <div className="text-xs text-muted-foreground truncate">{fromToken.tokenName}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-mono">-{parseFloat(fromAmount).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="bg-background rounded-full p-2">
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* To */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={toToken.tokenLogoUrl || `https://ui-avatars.com/api/?name=${toToken.tokenSymbol}&background=random`}
              alt={toToken.tokenSymbol}
              className="w-10 h-10 rounded-full shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${toToken.tokenSymbol}&background=random`;
              }}
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">{toToken.tokenSymbol}</div>
              <div className="text-xs text-muted-foreground truncate">{toToken.tokenName}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-mono text-primary">+{parseFloat(toAmount).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
          </div>
        </div>
      </div>

      {/* Price Impact Warning */}
      {hasPriceImpactWarning && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          hasHighPriceImpact 
            ? "bg-destructive/10 border border-destructive/20 text-destructive"
            : "bg-warning/10 border border-warning/20 text-warning"
        )}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Price impact is {hasHighPriceImpact ? 'very high' : 'high'} ({priceImpact.toFixed(2)}%). 
            You may receive significantly less than expected.
          </span>
        </div>
      )}

      <Separator />

      {/* Swap details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rate</span>
          <span className="font-mono text-xs">1 {fromToken.tokenSymbol} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.tokenSymbol}</span>
        </div>

        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>Price Impact</span>
            <Info className="w-3 h-3" />
          </div>
          <span className={cn(
            "font-mono text-xs",
            hasHighPriceImpact && "text-destructive",
            hasPriceImpactWarning && !hasHighPriceImpact && "text-warning"
          )}>
            {priceImpact.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Minimum Received</span>
          <span className="font-mono text-xs">{minReceived.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.tokenSymbol}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Slippage</span>
          <span className="font-mono text-xs">{slippage}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Network</span>
          <div className="flex items-center gap-1.5">
            <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=random`;
              }}
            />
            <span className="text-xs">{chain.name}</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Gas</span>
          <span className="font-mono text-xs">
            {gasEstimateNative ? `~${gasEstimateNative} ${chain.nativeCurrency.symbol}` : 'Calculating...'}
          </span>
        </div>

        {quote.routerResult?.routes && quote.routerResult.routes.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Route</span>
            <span className="text-xs truncate max-w-[150px]">
              {quote.routerResult.routes[0]?.subRoutes?.map(r => r.dexName).slice(0, 2).join(' → ') || 'Direct'}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-muted-foreground">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          This swap is routed through audited smart contracts. Always verify the amounts before confirming in your wallet.
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-11"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Swapping...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Confirm Swap
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
