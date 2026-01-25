import { memo, Suspense, lazy, useCallback, useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/shared/components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Layers, 
  Zap, 
  AlertTriangle, 
  Image, 
  RefreshCw,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronDown,
  Coins,
  Eye,
  EyeOff,
  Check,
  Cpu,
} from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { PortfolioSkeleton } from "@/components/skeletons";
import { useQueryClient } from "@tanstack/react-query";
import { SUPPORTED_CHAINS, getEvmChains, Chain } from "@/data/chains";
import { cn } from "@/lib/utils";
import { useZerionNFTs } from "@/hooks/useZerionNFTs";
import { NFTGallery } from "@/components/portfolio/NFTGallery";
import { DeFiPositions } from "@/components/portfolio/DeFiPositions";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useOkxNFTs } from "@/hooks/useOkxNFTs";
import { AccountSummaryCard } from "@/components/portfolio/AccountSummaryCard";
import { PortfolioHoldingsTable } from "@/components/portfolio/PortfolioHoldingsTable";
import { PortfolioAllocationChart } from "@/components/portfolio/PortfolioAllocationChart";
import { okxDexService, WalletTokenBalance } from "@/services/okxdex";
import { usePortfolioPnL } from "@/hooks/usePortfolioPnL";
import { useZerionPortfolio } from "@/hooks/useZerionPortfolio";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { toast } from "sonner";
import { SUPPORTED_CHAINS as CHAIN_DATA } from "@/data/chains";
import { ChainImage } from "@/components/ui/token-image";

// Lazy load chart components
const PortfolioPnLChart = lazy(() => import("@/components/PortfolioPnLChart").then(m => ({ default: m.PortfolioPnLChart })));

const portfolioFeatures = [
  {
    icon: TrendingUp,
    title: "P&L Tracking",
    description: "Track your profit and loss over time with daily snapshots.",
  },
  {
    icon: Wallet,
    title: "Holdings Overview",
    description: "View all your holdings across 25+ chains.",
  },
  {
    icon: PieChart,
    title: "Chain Distribution",
    description: "See how your portfolio is distributed.",
  },
  {
    icon: BarChart3,
    title: "Quick Actions",
    description: "Swap, bridge, and manage directly.",
  },
];

type ChainFilter = 'all-evm' | 'evm-chain' | 'solana';

// EVM chains for selector
const evmChains = getEvmChains();

const Portfolio = memo(function Portfolio() {
  const navigate = useNavigate();
  const { 
    isConnected, 
    activeChainType, 
    activeAddress,
    activeChain,
    setActiveChain, 
    switchChainByIndex,
    isOkxConnected,
    evmAddress,
  } = useMultiWallet();
  const { setGlobalChainFilter } = useExchangeMode();
  const queryClient = useQueryClient();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();
  const { invalidateAllPortfolioData } = useUnifiedData();
  
  // Zerion data for DeFi positions (EVM only)
  const { defiPositions, isLoading: zerionLoading } = useZerionPortfolio();
  const [showDeFi, setShowDeFi] = useState(false);

  // Chain filter state - sync with wallet
  const [chainFilter, setChainFilter] = useState<ChainFilter>(
    activeChainType === 'solana' ? 'solana' : 'all-evm'
  );
  const [selectedEvmChain, setSelectedEvmChain] = useState<Chain | null>(null);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);

  // Portfolio data
  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data source context
  const { isZerionEnabled, isOKXEnabled } = useDataSource();

  // NFT data
  const { 
    collections: zerionNftCollections, 
    totalFloorValue: zerionNftFloorValue,
    totalCount: zerionNftCount,
    isLoading: zerionNftsLoading 
  } = useZerionNFTs();

  const {
    collections: okxNftCollections,
    totalFloorValue: okxNftFloorValue,
    totalCount: okxNftCount,
    isLoading: okxNftsLoading,
  } = useOkxNFTs();

  // Determine which NFT data to use based on data source
  const nftCollections = isZerionEnabled ? zerionNftCollections : (okxNftCollections as any);
  const nftFloorValue = isZerionEnabled ? zerionNftFloorValue : okxNftFloorValue;
  const nftCount = isZerionEnabled ? zerionNftCount : okxNftCount;
  const nftsLoading = isZerionEnabled ? zerionNftsLoading : okxNftsLoading;

  // Sync chain filter with wallet connection changes
  useEffect(() => {
    if (activeChainType === 'solana') {
      setChainFilter('solana');
      setSelectedEvmChain(null);
    } else if (activeChainType === 'evm') {
      if (chainFilter === 'solana') {
        setChainFilter('all-evm');
      }
    }
  }, [activeChainType, chainFilter]);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!activeAddress || !isConnected) {
      setBalances([]);
      setTotalValue(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const chainIndex = activeChain?.chainIndex || '1';
      const result = await okxDexService.getWalletBalances(activeAddress, chainIndex);
      
      if (result.length > 0) {
        setBalances(result);
        const total = result.reduce((sum, b) => {
          return sum + (parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0'));
        }, 0);
        setTotalValue(total);
        
        // Save snapshot for P&L tracking
        await saveSnapshot(total, chainIndex);
      } else {
        setBalances([]);
        setTotalValue(0);
      }
    } catch (err) {
      console.error('[Portfolio] Failed to fetch:', err);
      setError('Failed to load portfolio data');
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, isConnected, activeChain, saveSnapshot]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Get P&L metrics
  const pnlMetrics = useMemo(() => {
    return getPnLMetrics(1);
  }, [getPnLMetrics, totalValue]);

  // Chain balances for allocation chart - format for component
  const chainBalancesForChart = useMemo(() => {
    const grouped: Record<string, number> = {};
    balances.forEach(b => {
      const key = b.chainIndex || '1';
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      grouped[key] = (grouped[key] || 0) + value;
    });
    
    // Convert to the format expected by PortfolioAllocationChart
    return Object.entries(grouped).map(([chainIndex, total]) => {
      const chainInfo = CHAIN_DATA.find(c => c.chainIndex === chainIndex);
      return {
        chain: { 
          name: chainInfo?.name || 'Unknown', 
          shortName: chainInfo?.shortName || chainIndex 
        },
        total,
      };
    }).sort((a, b) => b.total - a.total);
  }, [balances]);

  // Handle chain filter change
  const handleChainFilterChange = useCallback(async (newFilter: ChainFilter, chain?: Chain) => {
    setChainFilter(newFilter);
    setSelectedEvmChain(chain || null);
    setChainSelectorOpen(false);
    
    // Update global chain filter
    if (newFilter === 'solana') {
      setGlobalChainFilter('501');
    } else if (newFilter === 'evm-chain' && chain) {
      setGlobalChainFilter(chain.chainIndex);
    } else {
      setGlobalChainFilter('all-evm');
    }
    
    // Find target chain
    let targetChain: Chain | undefined;
    if (newFilter === 'solana') {
      targetChain = SUPPORTED_CHAINS.find(c => c.chainIndex === '501');
    } else if (newFilter === 'evm-chain' && chain) {
      targetChain = chain;
    } else {
      targetChain = SUPPORTED_CHAINS.find(c => c.chainIndex === '1');
    }
    
    if (!targetChain) return;
    
    setActiveChain(targetChain);
    
    if (isOkxConnected) {
      try {
        setIsSwitching(true);
        await switchChainByIndex(targetChain.chainIndex);
      } catch (err) {
        console.warn('[Portfolio] Chain switch failed:', err);
      } finally {
        setIsSwitching(false);
      }
    }
  }, [setActiveChain, switchChainByIndex, isOkxConnected, setGlobalChainFilter]);

  // Check if wallet is synced
  const isWalletSynced = activeChainType === 'evm' || activeChainType === chainFilter;

  const handleRefresh = useCallback(async () => {
    await invalidateAllPortfolioData();
    await fetchPortfolio();
    toast.success('Portfolio refreshed');
  }, [invalidateAllPortfolioData, fetchPortfolio]);

  // Masked value display
  const displayValue = hideBalances ? '••••••' : `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <Layout>
      <Helmet>
        <title>Account | xlama - Your Crypto Portfolio</title>
        <meta
          name="description"
          content="Manage your cryptocurrency portfolio across 25+ chains. View holdings, track P&L, and access quick actions."
        />
        <link rel="canonical" href="https://xlama.exchange/portfolio" />
      </Helmet>

      <main className="container px-4 sm:px-6 pb-6 sm:pb-8 max-w-2xl mx-auto">
        {/* Connect wallet prompt if not connected */}
        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We recommend <strong className="text-primary">OKX Wallet</strong> for the best multi-chain experience.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Connect to view your portfolio and manage your holdings.
                </p>
                <MultiWalletButton />

                {/* Feature Preview */}
                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {portfolioFeatures.map((feature, index) => (
                      <div
                        key={feature.title}
                        className={`p-3 rounded-lg glass-subtle hover-lift sweep-effect ${STAGGER_ITEM_CLASS}`}
                        style={getStaggerStyle(index, 80)}
                      >
                        <feature.icon className="w-5 h-5 text-primary mb-2" />
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Suspense fallback={<PortfolioSkeleton />}>
            <div className="space-y-4">
              {/* Top Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {/* All EVM Button */}
                  <Button
                    variant={chainFilter === 'all-evm' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleChainFilterChange('all-evm')}
                    disabled={isSwitching}
                    className={cn(
                      "h-8 px-2.5 text-xs gap-1",
                      chainFilter === 'all-evm' && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Cpu className="w-3 h-3" />
                    All EVM
                  </Button>
                  
                  {/* EVM Chain Selector Dropdown */}
                  <Popover open={chainSelectorOpen} onOpenChange={setChainSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={chainFilter === 'evm-chain' ? "default" : "ghost"}
                        size="sm"
                        disabled={isSwitching}
                        className={cn(
                          "h-8 px-2.5 text-xs gap-1",
                          chainFilter === 'evm-chain' && "bg-primary text-primary-foreground"
                        )}
                      >
                        {selectedEvmChain ? (
                          <>
                            <ChainImage 
                              src={selectedEvmChain.icon} 
                              alt={selectedEvmChain.shortName}
                              fallbackText={selectedEvmChain.shortName}
                              className="w-4 h-4"
                            />
                            <span className="hidden xs:inline">{selectedEvmChain.shortName}</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-3 h-3" />
                            Chain
                          </>
                        )}
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-1 max-h-[300px] overflow-hidden" sideOffset={4}>
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-0.5 p-1">
                          {evmChains.slice(0, 20).map((chain) => (
                            <button
                              key={chain.chainIndex}
                              onClick={() => handleChainFilterChange('evm-chain', chain)}
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs hover:bg-accent/50",
                                selectedEvmChain?.chainIndex === chain.chainIndex && "bg-accent"
                              )}
                            >
                              <ChainImage 
                                src={chain.icon} 
                                alt={chain.shortName}
                                fallbackText={chain.shortName}
                                className="w-4 h-4"
                              />
                              <span className="flex-1 truncate">{chain.name}</span>
                              {selectedEvmChain?.chainIndex === chain.chainIndex && (
                                <Check className="w-3 h-3 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                        <ScrollBar orientation="vertical" />
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Solana Button */}
                  <Button
                    variant={chainFilter === 'solana' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleChainFilterChange('solana')}
                    disabled={isSwitching}
                    className={cn(
                      "h-8 px-2.5 text-xs gap-1",
                      chainFilter === 'solana' && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    SOL
                  </Button>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHideBalances(!hideBalances)}
                    className="h-8 w-8"
                  >
                    {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </div>

              {/* Sync Warning */}
              {!isWalletSynced && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Wallet is on a different network</span>
                </div>
              )}

              {/* Account Summary Card */}
              <AccountSummaryCard
                totalValue={hideBalances ? 0 : totalValue}
                change24h={pnlMetrics?.absoluteChange}
                changePercent24h={pnlMetrics?.percentChange}
                chainName={activeChain?.name || 'Ethereum'}
                chainIcon={activeChain?.icon}
                address={activeAddress || ''}
                isLoading={isLoading}
              />

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="h-12 flex-col gap-1 glass-subtle hover-lift"
                  onClick={() => navigate('/swap')}
                >
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                  <span className="text-xs">Swap</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-col gap-1 glass-subtle hover-lift"
                  onClick={() => navigate('/bridge')}
                >
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs">Bridge</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-col gap-1 glass-subtle hover-lift"
                  onClick={() => navigate('/orders')}
                >
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-xs">Orders</span>
                </Button>
              </div>

              {/* Holdings List - Inline */}
              <Card className="glass border-border/50">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <h3 className="font-medium flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      Holdings
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {balances.length} tokens
                    </Badge>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <PortfolioHoldingsTable 
                      balances={balances} 
                      isLoading={isLoading}
                      className="border-0 shadow-none"
                    />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Allocation Chart - Collapsible */}
              <Collapsible open={showChart} onOpenChange={setShowChart}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
                    <span className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-primary" />
                      Chain Distribution
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      showChart && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <PortfolioAllocationChart 
                    chainBalances={chainBalancesForChart}
                    totalValue={totalValue}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Performance Chart - Collapsible */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Performance History
                    </span>
                    <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Card className="glass border-border/50">
                    <CardContent className="pt-4">
                      <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                        <PortfolioPnLChart />
                      </Suspense>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* DeFi Positions - Collapsible (EVM only) */}
              {isZerionEnabled && activeChainType === 'evm' && (
                <Collapsible open={showDeFi} onOpenChange={setShowDeFi}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        DeFi Positions
                        {defiPositions.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {defiPositions.length}
                          </Badge>
                        )}
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        showDeFi && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <DeFiPositions 
                      positions={defiPositions}
                      isLoading={zerionLoading}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* NFTs - Collapsible (always show section) */}
              <Collapsible open={showNFTs} onOpenChange={setShowNFTs}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
                    <span className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-primary" />
                      NFTs
                      {nftCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {nftCount}
                        </Badge>
                      )}
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      showNFTs && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <NFTGallery 
                    collections={nftCollections || []}
                    isLoading={nftsLoading}
                    totalFloorValue={nftFloorValue}
                    totalCount={nftCount}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Error state */}
              {error && (
                <Card className="glass border-destructive/20">
                  <CardContent className="py-4 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </Suspense>
        )}
      </main>
    </Layout>
  );
});

export default Portfolio;
