import { useRef, useCallback, Suspense, lazy, memo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { Helmet } from "react-helmet-async";
import { TrendingUp, Wallet, ListOrdered, Wrench, Link2, ArrowRight, ChevronDown, Search, HelpCircle } from "lucide-react";
import { GlowBar } from "@/components/ui/glow-bar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { 
  TrendingPairsSkeleton, 
  TransactionTrackerSkeleton 
} from "@/components/IndexSectionSkeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/shared/lib";
import { cn } from "@/lib/utils";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy load heavier sections
const TrendingPairs = lazy(() => import("@/components/TrendingPairs").then(m => ({ default: m.TrendingPairs })));
const DexTransactionHistory = lazy(() => import("@/components/DexTransactionHistory").then(m => ({ default: m.DexTransactionHistory })));
const TransactionTracker = lazy(() => import("@/components/TransactionTracker").then(m => ({ default: m.TransactionTracker })));
const HowItWorks = lazy(() => import("@/components/HowItWorks").then(m => ({ default: m.HowItWorks })));
const DexHowItWorks = lazy(() => import("@/components/DexHowItWorks").then(m => ({ default: m.DexHowItWorks })));

// Memoized quick link component
const QuickLink = memo(function QuickLink({ 
  icon: Icon, 
  title, 
  description, 
  href, 
  index 
}: { 
  icon: typeof Wallet; 
  title: string; 
  description: string;
  href: string;
  index: number;
}) {
  return (
    <Link 
      to={href}
      className={`group flex items-center justify-between p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all sweep-effect performance-critical overflow-hidden ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 80)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
});

// Mobile bottom sheet wrapper component
const MobileBottomSheet = memo(function MobileBottomSheet({
  trigger,
  title,
  children,
  icon: Icon,
}: {
  trigger: string;
  title: string;
  children: React.ReactNode;
  icon: typeof TrendingUp;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-11 glass-subtle">
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {trigger}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
});

// Desktop collapsible wrapper component
const DesktopCollapsible = memo(function DesktopCollapsible({
  trigger,
  isOpen,
  onOpenChange,
  children,
  icon: Icon,
}: {
  trigger: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  icon: typeof TrendingUp;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-11 glass-subtle mb-2">
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {trigger}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
});

const Index = () => {
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showTrending, setShowTrending] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { isInstantMode } = useExchangeMode();

  const handleSelectPair = useCallback((from: string, to: string) => {
    navigate(`/swap?from=${from}&to=${to}`, { replace: true });
    widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [navigate]);

  return (
    <AppLayout>
      <Helmet>
        <title>xlama - Fast & Secure Cryptocurrency Exchange | Best Rates on X Layer</title>
        <meta
          name="description"
          content="Swap tokens instantly on X Layer and 25+ blockchains. Best rates from 400+ DEXs. No KYC required. Instant swaps, limit orders, DCA automation."
        />
        <meta name="keywords" content="crypto exchange, dex swap, x layer, ethereum, solana, defi, token swap, no KYC" />
        
        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="xlama - DEX Aggregator on X Layer" />
        <meta property="og:description" content="Swap tokens instantly with the best rates. Multi-chain DEX aggregator supporting X Layer, Ethereum, Solana and more." />
        <meta property="og:site_name" content="xlama" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="xlama - DEX Aggregator" />
        <meta name="twitter:description" content="Swap tokens instantly with the best rates across 400+ DEXs." />
        <meta name="twitter:site" content="@XLAMA_OKX" />
      </Helmet>

      <main className="flex flex-col">
        {/* Section 1: Exchange Widget - Hero */}
        <section 
          id="exchange"
          className="section-container relative py-6 sm:py-12" 
          aria-labelledby="exchange-heading"
        >
          {/* Background gradient accents */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-float" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }} />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Premium Title Section - Compact on mobile - CSS animations */}
            <div className="text-center mb-6 sm:mb-10">
              {/* Badge */}
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full glass border border-primary/30 text-xs sm:text-sm text-primary mb-4 sm:mb-6 animate-fade-in"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                </span>
                <span className="font-medium">Live on 25+ Chains</span>
              </div>
              
              <h1 
                className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-tight animate-fade-in"
                style={{ animationDelay: '100ms' }}
                id="exchange-heading"
              >
                <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                  Multi-Chain
                </span>
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"> DEX Aggregator</span>
              </h1>
              <p 
                className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                Best rates from 400+ DEXs. Swap, Bridge, and Trade Perps.{" "}
                <span className="text-foreground font-medium">No registration required.</span>
              </p>
            </div>

            {/* Exchange Widget - Main Focus */}
            <div id="exchange-widget" ref={widgetRef} className="max-w-2xl mx-auto mb-6 sm:mb-12 relative">
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl blur-2xl" />
              <div className="rounded-2xl overflow-hidden border border-border/50 glass">
                <GlowBar variant="premium" />
                <ExchangeWidget />
              </div>
            </div>

            {/* Quick Actions - Below widget */}
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <QuickLink icon={Link2} title="Bridge" description="Cross-chain transfers" href="/bridge" index={0} />
                <QuickLink icon={ListOrdered} title="Orders" description="Limit & DCA orders" href="/orders" index={1} />
                <QuickLink icon={Wrench} title="Tools" description="Gas, predictions" href="/tools" index={2} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Trading Activity - Instant mode only */}
        {isInstantMode && (
          <section className="container px-4 sm:px-6 py-4 sm:py-8">
            {isMobile ? (
              <MobileBottomSheet
                trigger="Trending Pairs & Activity"
                title="Trending Pairs & Activity"
                icon={TrendingUp}
              >
                <div className="space-y-6">
                  <Suspense fallback={<TrendingPairsSkeleton />}>
                    <TrendingPairs onSelectPair={handleSelectPair} />
                  </Suspense>
                  <Suspense fallback={<TransactionTrackerSkeleton />}>
                    <DexTransactionHistory />
                  </Suspense>
                </div>
              </MobileBottomSheet>
            ) : (
              <DesktopCollapsible
                trigger="Trending Pairs & Activity"
                isOpen={showTrending}
                onOpenChange={setShowTrending}
                icon={TrendingUp}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  <div className="lg:col-span-2">
                    <Suspense fallback={<TrendingPairsSkeleton />}>
                      <TrendingPairs onSelectPair={handleSelectPair} />
                    </Suspense>
                  </div>
                  <div>
                    <Suspense fallback={<TransactionTrackerSkeleton />}>
                      <DexTransactionHistory />
                    </Suspense>
                  </div>
                </div>
              </DesktopCollapsible>
            )}
          </section>
        )}

        {/* Section 4: Transaction Tracker - Instant mode only */}
        {isInstantMode && (
          <section className="container px-4 sm:px-6 py-4 sm:py-8">
            {isMobile ? (
              <MobileBottomSheet
                trigger="Track Transaction"
                title="Track Transaction"
                icon={Search}
              >
                <Suspense fallback={<TransactionTrackerSkeleton />}>
                  <TransactionTracker />
                </Suspense>
              </MobileBottomSheet>
            ) : (
              <DesktopCollapsible
                trigger="Track Transaction"
                isOpen={showTracker}
                onOpenChange={setShowTracker}
                icon={Search}
              >
                <div className="pt-2">
                  <Suspense fallback={<TransactionTrackerSkeleton />}>
                    <TransactionTracker />
                  </Suspense>
                </div>
              </DesktopCollapsible>
            )}
          </section>
        )}

        {/* Section 4: How It Works - Mode Aware (key forces re-render on mode change) */}
        <section key={`how-it-works-${isInstantMode ? 'instant' : 'dex'}`} className="container px-4 sm:px-6 py-4 sm:py-8">
          {isMobile ? (
            <MobileBottomSheet
              trigger={`How ${isInstantMode ? 'Instant Exchange' : 'DEX Aggregator'} Works`}
              title={`How ${isInstantMode ? 'Instant Exchange' : 'DEX Aggregator'} Works`}
              icon={HelpCircle}
            >
              <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                {isInstantMode ? <HowItWorks /> : <DexHowItWorks />}
              </Suspense>
            </MobileBottomSheet>
          ) : (
            <DesktopCollapsible
              trigger={`How ${isInstantMode ? 'Instant Exchange' : 'DEX Aggregator'} Works`}
              isOpen={showHowItWorks}
              onOpenChange={setShowHowItWorks}
              icon={HelpCircle}
            >
              <div className="pt-2">
                <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                  {isInstantMode ? <HowItWorks /> : <DexHowItWorks />}
                </Suspense>
              </div>
            </DesktopCollapsible>
          )}
        </section>
      </main>
    </AppLayout>
  );
};

export default Index;
