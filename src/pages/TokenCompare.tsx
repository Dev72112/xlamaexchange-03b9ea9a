import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, X, TrendingUp, TrendingDown, BarChart3, Search } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlowBar } from '@/components/ui/glow-bar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { okxDexService, TokenSearchResult, TokenPriceInfo } from '@/services/okxdex';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { cn } from '@/lib/utils';
import xlamaMascot from '@/assets/xlama-mascot.png';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CompareToken extends TokenSearchResult {
  priceInfo?: TokenPriceInfo;
  historicalPrices?: { date: string; price: number }[];
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TokenCompare() {
  const [tokens, setTokens] = useState<CompareToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch detailed info for each token
  const fetchTokenDetails = useCallback(async (token: TokenSearchResult) => {
    try {
      const priceInfo = await okxDexService.getTokenPriceInfo(
        token.chainIndex,
        token.tokenContractAddress
      );
      return { ...token, priceInfo: priceInfo || undefined };
    } catch {
      return token;
    }
  }, []);

  // Search for tokens
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const chains = SUPPORTED_CHAINS.slice(0, 5).map(c => c.chainIndex).join(',');
      const results = await okxDexService.searchTokens(chains, query);
      setSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Add token to comparison
  const addToken = async (token: TokenSearchResult) => {
    if (tokens.length >= 5) return;
    if (tokens.find(t => 
      t.chainIndex === token.chainIndex && 
      t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
    )) return;
    
    setIsLoading(true);
    const enrichedToken = await fetchTokenDetails(token);
    setTokens(prev => [...prev, enrichedToken]);
    setShowAddDialog(false);
    setSearchQuery('');
    setIsLoading(false);
  };

  // Remove token from comparison
  const removeToken = (index: number) => {
    setTokens(prev => prev.filter((_, i) => i !== index));
  };

  const formatValue = (value: string | number | undefined, type: 'price' | 'percent' | 'volume') => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    
    if (type === 'price') {
      if (num >= 1) return `$${num.toFixed(2)}`;
      if (num >= 0.0001) return `$${num.toFixed(6)}`;
      return `$${num.toFixed(8)}`;
    }
    if (type === 'percent') {
      return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }
    if (type === 'volume') {
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${num.toFixed(2)}`;
    }
    return String(value);
  };

  return (
    <>
      <Helmet>
        <title>Token Comparison | xlama</title>
        <meta name="description" content="Compare cryptocurrency tokens side by side - prices, volume, market cap, and performance across 25+ chains" />
      </Helmet>
      
      <AppLayout>
        <div className="container px-4 sm:px-6 py-8 max-w-6xl lg:max-w-7xl 2xl:max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-primary/20 text-xs sm:text-sm text-primary mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Research Tool</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold gradient-text mb-2">
              Token Comparison
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Compare up to 5 tokens side by side
            </p>
          </div>
          
          <div className="flex justify-center mb-6">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button disabled={tokens.length >= 5} size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Token to Compare</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or symbol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <ScrollArea className="h-64">
                    {isSearching ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map((result, i) => {
                          const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === result.chainIndex);
                          const alreadyAdded = tokens.some(t => 
                            t.chainIndex === result.chainIndex && 
                            t.tokenContractAddress.toLowerCase() === result.tokenContractAddress.toLowerCase()
                          );
                          
                          return (
                            <button
                              key={`${result.chainIndex}-${result.tokenContractAddress}-${i}`}
                              className={cn(
                                "w-full p-3 rounded-lg flex items-center gap-3 transition-colors text-left",
                                alreadyAdded 
                                  ? "bg-secondary/20 opacity-50 cursor-not-allowed"
                                  : "hover:bg-secondary/50"
                              )}
                              onClick={() => !alreadyAdded && addToken(result)}
                              disabled={alreadyAdded}
                            >
                              {result.tokenLogoUrl && (
                                <img 
                                  src={result.tokenLogoUrl} 
                                  alt={result.tokenSymbol}
                                  className="w-8 h-8 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{result.tokenSymbol}</p>
                                <p className="text-xs text-muted-foreground truncate">{result.tokenName}</p>
                              </div>
                              {chain && (
                                <Badge variant="outline" className="text-xs">
                                  {chain.shortName}
                                </Badge>
                              )}
                              {result.price && (
                                <span className="text-sm font-mono">
                                  {formatValue(result.price, 'price')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        No tokens found
                      </p>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Search for a token to add
                      </p>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tokens.length === 0 ? (
            <Card className="glass glow-sm border-primary/10 overflow-hidden max-w-xl mx-auto">
              <GlowBar variant="multi" />
              <CardContent className="py-16 text-center">
                <img src={xlamaMascot} alt="xLama mascot" className="w-16 h-16 mx-auto mb-4 opacity-60 rounded-full" />
                <h3 className="text-lg font-medium mb-2">No tokens to compare</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add tokens to start comparing their performance
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Token
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Token cards grid */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {tokens.map((token, index) => {
                  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === token.chainIndex);
                  const change24h = token.priceInfo?.priceChange24H || token.change24H;
                  const isPositive = change24h && parseFloat(change24h) >= 0;
                  
                  return (
                    <Card key={`${token.chainIndex}-${token.tokenContractAddress}`} className="relative sweep-effect shadow-premium-hover">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeToken(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: CHART_COLORS[index] }}
                          />
                          {token.tokenLogoUrl && (
                            <img 
                              src={token.tokenLogoUrl} 
                              alt={token.tokenSymbol}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <CardTitle className="text-sm">{token.tokenSymbol}</CardTitle>
                        </div>
                        {chain && (
                          <Badge variant="outline" className="w-fit text-xs mt-1">
                            {chain.shortName}
                          </Badge>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-mono font-medium">
                            {formatValue(token.priceInfo?.price || token.price, 'price')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">24h</span>
                          <span className={cn(
                            "font-medium flex items-center gap-1",
                            isPositive ? "text-success" : "text-destructive"
                          )}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {formatValue(change24h, 'percent')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volume</span>
                          <span className="font-mono">
                            {formatValue(token.priceInfo?.volume24H, 'volume')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">MCap</span>
                          <span className="font-mono">
                            {formatValue(token.priceInfo?.marketCap || token.marketCap, 'volume')}
                          </span>
                        </div>
                        
                        {token.priceInfo?.liquidity && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Liquidity</span>
                            <span className="font-mono">
                              {formatValue(token.priceInfo.liquidity, 'volume')}
                            </span>
                          </div>
                        )}
                        
                        {token.priceInfo?.holders && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Holders</span>
                            <span className="font-mono">
                              {parseInt(token.priceInfo.holders).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Comparison table */}
              {tokens.length >= 2 && (
                <Card className="sweep-effect shadow-premium-hover">
                  <CardHeader>
                    <CardTitle className="text-lg">Comparison Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Metric</th>
                            {tokens.map((token, i) => (
                              <th key={token.tokenContractAddress} className="text-right py-2 px-3">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: CHART_COLORS[i] }}
                                  />
                                  {token.tokenSymbol}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3 text-muted-foreground">Price</td>
                            {tokens.map(t => (
                              <td key={t.tokenContractAddress} className="text-right py-2 px-3 font-mono">
                                {formatValue(t.priceInfo?.price || t.price, 'price')}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 text-muted-foreground">24h Change</td>
                            {tokens.map(t => {
                              const change = t.priceInfo?.priceChange24H || t.change24H;
                              const isPos = change && parseFloat(change) >= 0;
                              return (
                                <td key={t.tokenContractAddress} className={cn(
                                  "text-right py-2 px-3 font-medium",
                                  isPos ? "text-success" : "text-destructive"
                                )}>
                                  {formatValue(change, 'percent')}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 text-muted-foreground">Market Cap</td>
                            {tokens.map(t => (
                              <td key={t.tokenContractAddress} className="text-right py-2 px-3 font-mono">
                                {formatValue(t.priceInfo?.marketCap || t.marketCap, 'volume')}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 text-muted-foreground">24h Volume</td>
                            {tokens.map(t => (
                              <td key={t.tokenContractAddress} className="text-right py-2 px-3 font-mono">
                                {formatValue(t.priceInfo?.volume24H, 'volume')}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 text-muted-foreground">Liquidity</td>
                            {tokens.map(t => (
                              <td key={t.tokenContractAddress} className="text-right py-2 px-3 font-mono">
                                {formatValue(t.priceInfo?.liquidity, 'volume')}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-muted-foreground">Holders</td>
                            {tokens.map(t => (
                              <td key={t.tokenContractAddress} className="text-right py-2 px-3 font-mono">
                                {t.priceInfo?.holders ? parseInt(t.priceInfo.holders).toLocaleString() : '—'}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
}
