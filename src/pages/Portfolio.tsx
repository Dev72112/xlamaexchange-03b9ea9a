import { memo, Suspense, lazy, useCallback, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, PieChart, BarChart3, Layers, Zap, AlertTriangle, Image } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { MultiWalletButton } from "@/features/wallet";
import { PortfolioOverview, PortfolioRebalancer } from "@/features/portfolio";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { PortfolioSkeleton } from "@/components/skeletons";
import { useQueryClient } from "@tanstack/react-query";
import { useScrollReveal, getScrollRevealClass } from "@/hooks/useScrollReveal";
import { SUPPORTED_CHAINS } from "@/data/chains";
import { cn } from "@/lib/utils";
import { useZerionPortfolio } from "@/hooks/useZerionPortfolio";
import { useZerionNFTs } from "@/hooks/useZerionNFTs";
import { DeFiPositions } from "@/components/portfolio/DeFiPositions";
import { NFTGallery } from "@/components/portfolio/NFTGallery";
import { PnLBreakdown } from "@/components/portfolio/PnLBreakdown";
import { DataSourceToggle } from "@/components/ui/DataSourceToggle";
import { useDataSource } from "@/contexts/DataSourceContext";
import { useOkxNFTs } from "@/hooks/useOkxNFTs";
// Lazy load chart components
const PortfolioPnLChart = lazy(() => import("@/features/portfolio").then(m => ({ default: m.PortfolioPnLChart })));
const portfolioFeatures = [
  {
    icon: TrendingUp,
    title: "P&L Tracking",
    description: "Track your profit and loss over time with daily snapshots and historical charts.",
  },
  {
    icon: Wallet,
    title: "Holdings Overview",
    description: "View all your holdings across 25+ chains with real-time USD values.",
  },
  {
    icon: PieChart,
    title: "Chain Distribution",
    description: "See how your portfolio is distributed across different blockchains.",
  },
  {
    icon: BarChart3,
    title: "Rebalancing",
    description: "Set target allocations and get recommendations to optimize your portfolio.",
  },
];

type ChainFilter = 'evm' | 'solana';

const chainFilterOptions: { value: ChainFilter; label: string; description: string; icon?: React.ReactNode }[] = [
  { value: 'evm', label: 'EVM', description: 'ETH, BSC, Polygon, etc.' },
  { value: 'solana', label: 'Solana', description: 'SOL & SPL tokens', icon: <Zap className="w-3 h-3" /> },
];

const Portfolio = memo(function Portfolio() {
  const { 
    isConnected, 
    activeChainType, 
    setActiveChain, 
    switchChainByIndex,
    isOkxConnected,
    evmAddress,
  } = useMultiWallet();
  const { setGlobalChainFilter } = useExchangeMode();
  const queryClient = useQueryClient();

  // Chain filter state - sync with wallet
  const [chainFilter, setChainFilter] = useState<ChainFilter>(
    activeChainType === 'solana' ? 'solana' : 'evm'
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'defi' | 'nfts'>('holdings');

  // Data source context
  const { dataSource, isZerionEnabled, isOKXEnabled } = useDataSource();

  // Zerion data hooks - uses activeAddress from context internally
  const { 
    defiPositions, 
    pnl: zerionPnL, 
    isLoading: zerionLoading 
  } = useZerionPortfolio();
  
  const { 
    collections: zerionNftCollections, 
    totalFloorValue: zerionNftFloorValue,
    totalCount: zerionNftCount,
    isLoading: zerionNftsLoading 
  } = useZerionNFTs();

  // OKX NFT data
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

  // Only show Zerion DeFi data for EVM chains when Zerion enabled
  const showZerionData = isZerionEnabled && chainFilter === 'evm' && !!evmAddress;
  const showOkxData = isOKXEnabled;

  // Sync chain filter with wallet connection changes
  useEffect(() => {
    if (activeChainType === 'solana') {
      setChainFilter('solana');
    } else if (activeChainType === 'evm') {
      setChainFilter('evm');
    }
  }, [activeChainType]);

  // Handle chain filter change
  const handleChainFilterChange = useCallback(async (newFilter: ChainFilter) => {
    setChainFilter(newFilter);
    
    // Update global chain filter
    if (newFilter === 'solana') {
      setGlobalChainFilter('501');
    } else {
      setGlobalChainFilter('all-evm');
    }
    
    // Find target chain
    const targetChain = newFilter === 'solana'
      ? SUPPORTED_CHAINS.find(c => c.chainIndex === '501')
      : SUPPORTED_CHAINS.find(c => c.chainIndex === '1');
    
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
  const isWalletSynced = activeChainType === chainFilter || 
    (chainFilter === 'evm' && activeChainType !== 'solana' && activeChainType !== 'tron' && activeChainType !== 'sui' && activeChainType !== 'ton');

  // Scroll reveal hooks
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal<HTMLDivElement>();

  const handleRefresh = useCallback(async () => {
    // Invalidate portfolio-related queries
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    await queryClient.invalidateQueries({ queryKey: ['token-balances'] });
    await queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
    await queryClient.invalidateQueries({ queryKey: ['zerion-portfolio'] });
    await queryClient.invalidateQueries({ queryKey: ['zerion'] });
  }, [queryClient]);

  // Counts for tabs
  const defiCount = defiPositions?.length || 0;
  const nftCountDisplay = nftCount || 0;

  return (
    <Layout>
      <Helmet>
        <title>Portfolio Dashboard | xlama - Track Your Crypto Holdings</title>
        <meta
          name="description"
          content="Track your cryptocurrency portfolio across 25+ chains. View P&L history, holdings breakdown, chain distribution, and get rebalancing recommendations."
        />
        <meta property="og:title" content="Portfolio Dashboard | xlama" />
        <meta property="og:description" content="Track your crypto portfolio with P&L tracking, holdings overview, and rebalancing tools." />
        <link rel="canonical" href="https://xlama.exchange/portfolio" />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header with scroll reveal */}
        <div 
          ref={headerRef}
          className={`text-center mb-8 sm:mb-12 ${getScrollRevealClass(headerVisible, 'slide-up')}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4" data-tour="portfolio-link">
            <Wallet className="w-4 h-4" />
            <span>Portfolio Dashboard</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Portfolio Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Track your crypto holdings across 25+ chains, monitor P&L performance, and optimize your portfolio 
            with intelligent rebalancing recommendations.
          </p>
        </div>

        {/* Connect wallet prompt if not connected */}
        {!isConnected ? (
          <div ref={contentRef} className={`max-w-xl mx-auto ${getScrollRevealClass(contentVisible, 'scale')}`}>
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
                  Connect to view your portfolio, track P&L, and access rebalancing tools.
                </p>
                <MultiWalletButton />

                {/* Feature Preview */}
                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-8 max-w-4xl mx-auto">
                {/* Chain Filter Toggle with Data Source */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1 p-1 rounded-lg glass border border-border/50">
                      <Layers className="w-4 h-4 text-muted-foreground ml-2" />
                    {chainFilterOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={chainFilter === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleChainFilterChange(option.value)}
                        disabled={isSwitching}
                        className={cn(
                          "h-8 px-3 text-xs gap-1.5",
                          chainFilter === option.value && "bg-primary text-primary-foreground"
                        )}
                      >
                        {option.icon}
                        {option.label}
                        {chainFilter === option.value && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary-foreground/20">
                            Active
                          </Badge>
                        )}
                      </Button>
                      ))}
                    </div>
                    
                    {/* Data Source Toggle */}
                    <DataSourceToggle compact />
                  </div>

                  {/* Connection Indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isWalletSynced ? 'bg-success animate-pulse' : 'bg-warning'
                    )} />
                    <span>
                      Viewing <span className="font-medium text-foreground">
                        {chainFilter === 'solana' ? 'Solana' : 'EVM'} Portfolio
                      </span>
                    </span>
                  </div>
                  
                  {!isWalletSynced && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Wallet is on a different network</span>
                    </div>
                  )}
                </div>

                {/* Tabbed Content for Holdings, DeFi, NFTs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'holdings' | 'defi' | 'nfts')} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 glass border border-border/50">
                    <TabsTrigger value="holdings" className="gap-2">
                      <Wallet className="h-4 w-4" />
                      Holdings
                    </TabsTrigger>
                    <TabsTrigger value="defi" className="gap-2" disabled={!showZerionData}>
                      <Layers className="h-4 w-4" />
                      DeFi
                      {showZerionData && defiCount > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {defiCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="nfts" className="gap-2" disabled={!showZerionData}>
                      <Image className="h-4 w-4" />
                      NFTs
                      {showZerionData && nftCountDisplay > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {nftCountDisplay}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Holdings Tab */}
                  <TabsContent value="holdings" className="space-y-6 mt-6">
                    {/* Portfolio Overview */}
                    <section id="overview" className="scroll-mt-20">
                      <PortfolioOverview />
                    </section>

                    {/* P&L Breakdown from Zerion (EVM only) */}
                    {showZerionData && (
                      <section id="pnl-breakdown" className="scroll-mt-20">
                        <PnLBreakdown pnl={zerionPnL} isLoading={zerionLoading} />
                      </section>
                    )}

                    {/* Performance History Chart */}
                    <section id="pnl" className="scroll-mt-20">
                      <Card className="glass glow-sm border-border/50 sweep-effect glow-border-animated">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center glow-sm">
                              <TrendingUp className="w-4 h-4 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold">Performance History</h2>
                          </div>
                          <Suspense fallback={<div className="h-64 skeleton-shimmer rounded-lg" />}>
                            <PortfolioPnLChart />
                          </Suspense>
                        </CardContent>
                      </Card>
                    </section>

                    {/* Portfolio Rebalancer */}
                    <section id="rebalancer" className="scroll-mt-20 max-w-xl mx-auto">
                      <PortfolioRebalancer />
                    </section>
                  </TabsContent>

                  {/* DeFi Positions Tab */}
                  <TabsContent value="defi" className="mt-6">
                    {showZerionData ? (
                      <DeFiPositions 
                        positions={defiPositions || []} 
                        isLoading={zerionLoading} 
                      />
                    ) : (
                      <Card className="glass-card">
                        <CardContent className="py-12 text-center">
                          <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                          <p className="text-muted-foreground">DeFi positions are available for EVM chains only</p>
                          <p className="text-sm text-muted-foreground mt-1">Switch to EVM to view your DeFi positions</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* NFTs Tab */}
                  <TabsContent value="nfts" className="mt-6">
                    {showZerionData ? (
                      <NFTGallery 
                        collections={nftCollections || []} 
                        totalFloorValue={nftFloorValue || 0}
                        totalCount={nftCountDisplay}
                        isLoading={nftsLoading}
                      />
                    ) : (
                      <Card className="glass-card">
                        <CardContent className="py-12 text-center">
                          <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                          <p className="text-muted-foreground">NFT gallery is available for EVM chains only</p>
                          <p className="text-sm text-muted-foreground mt-1">Switch to EVM to view your NFT collection</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Tips Section */}
                <section className="mt-8">
                  <Card className="glass-subtle border-border/50 sweep-effect">
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Portfolio Tips
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Daily snapshots are saved automatically when you view your portfolio.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Use the rebalancer to set target allocations and maintain your strategy.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Export your P&L history as CSV for tax reporting or external analysis.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Connect multiple wallets to see your combined portfolio across all addresses.</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </section>
              </div>
          </Suspense>
        )}
      </main>
    </Layout>
  );
});

export default Portfolio;
