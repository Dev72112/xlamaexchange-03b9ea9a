import { Loader2, Info, Route, Fuel, AlertTriangle, TrendingDown } from "lucide-react";
import { OkxQuote, OkxToken } from "@/services/okxdex";
import { Chain } from "@/data/chains";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DexQuoteInfoProps {
  quote: OkxQuote | null;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  chain: Chain | null;
  isLoading: boolean;
  slippage: string;
  inputAmount: string;
  outputAmount: string;
  gasEstimateNative?: string;
}

export function DexQuoteInfo({
  quote,
  fromToken,
  toToken,
  chain,
  isLoading,
  slippage,
  inputAmount,
  outputAmount,
  gasEstimateNative,
}: DexQuoteInfoProps) {
  if (!quote || !fromToken || !toToken || !chain) return null;

  const priceImpact = parseFloat(quote.priceImpactPercentage || '0');
  const isHighPriceImpact = priceImpact > 3;
  const isVeryHighPriceImpact = priceImpact > 10;

  // Calculate minimum received
  const minReceived = outputAmount 
    ? (parseFloat(outputAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)
    : '0';

  // Get route info
  const routes = quote.routerResult?.routes || [];
  const routeDisplay = routes.length > 0 
    ? routes[0].subRoutes?.map(r => r.dexName).join(' → ') || 'Direct swap'
    : 'Best route';

  return (
    <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border border-border text-sm">
      {/* Exchange Rate */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Rate</span>
        <span className="font-mono text-xs">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : inputAmount && outputAmount ? (
            `1 ${fromToken.tokenSymbol} = ${(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)} ${toToken.tokenSymbol}`
          ) : (
            '-'
          )}
        </span>
      </div>

      {/* Price Impact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Price Impact</span>
          {isHighPriceImpact && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className={cn(
                  "w-3 h-3",
                  isVeryHighPriceImpact ? "text-destructive" : "text-warning"
                )} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {isVeryHighPriceImpact 
                    ? "Very high price impact! Consider reducing trade size."
                    : "High price impact. Your trade may move the market price."}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={cn(
          "font-mono text-xs",
          isVeryHighPriceImpact && "text-destructive font-medium",
          isHighPriceImpact && !isVeryHighPriceImpact && "text-warning"
        )}>
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            `${priceImpact >= 0 ? '-' : ''}${Math.abs(priceImpact).toFixed(2)}%`
          )}
        </span>
      </div>

      {/* Minimum Received */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Min. Received</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Minimum tokens you'll receive with {slippage}% slippage tolerance.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="font-mono text-xs">
          {minReceived} {toToken.tokenSymbol}
        </span>
      </div>

      {/* Gas Estimate */}
      {gasEstimateNative && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Fuel className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Est. Gas</span>
          </div>
          <span className="font-mono text-xs">
            ~{gasEstimateNative} {chain.nativeCurrency.symbol}
          </span>
        </div>
      )}

      {/* Route */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Route className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Route</span>
        </div>
        <span className="text-xs text-right max-w-[150px] truncate">
          {routeDisplay}
        </span>
      </div>

      {/* DEX Sources */}
      {quote.quoteCompareList && quote.quoteCompareList.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1.5">Aggregating from:</div>
          <div className="flex flex-wrap gap-1">
            {quote.quoteCompareList.slice(0, 5).map((dex, i) => (
              <span 
                key={i}
                className="px-1.5 py-0.5 bg-secondary text-[10px] rounded flex items-center gap-1"
              >
                {dex.dexLogo && (
                  <img src={dex.dexLogo} alt={dex.dexName} className="w-3 h-3 rounded-full" />
                )}
                {dex.dexName}
              </span>
            ))}
            {quote.quoteCompareList.length > 5 && (
              <span className="px-1.5 py-0.5 bg-secondary text-[10px] rounded text-muted-foreground">
                +{quote.quoteCompareList.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
