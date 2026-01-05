import { memo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered, TrendingUp, Clock, ArrowRightLeft, Wallet } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/components/wallet/MultiWalletButton";

// Lazy load order components
const ActiveLimitOrders = lazy(() => import("@/components/ActiveLimitOrders").then(m => ({ default: m.ActiveLimitOrders })));
const ActiveDCAOrders = lazy(() => import("@/components/ActiveDCAOrders").then(m => ({ default: m.ActiveDCAOrders })));
const DexTransactionHistory = lazy(() => import("@/components/DexTransactionHistory").then(m => ({ default: m.DexTransactionHistory })));

const Orders = memo(function Orders() {
  const { isConnected } = useMultiWallet();

  return (
    <Layout>
      <Helmet>
        <title>Orders | xlama - Manage Limit & DCA Orders</title>
        <meta
          name="description"
          content="Manage your limit orders and DCA (Dollar Cost Averaging) orders. View active orders, order history, and track execution status."
        />
        <meta property="og:title" content="Orders | xlama" />
        <meta property="og:description" content="Manage your limit orders and DCA orders. Track execution status and view order history." />
        <link rel="canonical" href="https://xlama.exchange/orders" />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <ListOrdered className="w-4 h-4" />
            <span>Order Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Your Orders
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Manage limit orders, DCA schedules, and view your transaction history. 
            All orders are monitored 24/7 with instant notifications.
          </p>
        </div>

        {/* Connect wallet prompt if not connected */}
        {!isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Connect your wallet to view and manage your orders, DCA schedules, and transaction history.
              </p>
              <MultiWalletButton />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Order Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-card/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Limit Orders</p>
                  <p className="text-lg font-bold">Active</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">DCA Orders</p>
                  <p className="text-lg font-bold">Scheduled</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <ArrowRightLeft className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">History</p>
                  <p className="text-lg font-bold">View All</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Limit Orders */}
            <section id="limit-orders" className="scroll-mt-20">
              <Suspense fallback={<div className="h-24 skeleton-shimmer rounded-lg" />}>
                <ActiveLimitOrders />
              </Suspense>
            </section>

            {/* Active DCA Orders */}
            <section id="dca-orders" className="scroll-mt-20">
              <Suspense fallback={<div className="h-24 skeleton-shimmer rounded-lg" />}>
                <ActiveDCAOrders />
              </Suspense>
            </section>

            {/* Transaction History */}
            <section id="history" className="scroll-mt-20">
              <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                <DexTransactionHistory />
              </Suspense>
            </section>
          </div>
        )}
      </main>
    </Layout>
  );
});

export default Orders;
