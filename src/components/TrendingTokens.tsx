import { useState, useEffect, useCallback } from "react";
import { Flame, TrendingUp, TrendingDown, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chain, getEvmChains, getPrimaryChain, getChainIcon } from "@/data/chains";
import { cn } from "@/lib/utils";

interface TrendingToken {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h?: number;
}

interface TrendingTokensProps {
  onSelectToken?: (symbol: string) => void;
}

// Popular tokens per chain with fallback data
const CHAIN_TOKENS: Record<string, TrendingToken[]> = {
  '196': [ // X Layer
    { symbol: 'OKB', name: 'OKB', logo: 'https://static.okx.com/cdn/wallet/logo/OKB.png', price: 48.25, change24h: 2.3 },
    { symbol: 'USDT', name: 'Tether', logo: 'https://static.okx.com/cdn/wallet/logo/USDT.png', price: 1.0, change24h: 0.01 },
    { symbol: 'WETH', name: 'Wrapped ETH', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.5 },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://static.okx.com/cdn/wallet/logo/USDC.png', price: 1.0, change24h: 0.0 },
  ],
  '1': [ // Ethereum
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.8 },
    { symbol: 'USDT', name: 'Tether', logo: 'https://static.okx.com/cdn/wallet/logo/USDT.png', price: 1.0, change24h: 0.01 },
    { symbol: 'WBTC', name: 'Wrapped BTC', logo: 'https://static.okx.com/cdn/wallet/logo/BTC.png', price: 94500, change24h: 0.8 },
    { symbol: 'LINK', name: 'Chainlink', logo: 'https://static.okx.com/cdn/wallet/logo/LINK.png', price: 23.5, change24h: 3.2 },
  ],
  '56': [ // BSC
    { symbol: 'BNB', name: 'BNB', logo: 'https://static.okx.com/cdn/wallet/logo/bsc.png', price: 690, change24h: 2.1 },
    { symbol: 'CAKE', name: 'PancakeSwap', logo: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png', price: 2.45, change24h: -1.2 },
    { symbol: 'USDT', name: 'Tether', logo: 'https://static.okx.com/cdn/wallet/logo/USDT.png', price: 1.0, change24h: 0.0 },
    { symbol: 'XVS', name: 'Venus', logo: 'https://cryptologos.cc/logos/venus-xvs-logo.png', price: 8.75, change24h: 4.5 },
  ],
  '137': [ // Polygon
    { symbol: 'POL', name: 'POL', logo: 'https://static.okx.com/cdn/wallet/logo/polygon.png', price: 0.52, change24h: 3.4 },
    { symbol: 'WETH', name: 'Wrapped ETH', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.5 },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://static.okx.com/cdn/wallet/logo/USDC.png', price: 1.0, change24h: 0.0 },
    { symbol: 'AAVE', name: 'Aave', logo: 'https://cryptologos.cc/logos/aave-aave-logo.png', price: 340, change24h: 2.8 },
  ],
  '42161': [ // Arbitrum
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.8 },
    { symbol: 'ARB', name: 'Arbitrum', logo: 'https://static.okx.com/cdn/wallet/logo/arb.png', price: 0.82, change24h: 4.2 },
    { symbol: 'GMX', name: 'GMX', logo: 'https://cryptologos.cc/logos/gmx-gmx-logo.png', price: 28.5, change24h: 1.9 },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://static.okx.com/cdn/wallet/logo/USDC.png', price: 1.0, change24h: 0.0 },
  ],
  '8453': [ // Base
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.8 },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://static.okx.com/cdn/wallet/logo/USDC.png', price: 1.0, change24h: 0.0 },
    { symbol: 'cbETH', name: 'Coinbase ETH', logo: 'https://static.okx.com/cdn/wallet/logo/base.png', price: 3380, change24h: 1.6 },
    { symbol: 'DAI', name: 'DAI', logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', price: 1.0, change24h: 0.0 },
  ],
};

// Default tokens for chains not in the list
const DEFAULT_TOKENS: TrendingToken[] = [
  { symbol: 'ETH', name: 'Ethereum', logo: 'https://static.okx.com/cdn/wallet/logo/ETH.png', price: 3350, change24h: 1.8 },
  { symbol: 'USDT', name: 'Tether', logo: 'https://static.okx.com/cdn/wallet/logo/USDT.png', price: 1.0, change24h: 0.01 },
  { symbol: 'USDC', name: 'USD Coin', logo: 'https://static.okx.com/cdn/wallet/logo/USDC.png', price: 1.0, change24h: 0.0 },
];

export function TrendingTokens({ onSelectToken }: TrendingTokensProps) {
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const evmChains = getEvmChains().slice(0, 6); // Show top 6 chains

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chainTokens = CHAIN_TOKENS[selectedChain.chainIndex] || DEFAULT_TOKENS;
    setTokens(chainTokens);
    setIsLoading(false);
  }, [selectedChain.chainIndex]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Card className="bg-gradient-to-br from-card to-card/80 border-border overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 shrink-0">
                      <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <span className="truncate">Trending Tokens</span>
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Popular tokens on {selectedChain.name}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20 shrink-0 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live
                </Badge>
              </div>

              {/* Chain Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {evmChains.map((chain) => (
                  <Button
                    key={chain.chainIndex}
                    variant={selectedChain.chainIndex === chain.chainIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChain(chain)}
                    className="shrink-0 gap-2"
                  >
                    <img 
                      src={getChainIcon(chain)} 
                      alt={chain.name}
                      className="w-4 h-4 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=random&size=32`;
                      }}
                    />
                    <span className="hidden sm:inline">{chain.shortName}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="w-16 h-4" />
                        <Skeleton className="w-20 h-3" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="w-16 h-4 ml-auto" />
                      <Skeleton className="w-12 h-3 ml-auto" />
                    </div>
                  </div>
                ))
              ) : (
                tokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => onSelectToken?.(token.symbol)}
                    className="group relative flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all duration-200 text-left w-full cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={token.logo}
                        alt={token.name}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random`;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm uppercase">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-medium">{formatPrice(token.price)}</div>
                      <div className={cn(
                        "text-xs font-medium flex items-center justify-end gap-0.5",
                        token.change24h >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {token.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(token.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
