import { memo, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowRightLeft, 
  Wallet, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Zap,
  ExternalLink,
  Settings,
} from "lucide-react";
import { CrossChainSwap, BridgeTransactionHistory, BridgeSettingsPanel } from "@/features/bridge";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { lifiService } from "@/services/lifi";
import { SUPPORTED_CHAINS } from "@/data/chains";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const bridgeSteps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Connect your EVM wallet (MetaMask, OKX, etc.) to access cross-chain bridging.",
  },
  {
    icon: Coins,
    title: "Select Chains & Tokens",
    description: "Choose your source and destination chains, then select the tokens you want to bridge.",
  },
  {
    icon: ArrowRightLeft,
    title: "Review Route",
    description: "Li.Fi finds the best route across 20+ bridges. Review fees, estimated time, and output amount.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm & Bridge",
    description: "Approve the transaction in your wallet. Track progress in real-time until completion.",
  },
];

const bridgeFeatures = [
  { icon: Zap, label: "Best Rates", description: "Aggregated from 20+ bridges" },
  { icon: Shield, label: "Secure", description: "Audited bridge protocols" },
  { icon: Clock, label: "Fast", description: "2-15 minute transfers" },
];

const Bridge = memo(function Bridge() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Get supported chains for Li.Fi
  const supportedChains = useMemo(() => {
    return SUPPORTED_CHAINS.filter(chain => 
      lifiService.isChainSupported(chain.chainIndex)
    );
  }, []);

  return (
    <Layout>
      <Helmet>
        <title>Cross-Chain Bridge | xlama - Bridge Crypto Across 20+ Chains</title>
        <meta 
          name="description" 
          content="Bridge tokens across 20+ blockchains with the best rates. Powered by Li.Fi with aggregated routes from major bridges. Fast, secure, non-custodial." 
        />
        <meta property="og:title" content="Cross-Chain Bridge | xlama" />
        <meta property="og:description" content="Bridge tokens across 20+ blockchains with the best rates. Powered by Li.Fi." />
        <link rel="canonical" href="https://xlama.exchange/bridge" />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12 relative">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Powered by Li.Fi</span>
            </div>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full glass-subtle">
                  <Settings className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Bridge Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <BridgeSettingsPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Cross-Chain Bridge
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Bridge tokens across {supportedChains.length}+ blockchains with the best rates from 20+ bridges. 
            Fast, secure, and non-custodial.
          </p>
        </div>

        {/* Main Bridge Widget */}
        <div className="max-w-xl mx-auto mb-8">
          <CrossChainSwap />
        </div>

        {/* Bridge Transaction History */}
        <div className="max-w-xl mx-auto mb-12 sm:mb-16">
          <BridgeTransactionHistory />
        </div>

        {/* Supported Chains Grid */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Supported Chains</h2>
            <p className="text-sm text-muted-foreground">
              Bridge assets seamlessly between these networks
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto">
            {supportedChains.map((chain, index) => (
              <div
                key={chain.chainIndex}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg glass-subtle hover-lift ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 30)}
              >
                <img
                  src={chain.icon}
                  alt={chain.name}
                  className="w-5 h-5 rounded-full"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.name.slice(0, 2)}&background=6366f1&color=fff&size=40`;
                  }}
                />
                <span className="text-sm font-medium">{chain.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">How Cross-Chain Bridging Works</h2>
            <p className="text-sm text-muted-foreground">
              Simple steps to move your assets across blockchains
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {bridgeSteps.map((step, index) => (
              <Card 
                key={step.title} 
                className={`relative glass hover:border-primary/20 hover-lift transition-all sweep-effect shadow-premium-hover glow-border-animated ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 80)}
              >
                <div 
                  className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-xs"
                  aria-label={`Step ${index + 1}`}
                >
                  {index + 1}
                </div>
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
                    <step.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-12 sm:mb-16">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
            {bridgeFeatures.map((feature, index) => (
              <div 
                key={feature.label} 
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 glass rounded-full hover-lift sweep-effect ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index + bridgeSteps.length, 60)}
              >
                <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
                <span className="font-medium text-sm sm:text-base">{feature.label}</span>
                <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">{feature.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Li.Fi Credit */}
        <section className="text-center">
          <Card className="inline-block glass border-border/50 sweep-effect">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-3">
                <img
                  src="https://li.fi/logo192.png"
                  alt="Li.Fi logo"
                  className="w-8 h-8 rounded-lg bg-background"
                />
                <div className="text-left">
                  <p className="text-sm font-medium">Powered by Li.Fi</p>
                  <p className="text-xs text-muted-foreground">
                    Aggregating 20+ bridges for the best routes
                  </p>
                </div>
                <a
                  href="https://li.fi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
});

export default Bridge;
