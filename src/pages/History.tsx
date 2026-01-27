import { memo, Suspense, lazy } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LayoutList, Link2, LineChart, Wallet } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { TransactionCardsSkeleton } from "@/components/ContentSkeletons";
import { useTabPersistence } from "@/hooks/useTabPersistence";

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

const History = memo(function History() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('history', 'app');

  return (
    <AppLayout>
      <Helmet>
        <title>Transaction History - xlama</title>
        <meta name="description" content="View your cryptocurrency exchange transaction history." />
      </Helmet>

      <div className="container px-4 pb-12 sm:pb-16 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
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
        </div>

        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
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
                      <div key={feature.title} className={`p-3 rounded-lg glass-subtle hover-lift sweep-effect ${STAGGER_ITEM_CLASS}`} style={getStaggerStyle(index, 80)}>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10 mb-6">
              <TabsTrigger value="app" className="gap-1.5 text-xs">
                <LayoutList className="w-3.5 h-3.5" />
                App History
              </TabsTrigger>
              <TabsTrigger value="onchain" className="gap-1.5 text-xs">
                <Link2 className="w-3.5 h-3.5" />
                On-Chain
              </TabsTrigger>
              <TabsTrigger value="xlama" className="gap-1.5 text-xs">
                <LineChart className="w-3.5 h-3.5" />
                xLama
              </TabsTrigger>
            </TabsList>

            <TabsContent value="app" className="mt-0">
              <Suspense fallback={<TransactionCardsSkeleton />}>
                <AppHistoryTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="onchain" className="mt-0">
              <Suspense fallback={<TransactionCardsSkeleton />}>
                <OnchainHistoryTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="xlama" className="mt-0">
              <Suspense fallback={<TransactionCardsSkeleton />}>
                <XlamaHistoryTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
});

export default History;
