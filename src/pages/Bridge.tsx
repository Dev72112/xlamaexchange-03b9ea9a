import { memo, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  History,
  Info,
} from "lucide-react";
import { CrossChainSwap, BridgeTransactionHistory, BridgeSettingsPanel } from "@/features/bridge";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { lifiService } from "@/services/lifi";
import { SUPPORTED_CHAINS } from "@/data/chains";
import { cn } from "@/lib/utils";
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
    title: "Connect",
    description: "Connect your EVM wallet to access bridging.",
  },
  {
    icon: Coins,
    title: "Select",
    description: "Choose source and destination chains and tokens.",
  },
  {
    icon: ArrowRightLeft,
    title: "Review",
    description: "Li.Fi finds the best route across 20+ bridges.",
  },
  {
    icon: CheckCircle2,
    title: "Bridge",
    description: "Approve and track progress in real-time.",
  },
];

const bridgeFeatures = [
  { icon: Zap, label: "Best Rates" },
  { icon: Shield, label: "Secure" },
  { icon: Clock, label: "Fast" },
];

const Bridge = memo(function Bridge() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  
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

      <main className="container px-4 sm:px-6 pt-4 pb-6 sm:pt-6 sm:pb-8 max-w-2xl mx-auto relative">
        {/* Background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 -left-48 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -right-48 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header - Compact */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-primary/20 text-xs sm:text-sm text-primary">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Powered by Li.Fi</span>
            </div>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full glass-subtle">
                  <Settings className="w-3.5 h-3.5" />
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
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-2 gradient-text">
            Cross-Chain Bridge
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bridge tokens across {supportedChains.length}+ chains with the best rates.
          </p>
        </div>

        {/* Main Bridge Widget */}
        <div className="mb-4">
          <CrossChainSwap />
        </div>

        {/* Feature Badges - Horizontal */}
        <div className="flex justify-center gap-2 mb-4">
          {bridgeFeatures.map((feature) => (
            <div 
              key={feature.label} 
              className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs"
            >
              <feature.icon className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Recent Bridge History - Collapsible */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory} className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-11 glass-subtle">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Recent Bridges
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showHistory && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <BridgeTransactionHistory />
          </CollapsibleContent>
        </Collapsible>

        {/* Supported Chains - Horizontal Scroll */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 px-1">Supported Chains</p>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {supportedChains.slice(0, 15).map((chain, index) => (
                <div
                  key={chain.chainIndex}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-subtle shrink-0"
                >
                  <img
                    src={chain.icon}
                    alt={chain.name}
                    className="w-4 h-4 rounded-full"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.name.slice(0, 2)}&background=6366f1&color=fff&size=40`;
                    }}
                  />
                  <span className="text-xs font-medium">{chain.shortName}</span>
                </div>
              ))}
              {supportedChains.length > 15 && (
                <div className="flex items-center px-2.5 py-1.5 rounded-lg glass-subtle shrink-0">
                  <span className="text-xs text-muted-foreground">+{supportedChains.length - 15} more</span>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* How It Works - Collapsible */}
        <Collapsible open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-11 glass-subtle">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                How It Works
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showHowItWorks && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {bridgeSteps.map((step, index) => (
                <Card 
                  key={step.title} 
                  className={`relative glass border-border/50 ${STAGGER_ITEM_CLASS}`}
                  style={getStaggerStyle(index, 60)}
                >
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-xs"
                  >
                    {index + 1}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <step.icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Li.Fi Credit - Compact */}
        <div className="mt-6 text-center">
          <a
            href="https://li.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle hover-lift text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <img
              src="https://li.fi/logo192.png"
              alt="Li.Fi logo"
              className="w-5 h-5 rounded"
            />
            Powered by Li.Fi
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>
    </Layout>
  );
});

export default Bridge;
