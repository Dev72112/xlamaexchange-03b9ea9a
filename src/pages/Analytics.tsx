import { memo, Suspense, lazy, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Zap, LineChart, TrendingUp, HelpCircle } from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { MultiWalletButton } from '@/features/wallet';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { SwipeableTabs, TabItem } from '@/components/ui/swipeable-tabs';
import { GlowBar } from '@/components/ui/glow-bar';
import { EducationCollapsible } from '@/components/EducationCollapsible';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load tab components
const OkxAnalyticsTab = lazy(() => import('@/components/analytics/tabs/OkxAnalyticsTab'));
const XlamaAnalyticsTab = lazy(() => import('@/components/analytics/tabs/XlamaAnalyticsTab'));

const analyticsSteps = [
  { icon: BarChart3, title: "View Metrics", description: "See your trading volume, P&L, and success rate." },
  { icon: TrendingUp, title: "Track Patterns", description: "Discover when you trade most and which chains." },
  { icon: Zap, title: "Gas Analytics", description: "Monitor gas spending across different chains." },
  { icon: LineChart, title: "Performance", description: "Compare your performance over time." },
];

const analyticsTips = [
  "Data updates automatically as you trade",
  "OKX tab shows local transaction data, xLama shows server-synced data",
  "Use chain filters to focus on specific networks",
];

const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const Analytics = memo(function Analytics() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('analytics', 'okx');

  const tabs: TabItem[] = [
    {
      value: 'okx',
      label: 'OKX',
      icon: <Zap className="w-3.5 h-3.5" />,
      content: (
        <AnimatePresence mode="wait">
          <motion.div key="okx" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<AnalyticsSkeleton />}>
              <OkxAnalyticsTab />
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
            <Suspense fallback={<AnalyticsSkeleton />}>
              <XlamaAnalyticsTab />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      ),
    },
  ];

  return (
    <AppLayout>
      <Helmet>
        <title>Trading Analytics | xlama</title>
        <meta name="description" content="View your trading analytics, volume history, and performance metrics." />
      </Helmet>

      <div className="container px-4 pb-8 sm:pb-12 max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1600px] mx-auto relative">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Header - More breathing room */}
        <motion.div 
          className="text-center mb-6 sm:mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <BarChart3 className="w-4 h-4" />
            <span>Trading Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">Trading Analytics</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Track your trading performance and patterns across all chains
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
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect to view your trading analytics.
                </p>
                <MultiWalletButton />
                
                {/* What you'll get access to */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-4">What you'll get access to:</p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Volume Tracking</h4>
                        <p className="text-xs text-muted-foreground">Total trade volume across chains</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">P&L Analytics</h4>
                        <p className="text-xs text-muted-foreground">Profit and loss over time</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Gas Insights</h4>
                        <p className="text-xs text-muted-foreground">Gas spending breakdown</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <LineChart className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Performance</h4>
                        <p className="text-xs text-muted-foreground">Win rate and trade patterns</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Education for disconnected state */}
            <div className="mt-4">
              <EducationCollapsible
                title="How Analytics Work"
                icon={HelpCircle}
                steps={analyticsSteps}
                tips={analyticsTips}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <SwipeableTabs
              tabs={tabs}
              value={activeTab}
              onValueChange={setActiveTab}
              listClassName="grid grid-cols-2 h-10 mb-6"
              triggerClassName="gap-1.5 text-xs"
              showSwipeHint
              swipeHintKey="analytics"
            />
            
            {/* Education collapsible for connected state */}
            <EducationCollapsible
              title="How Analytics Work"
              icon={HelpCircle}
              steps={analyticsSteps}
              tips={analyticsTips}
            />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
});

export default Analytics;