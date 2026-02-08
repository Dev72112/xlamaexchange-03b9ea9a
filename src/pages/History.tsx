import { memo, Suspense, lazy } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LayoutList, Link2, LineChart, Filter, Download, HelpCircle } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { TransactionCardsSkeleton } from "@/components/ContentSkeletons";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { SwipeableTabs, TabItem } from "@/components/ui/swipeable-tabs";
import { GlowBar } from "@/components/ui/glow-bar";
import { EducationCollapsible } from "@/components/EducationCollapsible";
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

const historySteps = [
  { icon: LayoutList, title: "App History", description: "Swaps, bridges, and exchanges from this app." },
  { icon: Link2, title: "On-Chain", description: "All wallet transactions from the blockchain." },
  { icon: Filter, title: "Filter & Search", description: "Filter by chain, token, date, or status." },
  { icon: Download, title: "Export Data", description: "Download your history as CSV for records." },
];

const historyTips = [
  "App History shows only transactions made through this app",
  "On-Chain shows all transactions from your connected wallet",
  "Use the export button to download transaction history",
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

      <div className="container px-4 pb-12 sm:pb-16 max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1600px] mx-auto relative">
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
            <Clock className="w-4 h-4" />
            <span>Transaction History</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">Transaction History</h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
            Your cryptocurrency exchanges and on-chain transactions.
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
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect to view your transaction history.
                </p>
                <MultiWalletButton />

                {/* What you'll get access to */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-4">What you'll get access to:</p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <LayoutList className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Full History</h4>
                        <p className="text-xs text-muted-foreground">All your app transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <Link2 className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">On-Chain</h4>
                        <p className="text-xs text-muted-foreground">Blockchain transaction data</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <Download className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Export</h4>
                        <p className="text-xs text-muted-foreground">Download history as CSV</p>
                      </CardContent>
                    </Card>
                    <Card className="glass-subtle border-border/50">
                      <CardContent className="pt-4 pb-4 text-center">
                        <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                        <h4 className="font-medium text-sm">Real-Time</h4>
                        <p className="text-xs text-muted-foreground">Live status updates</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Education for disconnected state */}
            <div className="mt-4">
              <EducationCollapsible
                title="How History Works"
                icon={HelpCircle}
                steps={historySteps}
                tips={historyTips}
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
              listClassName="grid grid-cols-3 h-10 mb-6"
              triggerClassName="gap-1.5 text-xs"
              showSwipeHint
              swipeHintKey="history"
            />
            
            {/* Education collapsible for connected state */}
            <EducationCollapsible
              title="How History Works"
              icon={HelpCircle}
              steps={historySteps}
              tips={historyTips}
            />
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
});

export default History;