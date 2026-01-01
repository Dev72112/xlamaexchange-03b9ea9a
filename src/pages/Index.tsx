import { useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { DexHowItWorks } from "@/components/DexHowItWorks";
import { Features } from "@/components/Features";
import { TrendingPairs } from "@/components/TrendingPairs";
import { HeroSection } from "@/components/HeroSection";
import { FavoritePairsSection } from "@/components/FavoritePairsSection";
import { TransactionTracker } from "@/components/TransactionTracker";
import { DexTransactionHistory } from "@/components/DexTransactionHistory";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Partners } from "@/components/Partners";
import { Helmet } from "react-helmet-async";
import { Shield, Zap, Clock, RefreshCw, Wallet, Layers, TrendingUp, Globe } from "lucide-react";

type ExchangeMode = 'instant' | 'dex';

const Index = () => {
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [currentMode, setCurrentMode] = useState<ExchangeMode>('instant');

  const handleSelectPair = useCallback((from: string, to: string) => {
    navigate(`/?from=${from}&to=${to}`, { replace: true });
    widgetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [navigate]);

  const handleModeChange = useCallback((mode: ExchangeMode) => {
    setCurrentMode(mode);
  }, []);

  // Feature cards based on mode
  const instantFeatures = [
    { icon: RefreshCw, title: "Real-time data", description: "Our crypto converter is updated on-demand, just refresh the page for the latest rate." },
    { icon: Zap, title: "900+ cryptocurrencies", description: "You can convert between a large selection of cryptocurrencies at any time." },
    { icon: Shield, title: "Easy to use", description: "Simply select your assets, enter your desired amount, and convert for real-time price data." },
    { icon: Clock, title: "No account needed", description: "Our converter is publicly available with no registration required. Fast and anonymous." },
  ];

  const dexFeatures = [
    { icon: Wallet, title: "Connect & Swap", description: "Connect your wallet and swap tokens directly on-chain with instant execution." },
    { icon: Layers, title: "400+ DEXs", description: "Best rates aggregated from 400+ decentralized exchanges across 20+ chains." },
    { icon: TrendingUp, title: "Low Slippage", description: "Smart routing ensures optimal price with minimal slippage on every swap." },
    { icon: Globe, title: "Multi-Chain", description: "Swap tokens on Ethereum, Base, Polygon, Arbitrum, X Layer, and many more." },
  ];

  const features = currentMode === 'instant' ? instantFeatures : dexFeatures;
  const sectionTitle = currentMode === 'instant' 
    ? "Make the most of our converter" 
    : "Make the most of our DEX swap";

  // JSON-LD structured data for SEO
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

  return (
    <Layout>
      <Helmet>
        <title>xlama - Fast & Secure Cryptocurrency Exchange | Best Rates</title>
        <meta
          name="description"
          content="Exchange cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates. 900+ coins supported. DEX aggregation across 400+ exchanges."
        />
        <meta name="keywords" content="crypto exchange, bitcoin swap, ethereum exchange, dex aggregator, defi swap, no KYC, instant swap" />
        
        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="xlama - Fast & Secure Cryptocurrency Exchange" />
        <meta property="og:description" content="Exchange cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates." />
        <meta property="og:site_name" content="xlama" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="xlama - Fast & Secure Cryptocurrency Exchange" />
        <meta name="twitter:description" content="Exchange cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates." />
        <meta name="twitter:site" content="@XLAMA_OKX" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Hero Section with Stats */}
      <HeroSection />

      {/* Exchange Section */}
      <section className="py-12 sm:py-16 lg:py-20" aria-labelledby="exchange-heading">
        <div className="container px-4 sm:px-6">
          {/* Title */}
          <div className="text-center mb-10 sm:mb-12">
            <h2 id="exchange-heading" className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-4 tracking-tight">
              {currentMode === 'instant' ? 'Crypto converter and calculator' : 'DEX Swap Aggregator'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              {currentMode === 'instant' 
                ? 'This page displays the real-time conversion rate of crypto against its cash equivalent. You can instantly convert 900+ popular cryptocurrencies with the best available rates.'
                : 'Swap tokens directly from your wallet with the best rates from 400+ DEXs. Connect your wallet, select tokens, and swap on-chain across 20+ networks.'
              }
            </p>
          </div>

          {/* Exchange Widget */}
          <div id="exchange-widget" ref={widgetRef} className="max-w-xl mx-auto mb-16">
            <ExchangeWidget onModeChange={handleModeChange} />
          </div>

          {/* Feature Cards */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-semibold mb-6">{sectionTitle}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mode-aware sections */}
      {currentMode === 'instant' ? (
        <>
          <FavoritePairsSection />
          <TrendingPairs onSelectPair={handleSelectPair} />
          <TransactionTracker />
        </>
      ) : (
        <>
          <DexTransactionHistory />
        </>
      )}
      
      <PriceAlerts />
      
      {/* Mode-aware How It Works */}
      {currentMode === 'instant' ? <HowItWorks /> : <DexHowItWorks />}
      
      <Features />
      <Partners />
    </Layout>
  );
};

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <article className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
      <Icon className="w-5 h-5 text-muted-foreground mb-3" aria-hidden="true" />
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </article>
  );
}

export default Index;
