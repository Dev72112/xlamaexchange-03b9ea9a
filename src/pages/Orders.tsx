import { memo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent } from "@/components/ui/card";
import { ListOrdered, TrendingUp, Clock, ArrowRightLeft, Wallet } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { OrdersSkeleton } from "@/components/skeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

// Lazy load order components from feature modules
const ActiveLimitOrders = lazy(() => import("@/features/orders").then(m => ({ default: m.ActiveLimitOrders })));
const ActiveDCAOrders = lazy(() => import("@/features/orders").then(m => ({ default: m.ActiveDCAOrders })));
const DexTransactionHistory = lazy(() => import("@/components/DexTransactionHistory").then(m => ({ default: m.DexTransactionHistory })));

const ordersFeatures = [
  {
    icon: TrendingUp,
    title: "Limit Orders",
    description: "Set price targets and automatically execute trades when conditions are met.",
  },
  {
    icon: Clock,
    title: "DCA Schedules",
    description: "Automate your investing with scheduled recurring purchases.",
  },
  {
    icon: ArrowRightLeft,
    title: "Transaction History",
    description: "View all your past trades with detailed execution information.",
  },
  {
    icon: ListOrdered,
    title: "Order Management",
    description: "Monitor, modify, or cancel your active orders anytime.",
  },
];

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
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <ListOrdered className="w-4 h-4" />
            <span>Order Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Your Orders
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Manage limit orders, DCA schedules, and view your transaction history. 
            All orders are monitored 24/7 with instant notifications.
          </p>
        </div>

        {/* Connect wallet prompt if not connected */}
        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
                  <ListOrdered className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We recommend <strong className="text-primary">OKX Wallet</strong> for the best multi-chain experience.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Connect to view and manage your orders, DCA schedules, and transaction history.
                </p>
                <MultiWalletButton />

                {/* Feature Preview */}
                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ordersFeatures.map((feature, index) => (
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
          <Suspense fallback={<OrdersSkeleton />}>
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* Order Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-border/50 hover-lift transition-all sweep-effect shadow-premium-hover">
                  <CardContent className="pt-4 pb-4 text-center">
                    <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Limit Orders</p>
                    <p className="text-lg font-bold">Active</p>
                  </CardContent>
                </Card>
                <Card className="glass border-border/50 hover-lift transition-all sweep-effect shadow-premium-hover">
                  <CardContent className="pt-4 pb-4 text-center">
                    <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">DCA Orders</p>
                    <p className="text-lg font-bold">Scheduled</p>
                  </CardContent>
                </Card>
                <Card className="glass border-border/50 hover-lift transition-all sweep-effect shadow-premium-hover">
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
          </Suspense>
        )}
      </main>
    </Layout>
  );
});

export default Orders;
