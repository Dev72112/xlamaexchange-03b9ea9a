import { memo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Zap, Layers, LineChart } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { MultiWalletButton } from "@/features/wallet";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { PortfolioSkeleton } from "@/components/skeletons";
import { useTabPersistence } from "@/hooks/useTabPersistence";

// Lazy load tab components
const OkxPortfolioTab = lazy(() => import("@/components/portfolio/tabs/OkxPortfolioTab"));
const ZerionPortfolioTab = lazy(() => import("@/components/portfolio/tabs/ZerionPortfolioTab"));
const XlamaPortfolioTab = lazy(() => import("@/components/portfolio/tabs/XlamaPortfolioTab"));

const portfolioFeatures = [
  { icon: Zap, title: "OKX DEX", description: "Multi-chain token balances across 25+ EVM chains." },
  { icon: Layers, title: "Zerion DeFi", description: "DeFi positions, staking, lending & NFTs." },
  { icon: LineChart, title: "xLama API", description: "Unified analytics with OKX fallback." },
  { icon: Wallet, title: "Quick Actions", description: "Swap, bridge, and manage directly." },
];

const Portfolio = memo(function Portfolio() {
  const { isConnected } = useMultiWallet();
  const [activeTab, setActiveTab] = useTabPersistence('portfolio', 'okx');

  return (
    <AppLayout>
      <Helmet>
        <title>Account | xlama - Your Crypto Portfolio</title>
        <meta name="description" content="Manage your cryptocurrency portfolio across 25+ chains. View holdings, track P&L, and access quick actions." />
        <link rel="canonical" href="https://xlama.exchange/portfolio" />
      </Helmet>

      <main className="container px-4 sm:px-6 pb-6 sm:pb-8 max-w-2xl mx-auto">
        {!isConnected ? (
          <div className="max-w-xl mx-auto">
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
                  Connect to view your portfolio and manage your holdings.
                </p>
                <MultiWalletButton />

                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {portfolioFeatures.map((feature, index) => (
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
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-10 mb-4">
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
                <Suspense fallback={<PortfolioSkeleton />}>
                  <OkxPortfolioTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="zerion" className="mt-0">
                <Suspense fallback={<PortfolioSkeleton />}>
                  <ZerionPortfolioTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="xlama" className="mt-0">
                <Suspense fallback={<PortfolioSkeleton />}>
                  <XlamaPortfolioTab />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </AppLayout>
  );
});

export default Portfolio;
