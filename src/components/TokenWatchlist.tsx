import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, RefreshCw, ArrowRightLeft, Trash2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTokenWatchlist, WatchlistTokenWithPrice } from '@/hooks/useTokenWatchlist';
import { useDexPriceAlerts } from '@/hooks/useDexPriceAlerts';
import { PriceAlertModal } from '@/components/PriceAlertModal';
import { getChainByIndex } from '@/data/chains';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import xlamaMascot from '@/assets/xlama-mascot.png';

interface TokenWatchlistProps {
  className?: string;
  compact?: boolean;
}

export function TokenWatchlist({ className, compact = false }: TokenWatchlistProps) {
  const navigate = useNavigate();
  const { tokens, isLoadingPrices, refreshPrices, removeToken } = useTokenWatchlist();
  const { activeAlerts, getAlertsForToken } = useDexPriceAlerts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertModalToken, setAlertModalToken] = useState<WatchlistTokenWithPrice | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPrices();
    setIsRefreshing(false);
  };

  const handleQuickSwap = (token: WatchlistTokenWithPrice) => {
    const chain = getChainByIndex(token.chainIndex);
    if (chain) {
      // Navigate to home with DEX mode and token pre-selected
      navigate(`/?mode=dex&chain=${token.chainIndex}&to=${token.tokenContractAddress}`);
    }
  };

  const formatPrice = (price?: string) => {
    if (!price) return '-';
    const num = parseFloat(price);
    if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (num >= 1) return `$${num.toFixed(2)}`;
    if (num >= 0.0001) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(6)}`;
  };

  const formatChange = (change?: string) => {
    if (!change) return null;
    const num = parseFloat(change);
    const isPositive = num >= 0;
    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-xs font-mono",
          isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}
      >
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {Math.abs(num).toFixed(2)}%
      </Badge>
    );
  };

  const formatMarketCap = (cap?: string) => {
    if (!cap) return '-';
    const num = parseFloat(cap);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (compact && tokens.length === 0) {
    return null;
  }

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border overflow-hidden sweep-effect", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 min-w-0">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500 shrink-0" />
            <span className="truncate">Watchlist</span>
            {tokens.length > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">{tokens.length}</Badge>
            )}
            {activeAlerts.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                <Bell className="w-3 h-3" />
                {activeAlerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingPrices}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", (isRefreshing || isLoadingPrices) && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <img src={xlamaMascot} alt="xLama mascot" className="w-16 h-16 mx-auto mb-3 opacity-60 rounded-full" />
            <p className="text-sm font-medium">No tokens in your watchlist</p>
            <p className="text-xs mt-1">Click the star icon on any token to add it</p>
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
            <div className="space-y-2">
              {tokens.map((token) => {
                const chain = getChainByIndex(token.chainIndex);
                return (
                  <div
                    key={`${token.chainIndex}-${token.tokenContractAddress}`}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group gap-2 sweep-effect-fast"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <img
                          src={token.tokenLogoUrl}
                          alt={token.tokenSymbol}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
                          }}
                        />
                        {chain && (
                          <img
                            src={chain.icon}
                            alt={chain.name}
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-background"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold flex items-center gap-1.5 sm:gap-2 flex-wrap text-sm sm:text-base">
                          <span className="truncate">{token.tokenSymbol}</span>
                          {formatChange(token.change24H)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5 sm:gap-2 truncate">
                          <span className="truncate">{chain?.name || 'Unknown'}</span>
                          {token.marketCap && (
                            <>
                              <span>•</span>
                              <span className="truncate">MCap: {formatMarketCap(token.marketCap)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <div className="text-right mr-1 sm:mr-2">
                        {token.isLoading ? (
                          <Skeleton className="h-5 w-14 sm:w-16" />
                        ) : (
                          <span className="font-mono font-semibold text-sm sm:text-base">{formatPrice(token.price)}</span>
                        )}
                      </div>
                      <div className="flex gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setAlertModalToken(token)}
                          title="Set price alert"
                        >
                          <Bell className={cn(
                            "h-4 w-4",
                            getAlertsForToken(token.chainIndex, token.tokenContractAddress).length > 0 && "text-primary"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuickSwap(token)}
                          title="Quick swap"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeToken(token.chainIndex, token.tokenContractAddress)}
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Price Alert Modal */}
      {alertModalToken && (
        <PriceAlertModal
          open={!!alertModalToken}
          onOpenChange={(open) => !open && setAlertModalToken(null)}
          token={{
            chainIndex: alertModalToken.chainIndex,
            tokenContractAddress: alertModalToken.tokenContractAddress,
            tokenSymbol: alertModalToken.tokenSymbol,
            tokenLogoUrl: alertModalToken.tokenLogoUrl,
            currentPrice: alertModalToken.price ? parseFloat(alertModalToken.price) : undefined,
          }}
        />
      )}
    </Card>
  );
}
