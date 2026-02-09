import { memo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { GlowBar } from "@/components/ui/glow-bar";
import { Wallet, Zap, LineChart, TrendingUp, Search, ArrowRightLeft, HelpCircle, Layers } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { PortfolioSkeleton } from "@/components/skeletons";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { SwipeableTabs, TabItem } from "@/components/ui/swipeable-tabs";
import { EducationCollapsible } from "@/components/EducationCollapsible";
import { motion, AnimatePresence } from "framer-motion";

// Lazy load tab components
const OkxPortfolioTab = lazy(() => import("@/components/portfolio/tabs/OkxPortfolioTab"));
const XlamaPortfolioTab = lazy(() => import("@/components/portfolio/tabs/XlamaPortfolioTab"));

const portfolioFeatures = [
  { icon: Zap, title: "OKX DEX", description: "Multi-chain token balances across 25+ EVM chains." },
  { icon: LineChart, title: "xLama API", description: "Unified analytics with OKX fallback." },
  { icon: Wallet, title: "Quick Actions", description: "Swap, bridge, and manage directly." },
];

const portfolioSteps = [
  { icon: Wallet, title: "View Holdings", description: "See all tokens across 25+ chains in one place." },
  { icon: TrendingUp, title: "Track Value", description: "Real-time USD values and 24h changes." },
  { icon: Search, title: "Search & Filter", description: "Find specific tokens or hide dust (<$1)." },
  { icon: ArrowRightLeft, title: "Quick Actions", description: "Swap or bridge directly from your holdings." },
];

const portfolioTips = [
  "Click any token to swap it directly",
  "Use the dust filter to hide small balances",
  "OKX tab is faster, xLama provides unified analytics",
];

const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const Portfolio = memo(function Portfolio() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('portfolio', 'okx');

  const tabs: TabItem[] = [
    {
      value: 'okx',
      label: 'OKX',
      icon: <Zap className="w-3.5 h-3.5" />,
      content: (
        <AnimatePresence mode="wait">
          <motion.div key="okx" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<PortfolioSkeleton />}>
              <OkxPortfolioTab />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      ),
    },
    {
      value: 'xlama',
      label: 'xLama',
      icon: <LineChart className="w-3.5 h-3.5" />,
      content: (
        <AnimatePresence mode="wait">
          <motion.div key="xlama" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<PortfolioSkeleton />}>
              <XlamaPortfolioTab />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      ),
    },
  ];

  return (
    <AppLayout>
      <Helmet>
        <title>Account | xlama - Your Crypto Portfolio</title>
        <meta name="description" content="Manage your cryptocurrency portfolio across 25+ chains. View holdings, track P&L, and access quick actions." />
        <link rel="canonical" href="https://xlama.exchange/portfolio" />
      </Helmet>

      <main className="container px-4 sm:px-6 pb-8 sm:pb-12 max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl 3xl:max-w-7xl mx-auto relative">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Consistent Header - More breathing room */}
        <motion.div 
          className="text-center mb-6 sm:mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <Wallet className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Portfolio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 gradient-text">Your Portfolio</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Track holdings across 25+ chains
          </p>
        </motion.div>
        {!isConnected ? (
          <motion.div 
            className="max-w-xl mx-auto"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated overflow-hidden">
              <GlowBar variant="multi" />
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

                {/* What you'll get access to */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-4">What you'll get access to:</p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <Card className="glass-subtle border-border/50 transition-all duration-200 active:scale-[0.98] md:hover:shadow-lg md:hover:border-primary/20">
                      <CardContent className="p-3 text-center">
                        <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Multi-Chain</h4>
                        <p className="text-xs text-muted-foreground">Holdings across 25+ chains</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50 transition-all duration-200 active:scale-[0.98] md:hover:shadow-lg md:hover:border-primary/20">
                      <CardContent className="p-3 text-center">
                        <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Live Prices</h4>
                        <p className="text-xs text-muted-foreground">Real-time USD values</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50 transition-all duration-200 active:scale-[0.98] md:hover:shadow-lg md:hover:border-primary/20">
                      <CardContent className="p-3 text-center">
                        <Search className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Smart Search</h4>
                        <p className="text-xs text-muted-foreground">Find any token instantly</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50 transition-all duration-200 active:scale-[0.98] md:hover:shadow-lg md:hover:border-primary/20">
                      <CardContent className="p-3 text-center">
                        <ArrowRightLeft className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Quick Trade</h4>
                        <p className="text-xs text-muted-foreground">Swap directly from holdings</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Education for disconnected state */}
            <div className="mt-3">
              <EducationCollapsible
                title="How Portfolio Works"
                icon={HelpCircle}
                steps={portfolioSteps}
                tips={portfolioTips}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <SwipeableTabs
              tabs={tabs}
              value={activeTab}
              onValueChange={setActiveTab}
              listClassName="grid grid-cols-2 h-10 mb-4"
              triggerClassName="gap-1.5 text-xs"
              showSwipeHint
              swipeHintKey="portfolio"
            />
            
            {/* Education collapsible for connected state */}
            <EducationCollapsible
              title="How Portfolio Works"
              icon={HelpCircle}
              steps={portfolioSteps}
              tips={portfolioTips}
            />
          </motion.div>
        )}
      </main>
    </AppLayout>
  );
});

export default Portfolio;