import { memo, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Zap, Layers, LineChart, Wallet } from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { MultiWalletButton } from '@/features/wallet';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { AnalyticsSkeleton } from '@/components/skeletons';
import { useTabPersistence } from '@/hooks/useTabPersistence';

// Lazy load tab components
const OkxAnalyticsTab = lazy(() => import('@/components/analytics/tabs/OkxAnalyticsTab'));
const ZerionAnalyticsTab = lazy(() => import('@/components/analytics/tabs/ZerionAnalyticsTab'));
const XlamaAnalyticsTab = lazy(() => import('@/components/analytics/tabs/XlamaAnalyticsTab'));

const analyticsFeatures = [
  { icon: Zap, title: "OKX Analytics", description: "Trading volume and gas analytics from local transactions." },
  { icon: Layers, title: "Zerion Analytics", description: "Protocol breakdown and DeFi fee analysis." },
  { icon: LineChart, title: "xLama Analytics", description: "Unified metrics: Realized PnL, Success Rate." },
  { icon: BarChart3, title: "Trading Patterns", description: "Discover when you trade the most." },
];

const Analytics = memo(function Analytics() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('analytics', 'okx');

  return (
    <AppLayout>
      <Helmet>
        <title>Trading Analytics | xlama</title>
        <meta name="description" content="View your trading analytics, volume history, and performance metrics." />
      </Helmet>

      <div className="container px-4 pb-8 max-w-4xl mx-auto relative">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <BarChart3 className="w-4 h-4" />
            <span>Trading Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">Trading Analytics</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Track your trading performance and patterns across all chains
          </p>
        </div>

        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
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
                  <div className="grid grid-cols-2 gap-4">
                    {analyticsFeatures.map((feature, index) => (
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
              <TabsTrigger value="okx" className="gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5" />
                OKX
              </TabsTrigger>
              <TabsTrigger value="zerion" className="gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" />
                Zerion
              </TabsTrigger>
              <TabsTrigger value="xlama" className="gap-1.5 text-xs">
                <LineChart className="w-3.5 h-3.5" />
                xLama
              </TabsTrigger>
            </TabsList>

            <TabsContent value="okx" className="mt-0">
              <Suspense fallback={<AnalyticsSkeleton />}>
                <OkxAnalyticsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="zerion" className="mt-0">
              <Suspense fallback={<AnalyticsSkeleton />}>
                <ZerionAnalyticsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="xlama" className="mt-0">
              <Suspense fallback={<AnalyticsSkeleton />}>
                <XlamaAnalyticsTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
});

export default Analytics;
