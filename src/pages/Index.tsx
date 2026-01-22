import { useRef, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/shared/components";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { Helmet } from "react-helmet-async";
import { TrendingUp, Wallet, ListOrdered, Wrench, Link2, ArrowRight } from "lucide-react";
import { 
  TrendingPairsSkeleton, 
  TransactionTrackerSkeleton 
} from "@/components/IndexSectionSkeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/shared/lib";

// Lazy load heavier sections for better initial load
const TrendingPairs = lazy(() => import("@/components/TrendingPairs").then(m => ({ default: m.TrendingPairs })));
const DexTransactionHistory = lazy(() => import("@/components/DexTransactionHistory").then(m => ({ default: m.DexTransactionHistory })));
const CryptoNews = lazy(() => import("@/components/CryptoNews").then(m => ({ default: m.CryptoNews })));

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
      className={`group flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all sweep-effect performance-critical overflow-hidden ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 80)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
});

// JSON-LD structured data - static
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "xlama",
  "applicationCategory": "FinanceApplication",
  "description": "Fast and secure cryptocurrency exchange with instant swaps and DEX aggregation",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1000"
  }
};

const Index = () => {
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleSelectPair = useCallback((from: string, to: string) => {
    navigate(`/swap?from=${from}&to=${to}`, { replace: true });
    widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [navigate]);

  return (
    <Layout>
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
          className="section-container relative" 
          aria-labelledby="exchange-heading"
        >
          {/* Background gradient accents */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-float" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }} />
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Premium Title Section */}
            <div className="text-center mb-10 sm:mb-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm text-primary mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                </span>
                <span className="font-medium">Live Trading</span>
              </div>
              
              <h1 id="exchange-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight animate-fade-in-up">
                <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                  Multi-Chain
                </span>
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"> DEX Swap</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Best rates from 400+ DEXs across 25+ blockchains. <span className="text-foreground font-medium">Zero registration.</span>
              </p>
            </div>

            {/* Exchange Widget - Main Focus with glow */}
            <div id="exchange-widget" ref={widgetRef} className="max-w-2xl mx-auto mb-12 relative">
              {/* Subtle glow behind widget */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl blur-2xl" />
              <ExchangeWidget />
            </div>

            {/* Quick Actions below widget */}
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickLink icon={Link2} title="Bridge" description="Cross-chain transfers" href="/bridge" index={0} />
                <QuickLink icon={ListOrdered} title="Orders" description="Limit & DCA orders" href="/orders" index={1} />
                <QuickLink icon={Wrench} title="Tools" description="Gas, predictions, alerts" href="/tools" index={2} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Trading Activity */}
        <section className="section-container bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trending Pairs */}
              <div className="lg:col-span-2">
                <Suspense fallback={<TrendingPairsSkeleton />}>
                  <TrendingPairs onSelectPair={handleSelectPair} />
                </Suspense>
              </div>
              
              {/* Recent Trades Sidebar */}
              <div>
                <Suspense fallback={<TransactionTrackerSkeleton />}>
                  <DexTransactionHistory />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Market News */}
        <section className="py-8 sm:py-12">
          <div className="container px-4 sm:px-6 max-w-7xl mx-auto">
            <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
              <CryptoNews />
            </Suspense>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Index;
