import { AlertTriangle, ArrowDown, CheckCircle2, Info, Shield } from "lucide-react";
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

  // Format gas estimate
  const gasEstimate = quote.estimateGasFee 
    ? `${(parseFloat(quote.estimateGasFee) / 1e18).toFixed(6)} ${chain.nativeCurrency.symbol}`
    : 'Estimated';

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={fromToken.tokenLogoUrl || `https://ui-avatars.com/api/?name=${fromToken.tokenSymbol}&background=random`}
              alt={fromToken.tokenSymbol}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${fromToken.tokenSymbol}&background=random`;
              }}
            />
            <div>
              <div className="font-semibold">{fromToken.tokenSymbol}</div>
              <div className="text-xs text-muted-foreground">{fromToken.tokenName}</div>
            </div>
          </div>
          <div className="text-right">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={toToken.tokenLogoUrl || `https://ui-avatars.com/api/?name=${toToken.tokenSymbol}&background=random`}
              alt={toToken.tokenSymbol}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${toToken.tokenSymbol}&background=random`;
              }}
            />
            <div>
              <div className="font-semibold">{toToken.tokenSymbol}</div>
              <div className="text-xs text-muted-foreground">{toToken.tokenName}</div>
            </div>
          </div>
          <div className="text-right">
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
          <span>1 {fromToken.tokenSymbol} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.tokenSymbol}</span>
        </div>

        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>Price Impact</span>
            <Info className="w-3 h-3" />
          </div>
          <span className={cn(
            hasHighPriceImpact && "text-destructive",
            hasPriceImpactWarning && !hasHighPriceImpact && "text-warning"
          )}>
            {priceImpact.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Minimum Received</span>
          <span>{minReceived.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken.tokenSymbol}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Slippage</span>
          <span>{slippage}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Network</span>
          <div className="flex items-center gap-1.5">
            <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=random`;
              }}
            />
            <span>{chain.name}</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Gas</span>
          <span>{gasEstimate}</span>
        </div>

        {quote.routerResult?.routes && quote.routerResult.routes.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Route</span>
            <span className="text-xs">
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
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
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
