import { memo, Suspense, lazy } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LayoutList, Link2, LineChart } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { TransactionCardsSkeleton } from "@/components/ContentSkeletons";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { SwipeableTabs, TabItem } from "@/components/ui/swipeable-tabs";
import { GlowBar } from "@/components/ui/glow-bar";
import { motion, AnimatePresence } from "framer-motion";

// Lazy load tab components
const AppHistoryTab = lazy(() => import("@/components/history/tabs/AppHistoryTab"));
const OnchainHistoryTab = lazy(() => import("@/components/history/tabs/OnchainHistoryTab"));
const XlamaHistoryTab = lazy(() => import("@/components/history/tabs/XlamaHistoryTab"));

const historyFeatures = [
  { icon: LayoutList, title: "App History", description: "Local DEX swaps, bridges, and instant exchanges." },
  { icon: Link2, title: "On-Chain", description: "Transaction history from OKX API." },
  { icon: LineChart, title: "xLama", description: "Unified transaction feed with analytics." },
  { icon: Clock, title: "Real-time", description: "Track pending and completed transactions." },
];

const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const History = memo(function History() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('history', 'app');

  const tabs: TabItem[] = [
    {
      value: 'app',
      label: 'App History',
      icon: <LayoutList className="w-3.5 h-3.5" />,
      content: (
        <AnimatePresence mode="wait">
          <motion.div key="app" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<TransactionCardsSkeleton />}>
              <AppHistoryTab />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      ),
    },
    {
      value: 'onchain',
      label: 'On-Chain',
      icon: <Link2 className="w-3.5 h-3.5" />,
      content: (
        <AnimatePresence mode="wait">
          <motion.div key="onchain" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
            <Suspense fallback={<TransactionCardsSkeleton />}>
              <OnchainHistoryTab />
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
            <Suspense fallback={<TransactionCardsSkeleton />}>
              <XlamaHistoryTab />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      ),
    },
  ];

  return (
    <AppLayout>
      <Helmet>
        <title>Transaction History - xlama</title>
        <meta name="description" content="View your cryptocurrency exchange transaction history." />
      </Helmet>

      <div className="container px-4 pb-12 sm:pb-16 max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8 flex items-start justify-between flex-wrap gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent rounded-2xl blur-xl" />
            <div className="relative flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl glass border border-primary/20 glow-sm">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Transaction History</h1>
            </div>
            <p className="text-muted-foreground relative">
              Your cryptocurrency exchanges and on-chain transactions.
            </p>
          </div>
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
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect to view your transaction history.
                </p>
                <MultiWalletButton />

                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {historyFeatures.map((feature, index) => (
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
              listClassName="grid grid-cols-3 h-10 mb-6"
              triggerClassName="gap-1.5 text-xs"
              showSwipeHint
              swipeHintKey="history"
            />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
});

export default History;