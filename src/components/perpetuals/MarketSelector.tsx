/**
 * Market Selector Component
 * 
 * Enhanced market selection with search, filtering, and expanded view.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  ChevronDown,
  Zap,
  Flame,
  Grid3X3,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Extended market list
const ALL_MARKETS = [
  // Major
  { coin: 'BTC', name: 'Bitcoin', category: 'major' },
  { coin: 'ETH', name: 'Ethereum', category: 'major' },
  { coin: 'SOL', name: 'Solana', category: 'major' },
  { coin: 'BNB', name: 'BNB', category: 'major' },
  { coin: 'XRP', name: 'XRP', category: 'major' },
  // Layer 1
  { coin: 'AVAX', name: 'Avalanche', category: 'l1' },
  { coin: 'ADA', name: 'Cardano', category: 'l1' },
  { coin: 'DOT', name: 'Polkadot', category: 'l1' },
  { coin: 'NEAR', name: 'NEAR Protocol', category: 'l1' },
  { coin: 'APT', name: 'Aptos', category: 'l1' },
  { coin: 'SUI', name: 'Sui', category: 'l1' },
  { coin: 'SEI', name: 'Sei', category: 'l1' },
  { coin: 'TIA', name: 'Celestia', category: 'l1' },
  { coin: 'INJ', name: 'Injective', category: 'l1' },
  { coin: 'FTM', name: 'Fantom', category: 'l1' },
  // Layer 2
  { coin: 'ARB', name: 'Arbitrum', category: 'l2' },
  { coin: 'OP', name: 'Optimism', category: 'l2' },
  { coin: 'MATIC', name: 'Polygon', category: 'l2' },
  { coin: 'STRK', name: 'Starknet', category: 'l2' },
  { coin: 'IMX', name: 'Immutable X', category: 'l2' },
  { coin: 'MANTA', name: 'Manta', category: 'l2' },
  { coin: 'BLAST', name: 'Blast', category: 'l2' },
  // DeFi
  { coin: 'LINK', name: 'Chainlink', category: 'defi' },
  { coin: 'UNI', name: 'Uniswap', category: 'defi' },
  { coin: 'AAVE', name: 'Aave', category: 'defi' },
  { coin: 'MKR', name: 'Maker', category: 'defi' },
  { coin: 'SNX', name: 'Synthetix', category: 'defi' },
  { coin: 'CRV', name: 'Curve', category: 'defi' },
  { coin: 'LDO', name: 'Lido', category: 'defi' },
  { coin: 'PENDLE', name: 'Pendle', category: 'defi' },
  { coin: 'GMX', name: 'GMX', category: 'defi' },
  { coin: 'DYDX', name: 'dYdX', category: 'defi' },
  { coin: 'JUP', name: 'Jupiter', category: 'defi' },
  // Meme
  { coin: 'DOGE', name: 'Dogecoin', category: 'meme' },
  { coin: 'SHIB', name: 'Shiba Inu', category: 'meme' },
  { coin: 'PEPE', name: 'Pepe', category: 'meme' },
  { coin: 'WIF', name: 'dogwifhat', category: 'meme' },
  { coin: 'BONK', name: 'Bonk', category: 'meme' },
  { coin: 'FLOKI', name: 'Floki', category: 'meme' },
  // AI
  { coin: 'FET', name: 'Fetch.ai', category: 'ai' },
  { coin: 'RNDR', name: 'Render', category: 'ai' },
  { coin: 'TAO', name: 'Bittensor', category: 'ai' },
  { coin: 'ARKM', name: 'Arkham', category: 'ai' },
  { coin: 'WLD', name: 'Worldcoin', category: 'ai' },
  // Gaming
  { coin: 'AXS', name: 'Axie Infinity', category: 'gaming' },
  { coin: 'GALA', name: 'Gala', category: 'gaming' },
  { coin: 'SAND', name: 'Sandbox', category: 'gaming' },
  { coin: 'MANA', name: 'Decentraland', category: 'gaming' },
  { coin: 'ENJ', name: 'Enjin', category: 'gaming' },
  // Infrastructure
  { coin: 'FIL', name: 'Filecoin', category: 'infra' },
  { coin: 'AR', name: 'Arweave', category: 'infra' },
  { coin: 'GRT', name: 'The Graph', category: 'infra' },
  { coin: 'ATOM', name: 'Cosmos', category: 'infra' },
  { coin: 'STX', name: 'Stacks', category: 'infra' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid3X3 },
  { id: 'major', label: 'Major', icon: Star },
  { id: 'l1', label: 'Layer 1', icon: Zap },
  { id: 'l2', label: 'Layer 2', icon: Zap },
  { id: 'defi', label: 'DeFi', icon: TrendingUp },
  { id: 'meme', label: 'Meme', icon: Flame },
  { id: 'ai', label: 'AI', icon: Zap },
];

interface MarketSelectorProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
  currentPrices: Record<string, number>;
  className?: string;
}

export const MarketSelector = memo(function MarketSelector({
  selectedPair,
  onSelectPair,
  currentPrices,
  className,
}: MarketSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('perps-favorites') || '["BTC", "ETH", "SOL"]');
    } catch {
      return ['BTC', 'ETH', 'SOL'];
    }
  });

  const toggleFavorite = useCallback((coin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(coin) 
        ? prev.filter(c => c !== coin)
        : [...prev, coin];
      localStorage.setItem('perps-favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const filteredMarkets = useMemo(() => {
    return ALL_MARKETS.filter(market => {
      const matchesSearch = 
        market.coin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || market.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const favoriteMarkets = useMemo(() => {
    return ALL_MARKETS.filter(m => favorites.includes(m.coin));
  }, [favorites]);

  const selectedMarket = ALL_MARKETS.find(m => m.coin === selectedPair);
  const selectedPrice = currentPrices[selectedPair] || 0;

  const handleSelect = (coin: string) => {
    onSelectPair(coin);
    setIsOpen(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(4)}`;
  };

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Markets
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {ALL_MARKETS.length} pairs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selected Market Display */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-14 px-4 glass border-primary/30 hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {selectedPair.slice(0, 2)}
                </div>
                <div className="text-left">
                  <p className="font-semibold">{selectedPair}-PERP</p>
                  <p className="text-xs text-muted-foreground">{selectedMarket?.name || selectedPair}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatPrice(selectedPrice)}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-3 border-b border-border">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50"
                />
              </div>

              {/* Category Filters */}
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">
                {filteredMarkets.length} markets
              </span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[320px]">
              {/* Favorites Section */}
              {favoriteMarkets.length > 0 && selectedCategory === 'all' && !searchQuery && (
                <div className="p-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Favorites
                  </p>
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-3 gap-2" 
                      : "space-y-1"
                  )}>
                    {favoriteMarkets.map(market => (
                      <MarketItem
                        key={market.coin}
                        market={market}
                        price={currentPrices[market.coin]}
                        isSelected={selectedPair === market.coin}
                        isFavorite={true}
                        onSelect={handleSelect}
                        onToggleFavorite={toggleFavorite}
                        viewMode={viewMode}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Markets */}
              <div className="p-3">
                <div className={cn(
                  viewMode === 'grid' 
                    ? "grid grid-cols-3 gap-2" 
                    : "space-y-1"
                )}>
                  {filteredMarkets.map(market => (
                    <MarketItem
                      key={market.coin}
                      market={market}
                      price={currentPrices[market.coin]}
                      isSelected={selectedPair === market.coin}
                      isFavorite={favorites.includes(market.coin)}
                      onSelect={handleSelect}
                      onToggleFavorite={toggleFavorite}
                      viewMode={viewMode}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Quick Select Favorites */}
        <div className="flex flex-wrap gap-2">
          {favoriteMarkets.slice(0, 8).map(market => (
            <Button
              key={market.coin}
              variant={selectedPair === market.coin ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPair(market.coin)}
              className={cn(
                "gap-1.5 text-xs",
                selectedPair === market.coin && "bg-primary text-primary-foreground"
              )}
            >
              {market.coin}
              {currentPrices[market.coin] > 0 && (
                <span className="opacity-70 font-mono">
                  {formatPrice(currentPrices[market.coin])}
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// Market Item Component
const MarketItem = memo(function MarketItem({
  market,
  price,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  viewMode,
  formatPrice,
}: {
  market: { coin: string; name: string; category: string };
  price?: number;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (coin: string) => void;
  onToggleFavorite: (coin: string, e: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
  formatPrice: (price: number) => string;
}) {
  if (viewMode === 'grid') {
    return (
      <button
        onClick={() => onSelect(market.coin)}
        className={cn(
          "relative p-2 rounded-lg border text-center transition-all hover:border-primary/50 hover:bg-primary/5",
          isSelected ? "border-primary bg-primary/10" : "border-border"
        )}
      >
        <button
          onClick={(e) => onToggleFavorite(market.coin, e)}
          className="absolute top-1 right-1 p-0.5 hover:bg-primary/10 rounded"
        >
          <Star className={cn(
            "w-3 h-3",
            isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
          )} />
        </button>
        <div className="text-sm font-medium">{market.coin}</div>
        {price && price > 0 && (
          <div className="text-[10px] text-muted-foreground font-mono">
            {formatPrice(price)}
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(market.coin)}
      className={cn(
        "flex items-center justify-between w-full p-2 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5",
        isSelected ? "border-primary bg-primary/10" : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => onToggleFavorite(market.coin, e)}
          className="p-0.5 hover:bg-primary/10 rounded"
        >
          <Star className={cn(
            "w-3.5 h-3.5",
            isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
          )} />
        </button>
        <div>
          <span className="font-medium text-sm">{market.coin}-PERP</span>
          <span className="text-xs text-muted-foreground ml-2">{market.name}</span>
        </div>
      </div>
      {price && price > 0 && (
        <span className="font-mono text-sm">{formatPrice(price)}</span>
      )}
    </button>
  );
});

export default MarketSelector;
