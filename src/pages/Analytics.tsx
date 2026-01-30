import { memo, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Zap, LineChart } from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { MultiWalletButton } from '@/features/wallet';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { SwipeableTabs, TabItem } from '@/components/ui/swipeable-tabs';
import { GlowBar } from '@/components/ui/glow-bar';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load tab components
const OkxAnalyticsTab = lazy(() => import('@/components/analytics/tabs/OkxAnalyticsTab'));
const XlamaAnalyticsTab = lazy(() => import('@/components/analytics/tabs/XlamaAnalyticsTab'));

const analyticsFeatures = [
  { icon: Zap, title: "OKX Analytics", description: "Trading volume and gas analytics from local transactions." },
  { icon: LineChart, title: "xLama Analytics", description: "Unified metrics: Realized PnL, Success Rate." },
  { icon: BarChart3, title: "Trading Patterns", description: "Discover when you trade the most." },
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
          className="text-center mb-10 sm:mb-14"
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

                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {analyticsFeatures.map((feature, index) => (
                      <motion.div 
                        key={feature.title} 
                        className={`p-3 rounded-lg glass-subtle hover-lift sweep-effect ${STAGGER_ITEM_CLASS}`} 
                        style={getStaggerStyle(index, 80)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <feature.icon className="w-5 h-5 text-primary mb-2" />
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
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
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
});

export default Analytics;