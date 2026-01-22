import { useRef, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components";
import { Helmet } from "react-helmet-async";
import { Shield, Zap, Clock, RefreshCw, Wallet, Layers, TrendingUp, Globe } from "lucide-react";
import { 
  TrendingPairsSkeleton, 
} from "@/components/IndexSectionSkeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/shared/lib";

// Lazy load components
const HeroSection = lazy(() => import("@/components/HeroSection").then(m => ({ default: m.HeroSection })));
const HowItWorks = lazy(() => import("@/components/HowItWorks").then(m => ({ default: m.HowItWorks })));
const DexHowItWorks = lazy(() => import("@/components/DexHowItWorks").then(m => ({ default: m.DexHowItWorks })));
const Features = lazy(() => import("@/components/Features").then(m => ({ default: m.Features })));
const Partners = lazy(() => import("@/components/Partners").then(m => ({ default: m.Partners })));
const PriceAlerts = lazy(() => import("@/components/PriceAlerts").then(m => ({ default: m.PriceAlerts })));
const FavoritePairsSection = lazy(() => import("@/components/FavoritePairsSection").then(m => ({ default: m.FavoritePairsSection })));
const TrendingPairs = lazy(() => import("@/components/TrendingPairs").then(m => ({ default: m.TrendingPairs })));
const CryptoNews = lazy(() => import("@/components/CryptoNews").then(m => ({ default: m.CryptoNews })));

// Feature cards configuration
const instantFeatures = [
  { icon: RefreshCw, title: "Real-time data", description: "Our crypto converter is updated on-demand, just refresh the page for the latest rate." },
  { icon: Zap, title: "900+ cryptocurrencies", description: "You can convert between a large selection of cryptocurrencies at any time." },
  { icon: Shield, title: "Easy to use", description: "Simply select your assets, enter your desired amount, and convert for real-time price data." },
  { icon: Clock, title: "No account needed", description: "Our converter is publicly available with no registration required. Fast and anonymous." },
];

const dexFeatures = [
  { icon: Wallet, title: "Connect & Swap", description: "Connect your wallet and swap tokens directly on-chain with instant execution." },
  { icon: Layers, title: "400+ DEXs", description: "Best rates aggregated from 400+ decentralized exchanges across 25+ chains." },
  { icon: TrendingUp, title: "Low Slippage", description: "Smart routing ensures optimal price with minimal slippage on every swap." },
  { icon: Globe, title: "Multi-Chain", description: "Swap tokens on Ethereum, Base, Polygon, Arbitrum, X Layer, and many more." },
];

// Memoized feature card component
const FeatureCard = memo(function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  index 
}: { 
  icon: typeof Shield; 
  title: string; 
  description: string; 
  index: number;
}) {
  return (
    <article 
      className={`p-5 rounded-xl bg-card border border-border hover:border-primary/20 hover-lift transition-all ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 80)}
    >
      <Icon className="w-5 h-5 text-muted-foreground mb-3" aria-hidden="true" />
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </article>
  );
});

// JSON-LD structured data
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

const Landing = () => {
  const navigate = useNavigate();

  const handleSelectPair = useCallback((from: string, to: string) => {
    navigate(`/?from=${from}&to=${to}`, { replace: true });
  }, [navigate]);

  return (
    <Layout>
      <Helmet>
        <title>xlama - Fast & Secure Cryptocurrency Exchange | Learn More</title>
        <meta
          name="description"
          content="Learn about xlama - a fast, secure cryptocurrency exchange with instant swaps and DEX aggregation across 900+ coins and 25+ blockchains."
        />
        <meta name="keywords" content="crypto exchange, bitcoin swap, ethereum exchange, dex aggregator, defi swap, no KYC, instant swap" />
        
        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="xlama - Fast & Secure Cryptocurrency Exchange" />
        <meta property="og:description" content="Learn about xlama's features and how to get started with instant crypto swaps." />
        <meta property="og:site_name" content="xlama" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="xlama - Fast & Secure Cryptocurrency Exchange" />
        <meta name="twitter:description" content="Learn about xlama's features and how to get started with instant crypto swaps." />
        <meta name="twitter:site" content="@XLAMA_OKX" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <main className="flex flex-col">
        {/* Section 1: Hero */}
        <Suspense fallback={<div className="h-96 skeleton-shimmer" />}>
          <HeroSection />
        </Suspense>

        {/* Section 2: Favorites & Trending */}
        <section className="section-container bg-secondary/30">
          <div className="max-w-7xl mx-auto space-y-8">
            <Suspense fallback={null}>
              <FavoritePairsSection />
            </Suspense>
            <Suspense fallback={<TrendingPairsSkeleton />}>
              <TrendingPairs onSelectPair={handleSelectPair} />
            </Suspense>
          </div>
        </section>

        {/* Section 3: Instant Swap Features */}
        <section className="section-container">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
                Instant Swap Features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                Convert 900+ popular cryptocurrencies with the best available rates in real-time.
              </p>
            </div>
            <div className="card-grid-4">
              {instantFeatures.map((feature, index) => (
                <FeatureCard key={feature.title} index={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: DEX Swap Features */}
        <section className="section-container bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
                DEX Aggregator Features
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                Swap tokens directly from your wallet with the best rates from 400+ DEXs across 25+ networks.
              </p>
            </div>
            <div className="card-grid-4">
              {dexFeatures.map((feature, index) => (
                <FeatureCard key={feature.title} index={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: How It Works - Instant */}
        <Suspense fallback={null}>
          <HowItWorks />
        </Suspense>

        {/* Section 6: How It Works - DEX */}
        <Suspense fallback={null}>
          <DexHowItWorks />
        </Suspense>

        {/* Section 7: Price Alerts */}
        <section className="section-container">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={null}>
              <PriceAlerts />
            </Suspense>
          </div>
        </section>

        {/* Section 8: Features Showcase */}
        <Suspense fallback={null}>
          <Features />
        </Suspense>

        {/* Section 9: Partners */}
        <Suspense fallback={null}>
          <Partners />
        </Suspense>

        {/* Section 10: Crypto News */}
        <section className="py-8 sm:py-12 bg-secondary/20">
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

export default Landing;
