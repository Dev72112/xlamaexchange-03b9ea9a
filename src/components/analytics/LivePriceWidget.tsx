import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { okxDexService } from '@/services/okxdex';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { usePriceOracle } from '@/contexts/PriceOracleContext';
import { SUPPORTED_CHAINS, getChainIcon } from '@/data/chains';
import { cn } from '@/lib/utils';

interface TokenPriceData {
  symbol: string;
  chainIndex: string;
  tokenAddress: string;
  price: number;
  change24H: number;
  volume24H: number;
  logoUrl?: string;
}

// Fallback trending tokens when no trade history exists
const FALLBACK_TRENDING_TOKENS = [
  { chainIndex: '1', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
  { chainIndex: '1', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
  { chainIndex: '1', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
  { chainIndex: '501', address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  { chainIndex: '56', address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', symbol: 'WBNB' },
  { chainIndex: '1', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
];

const formatPrice = (price: number): string => {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
};

const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

export const LivePriceWidget = memo(function LivePriceWidget({ 
  chainFilter 
}: { 
  chainFilter?: string 
}) {
  const { transactions } = useDexTransactions();
  const { setPrice, getAllPrices } = usePriceOracle();
  const [prices, setPrices] = useState<TokenPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Extract top traded tokens from history
  const topTokens = (() => {
    let swaps = transactions.filter(tx => tx.type === 'swap' && tx.status === 'confirmed');
    
    if (chainFilter && chainFilter !== 'all') {
      swaps = swaps.filter(tx => tx.chainId === chainFilter);
    }

    // Count trades per token
    const tokenCounts = new Map<string, {
      symbol: string;
      chainIndex: string;
      tokenAddress: string;
      logoUrl?: string;
      count: number;
    }>();

    swaps.forEach(tx => {
      if (tx.toTokenAddress) {
        const key = `${tx.chainId}-${tx.toTokenAddress.toLowerCase()}`;
        const existing = tokenCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tokenCounts.set(key, {
            symbol: tx.toTokenSymbol,
            chainIndex: tx.chainId,
            tokenAddress: tx.toTokenAddress,
            logoUrl: tx.toTokenLogo,
            count: 1,
          });
        }
      }
    });

    return Array.from(tokenCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 tokens
  })();

  const fetchPrices = async () => {
    setIsLoading(true);
    
    // If no trades, try oracle first, then fallback to trending tokens
    if (topTokens.length === 0) {
      const oraclePrices = getAllPrices()
        .filter(p => !chainFilter || chainFilter === 'all' || p.chainIndex === chainFilter)
        .slice(0, 8);
      
      if (oraclePrices.length > 0) {
        setPrices(oraclePrices.map(p => ({
          symbol: p.symbol,
          chainIndex: p.chainIndex,
          tokenAddress: p.tokenAddress,
          price: p.price,
          change24H: p.change24h || 0,
          volume24H: p.volume24h || 0,
        })));
        setLastUpdated(new Date());
        setIsLoading(false);
        return;
      }
      
      // Fallback: fetch trending tokens directly
      const fallbackTokens = chainFilter && chainFilter !== 'all'
        ? FALLBACK_TRENDING_TOKENS.filter(t => t.chainIndex === chainFilter)
        : FALLBACK_TRENDING_TOKENS;
      
      const priceData: TokenPriceData[] = [];
      
      for (const token of fallbackTokens.slice(0, 6)) {
        try {
          const priceInfo = await okxDexService.getTokenPriceInfo(token.chainIndex, token.address);
          if (priceInfo?.price) {
            const price = parseFloat(priceInfo.price);
            const change24H = parseFloat(priceInfo.priceChange24H || '0');
            const volume24H = parseFloat(priceInfo.volume24H || '0');
            
            // Feed to oracle
            setPrice(token.chainIndex, token.address, token.symbol, price, change24H, {
              volume24h: volume24H,
              marketCap: parseFloat(priceInfo.marketCap || '0'),
            });
            
            priceData.push({
              symbol: token.symbol,
              chainIndex: token.chainIndex,
              tokenAddress: token.address,
              price,
              change24H,
              volume24H,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch fallback price for ${token.symbol}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (priceData.length > 0) {
        setPrices(priceData);
        setLastUpdated(new Date());
      }
      setIsLoading(false);
      return;
    }
    
    const priceData: TokenPriceData[] = [];

    for (const token of topTokens) {
      try {
        const priceInfo = await okxDexService.getTokenPriceInfo(
          token.chainIndex,
          token.tokenAddress
        );
        
        if (priceInfo?.price) {
          const price = parseFloat(priceInfo.price);
          const change24H = parseFloat(priceInfo.priceChange24H || '0');
          const volume24H = parseFloat(priceInfo.volume24H || '0');
          
          // Feed price to oracle for app-wide use
          setPrice(
            token.chainIndex,
            token.tokenAddress,
            token.symbol,
            price,
            change24H,
            { volume24h: volume24H, marketCap: parseFloat(priceInfo.marketCap || '0') }
          );
          
          priceData.push({
            symbol: token.symbol,
            chainIndex: token.chainIndex,
            tokenAddress: token.tokenAddress,
            price,
            change24H,
            volume24H,
            logoUrl: token.logoUrl,
          });
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${token.symbol}:`, err);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setPrices(priceData);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPrices();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [topTokens.length, chainFilter]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Live Prices
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={fetchPrices}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {isLoading && prices.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12 mt-1" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-12 mt-1" />
                  </div>
                </div>
              ))
            ) : prices.length > 0 ? (
              prices.map((token) => {
                const chainData = SUPPORTED_CHAINS.find(c => c.chainIndex === token.chainIndex);
                const isPositive = token.change24H > 0;
                const isNegative = token.change24H < 0;
                
                return (
                  <div 
                    key={`${token.chainIndex}-${token.tokenAddress}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        {token.logoUrl ? (
                          <img 
                            src={token.logoUrl} 
                            alt={token.symbol}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium">{token.symbol[0]}</span>
                          </div>
                        )}
                        {chainData && (
                          <img 
                            src={getChainIcon(chainData)}
                            alt={chainData.name}
                            className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border border-background"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{chainData?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{formatPrice(token.price)}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-xs",
                        isPositive && "text-green-500",
                        isNegative && "text-red-500",
                        !isPositive && !isNegative && "text-muted-foreground"
                      )}>
                        {isPositive && <TrendingUp className="w-3 h-3" />}
                        {isNegative && <TrendingDown className="w-3 h-3" />}
                        {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                        {formatChange(token.change24H)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Fetching market prices...</p>
                <p className="text-xs mt-1">Loading live token data</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
