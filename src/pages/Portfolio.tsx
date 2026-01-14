import { memo, Suspense, lazy, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, PieChart, BarChart3 } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { PortfolioOverview, PortfolioRebalancer } from "@/features/portfolio";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { PortfolioSkeleton } from "@/components/skeletons";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useScrollReveal, getScrollRevealClass } from "@/hooks/useScrollReveal";

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

const Portfolio = memo(function Portfolio() {
  const { isConnected } = useMultiWallet();
  const queryClient = useQueryClient();

  // Scroll reveal hooks
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: contentRef, isVisible: contentVisible } = useScrollReveal<HTMLDivElement>();

  const handleRefresh = useCallback(async () => {
    // Invalidate portfolio-related queries
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    await queryClient.invalidateQueries({ queryKey: ['token-balances'] });
    await queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
  }, [queryClient]);

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
          <PullToRefresh onRefresh={handleRefresh} showSkeleton={false}>
            <Suspense fallback={<PortfolioSkeleton />}>
              <div className="space-y-8 max-w-4xl mx-auto">
              {/* Portfolio Overview with P&L Chart */}
              <section id="overview" className="scroll-mt-20">
                <PortfolioOverview />
              </section>

              {/* Standalone P&L Chart section */}
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
        </PullToRefresh>
        )}
      </main>
    </Layout>
  );
});

export default Portfolio;
