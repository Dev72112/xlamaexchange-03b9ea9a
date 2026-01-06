import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Target, Shield, Clock, ChevronDown, Loader2, BarChart2, Layers, Search, X, BadgeCheck, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePricePrediction, PricePrediction as PricePredictionType } from '@/hooks/usePricePrediction';
import { useTokenWatchlist } from '@/hooks/useTokenWatchlist';
import { useTradePreFill } from '@/contexts/TradePreFillContext';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { okxDexService, TokenSearchResult } from '@/services/okxdex';
import { cn } from '@/lib/utils';
import { FibonacciLevels, VolumeProfileBin } from '@/lib/technicalIndicators';

interface PricePredictionProps {
  chainIndex?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  className?: string;
}

// Popular tokens for quick selection
const POPULAR_TOKENS = [
  { chainIndex: '1', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Ethereum' },
  { chainIndex: '1', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether' },
  { chainIndex: '1', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { chainIndex: '56', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'BNB', name: 'BNB Chain' },
  { chainIndex: '501', address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana' },
  { chainIndex: '137', address: '0x0000000000000000000000000000000000001010', symbol: 'MATIC', name: 'Polygon' },
  { chainIndex: '42161', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Arbitrum ETH' },
  { chainIndex: '8453', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Base ETH' },
];

export function PricePrediction({ 
  chainIndex: initialChainIndex, 
  tokenAddress: initialTokenAddress,
  tokenSymbol: initialTokenSymbol,
  className 
}: PricePredictionProps) {
  const { predict, prediction, isLoading, error } = usePricePrediction();
  const { tokens: watchlist } = useTokenWatchlist();
  const { selectedSwapToken, setSelectedPredictionToken } = useTradePreFill();
  
  const [selectedToken, setSelectedToken] = useState<{
    chainIndex: string;
    address: string;
    symbol: string;
  } | null>(initialChainIndex && initialTokenAddress ? {
    chainIndex: initialChainIndex,
    address: initialTokenAddress,
    symbol: initialTokenSymbol || 'Token',
  } : null);
  
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D'>('1H');
  const [showSignals, setShowSignals] = useState(false);
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChainIndex, setSelectedChainIndex] = useState('1');
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Track if update came from swap widget to avoid loops
  const lastSwapTokenRef = useRef<string | null>(null);

  // Sync from swap widget to prediction
  useEffect(() => {
    if (selectedSwapToken) {
      const key = `${selectedSwapToken.chainIndex}-${selectedSwapToken.tokenAddress}`;
      if (lastSwapTokenRef.current !== key) {
        lastSwapTokenRef.current = key;
        setSelectedToken({
          chainIndex: selectedSwapToken.chainIndex,
          address: selectedSwapToken.tokenAddress,
          symbol: selectedSwapToken.tokenSymbol,
        });
      }
    }
  }, [selectedSwapToken]);

  // Auto-predict when token or timeframe changes
  useEffect(() => {
    if (selectedToken) {
      predict(selectedToken.chainIndex, selectedToken.address, timeframe);
    }
  }, [selectedToken, timeframe, predict]);

  // Search tokens using OKX v6 API when query is 3+ chars
  useEffect(() => {
    const query = searchQuery.trim();
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTokens = async () => {
      setIsSearching(true);
      try {
        const results = await okxDexService.searchTokens(selectedChainIndex, query);
        setSearchResults(results);
      } catch (err) {
        console.error('Token search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchTokens, 400);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedChainIndex]);

  const handleSelectToken = (token: { chainIndex: string; address: string; symbol: string; name?: string; logoUrl?: string }) => {
    setSelectedToken({
      chainIndex: token.chainIndex,
      address: token.address,
      symbol: token.symbol,
    });
    setTokenSelectorOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    // Notify swap widget of selection
    setSelectedPredictionToken({
      chainIndex: token.chainIndex,
      tokenAddress: token.address,
      tokenSymbol: token.symbol,
    });
  };

  const handleClearToken = () => {
    setSelectedToken(null);
    setSelectedPredictionToken(null);
  };

  const getChainName = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain?.name || `Chain ${chainIndex}`;
  };

  const getChainIcon = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain?.icon;
  };

  // Filter popular tokens by search and selected chain
  const filteredPopularTokens = POPULAR_TOKENS.filter(t => 
    t.chainIndex === selectedChainIndex && (
      searchQuery === '' || 
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Filter watchlist tokens by search and selected chain
  const filteredWatchlist = watchlist.filter(t =>
    t.chainIndex === selectedChainIndex && (
      searchQuery === '' ||
      t.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Format price for display
  const formatTokenPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num) || num === 0) return '';
    if (num < 0.0001) return `$${num.toExponential(2)}`;
    if (num < 1) return `$${num.toFixed(6)}`;
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const formatPriceChange = (change: number | string) => {
    const num = typeof change === 'string' ? parseFloat(change) : change;
    if (isNaN(num)) return null;
    return num;
  };

  const getTrendIcon = (trend: PricePredictionType['trend']) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSignalIcon = (signal: 'bullish' | 'bearish' | 'neutral') => {
    switch (signal) {
      case 'bullish':
        return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
      case 'bearish':
        return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: PricePredictionType['confidence']) => {
    const variants = {
      high: 'bg-primary/20 text-primary border-primary/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge variant="outline" className={cn('text-xs', variants[confidence])}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(4);
    if (price < 1) return price.toFixed(6);
    if (price < 1000) return price.toFixed(4);
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Price Prediction
          </CardTitle>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as '1H' | '4H' | '1D')}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1H">1 Hour</SelectItem>
              <SelectItem value="4H">4 Hours</SelectItem>
              <SelectItem value="1D">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Selector */}
        <div className="flex gap-2">
          <Popover open={tokenSelectorOpen} onOpenChange={setTokenSelectorOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1 justify-start h-10"
              >
                {selectedToken ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={getChainIcon(selectedToken.chainIndex)} 
                      alt="" 
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="font-medium">{selectedToken.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      on {getChainName(selectedToken.chainIndex)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Search className="w-4 h-4" />
                    <span>Select a token...</span>
                  </div>
                )}
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] p-0" align="start">
              <div className="p-2 border-b border-border space-y-2">
                {/* Chain Selector */}
                <Select value={selectedChainIndex} onValueChange={setSelectedChainIndex}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(chain => (
                      <SelectItem key={chain.chainIndex} value={chain.chainIndex}>
                        <div className="flex items-center gap-2">
                          <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" />
                          <span>{chain.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, symbol, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                </div>
              </div>
              <ScrollArea className="h-[350px]">
                {/* API Search Results */}
                {searchResults.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Search Results</p>
                    {searchResults.map((token) => {
                      const priceChange = formatPriceChange(token.change24H);
                      const isVerified = token.tagList?.communityRecognized;
                      return (
                        <button
                          key={`${token.chainIndex}-${token.tokenContractAddress}`}
                          onClick={() => handleSelectToken({
                            chainIndex: token.chainIndex,
                            address: token.tokenContractAddress,
                            symbol: token.tokenSymbol,
                            name: token.tokenName,
                            logoUrl: token.tokenLogoUrl,
                          })}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          <img 
                            src={token.tokenLogoUrl || `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`}
                            alt={token.tokenSymbol}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
                            }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm truncate">{token.tokenSymbol}</p>
                              {isVerified && (
                                <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{token.tokenName}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {token.price && (
                              <p className="text-xs font-mono">{formatTokenPrice(parseFloat(token.price))}</p>
                            )}
                            {priceChange !== null && (
                              <p className={cn(
                                "text-[10px] flex items-center justify-end gap-0.5",
                                priceChange > 0 ? "text-primary" : priceChange < 0 ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : priceChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Watchlist Section */}
                {filteredWatchlist.length > 0 && searchResults.length === 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3" /> Your Watchlist
                    </p>
                    {filteredWatchlist.map((token) => (
                      <button
                        key={`${token.chainIndex}-${token.tokenContractAddress}`}
                        onClick={() => handleSelectToken({
                          chainIndex: token.chainIndex,
                          address: token.tokenContractAddress,
                          symbol: token.tokenSymbol,
                        })}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <img 
                          src={getChainIcon(token.chainIndex)} 
                          alt="" 
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{token.tokenSymbol}</p>
                          <p className="text-xs text-muted-foreground">{getChainName(token.chainIndex)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Popular Tokens Section */}
                {searchResults.length === 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Popular Tokens</p>
                    {filteredPopularTokens.length > 0 ? (
                      filteredPopularTokens.map((token, i) => (
                        <button
                          key={`${token.chainIndex}-${token.address}-${i}`}
                          onClick={() => handleSelectToken(token)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          <img 
                            src={getChainIcon(token.chainIndex)} 
                            alt="" 
                            className="w-6 h-6 rounded-full"
                          />
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{token.symbol}</p>
                            <p className="text-xs text-muted-foreground">{token.name}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {searchQuery ? 'No tokens found. Try searching by name or contract address.' : 'Select a chain to see popular tokens'}
                      </p>
                    )}
                  </div>
                )}

                {/* No Results Message */}
                {searchQuery && searchResults.length === 0 && !isSearching && filteredPopularTokens.length === 0 && filteredWatchlist.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No tokens found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try a different search term or paste a contract address</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {selectedToken && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClearToken}
              className="h-10 w-10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Loading/Error States */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-4">
            <p className="text-xs text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectedToken && predict(selectedToken.chainIndex, selectedToken.address, timeframe)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!selectedToken && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a token above to view price prediction
          </p>
        )}

        {prediction && selectedToken && !isLoading && (
          <>
            {/* Main Prediction */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Predicted Price ({prediction.timeframe})</p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(prediction.trend)}
                  <span className="text-lg font-bold">${formatPrice(prediction.predictedPrice)}</span>
                </div>
                <div className={cn(
                  "text-sm font-medium mt-0.5",
                  prediction.predictedChange > 0 ? "text-primary" : 
                  prediction.predictedChange < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {prediction.predictedChange > 0 ? '+' : ''}{prediction.predictedChange.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                {getConfidenceBadge(prediction.confidence)}
                <p className="text-xs text-muted-foreground mt-2">
                  Current: ${formatPrice(prediction.currentPrice)}
                </p>
              </div>
            </div>

            {/* Support & Resistance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Shield className="w-3 h-3" />
                  Support
                </div>
                <p className="text-sm font-semibold text-primary">
                  ${formatPrice(prediction.supportLevel)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Target className="w-3 h-3" />
                  Resistance
                </div>
                <p className="text-sm font-semibold text-destructive">
                  ${formatPrice(prediction.resistanceLevel)}
                </p>
              </div>
            </div>

            {/* Fibonacci Levels */}
            {prediction.fibonacci && (
              <Collapsible open={showFibonacci} onOpenChange={setShowFibonacci}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                    <span className="text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Fibonacci Retracement
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {prediction.fibonacci.trend}
                      </Badge>
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      showFibonacci && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1">
                    {[
                      { label: '0%', value: prediction.fibonacci.level0 },
                      { label: '23.6%', value: prediction.fibonacci.level236 },
                      { label: '38.2%', value: prediction.fibonacci.level382 },
                      { label: '50%', value: prediction.fibonacci.level50 },
                      { label: '61.8%', value: prediction.fibonacci.level618 },
                      { label: '78.6%', value: prediction.fibonacci.level786 },
                      { label: '100%', value: prediction.fibonacci.level100 },
                    ].map((level) => {
                      const distancePercent = ((prediction.currentPrice - level.value) / level.value) * 100;
                      const isNear = Math.abs(distancePercent) < 2;
                      return (
                        <div 
                          key={level.label}
                          className={cn(
                            "flex items-center justify-between py-1 px-2 rounded text-xs",
                            isNear ? "bg-primary/10 border border-primary/20" : "bg-secondary/20"
                          )}
                        >
                          <span className={cn(isNear && "font-medium text-primary")}>
                            {level.label}
                          </span>
                          <span className="font-mono">${formatPrice(level.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Volume Profile */}
            {prediction.volumeProfile && prediction.volumeProfile.length > 0 && (
              <Collapsible open={showVolumeProfile} onOpenChange={setShowVolumeProfile}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                    <span className="text-xs flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Volume Profile
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      showVolumeProfile && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1">
                    {prediction.volumeProfile.slice(0, 12).map((bin, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "flex items-center gap-2 py-0.5 px-2 rounded text-xs",
                          bin.isPointOfControl && "bg-primary/10 border border-primary/20",
                          (bin.isValueAreaHigh || bin.isValueAreaLow) && !bin.isPointOfControl && "bg-secondary/40"
                        )}
                      >
                        <span className="w-16 font-mono text-[10px] text-muted-foreground">
                          ${formatPrice(bin.priceLevel)}
                        </span>
                        <div className="flex-1">
                          <Progress 
                            value={bin.percentage} 
                            className={cn(
                              "h-2",
                              bin.isPointOfControl && "[&>div]:bg-primary"
                            )}
                          />
                        </div>
                        <span className="w-10 text-right text-[10px] text-muted-foreground">
                          {bin.percentage.toFixed(1)}%
                        </span>
                        {bin.isPointOfControl && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">POC</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    POC = Point of Control (highest volume level)
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Technical Signals */}
            <Collapsible open={showSignals} onOpenChange={setShowSignals}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                  <span className="text-xs">Technical Signals ({prediction.signals.length})</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showSignals && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1.5">
                  {prediction.signals.map((signal, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/20"
                    >
                      <div className="flex items-center gap-2">
                        {getSignalIcon(signal.signal)}
                        <span className="text-xs">{signal.name}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {signal.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => predict(selectedToken.chainIndex, selectedToken.address, timeframe)} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Refresh Prediction
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Predictions based on technical analysis. Not financial advice.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
