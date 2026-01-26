import { memo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Repeat, 
  Link2, 
  Activity, 
  Wallet,
  BarChart3,
  Shield,
  Zap,
  Globe
} from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

// Lazy load heavier sections
const Partners = lazy(() => import("@/components/Partners").then(m => ({ default: m.Partners })));

// Feature cards for the landing page
const features = [
  {
    icon: Repeat,
    title: "DEX Aggregation",
    description: "Best rates from 400+ DEXs across 25+ blockchains. Instant swaps with optimal routing.",
    href: "/swap",
    cta: "Start Swapping"
  },
  {
    icon: Link2,
    title: "Cross-Chain Bridge",
    description: "Bridge assets across 20+ chains securely. Powered by LI.FI for best routes.",
    href: "/bridge",
    cta: "Bridge Assets"
  },
  {
    icon: Activity,
    title: "Perpetuals Trading",
    description: "Trade with up to 50x leverage on Hyperliquid. Advanced charting and order types.",
    href: "/perpetuals",
    cta: "Trade Perps"
  },
  {
    icon: Wallet,
    title: "Portfolio Tracker",
    description: "Track your holdings across all chains. Real-time P&L and DeFi positions.",
    href: "/portfolio",
    cta: "View Portfolio"
  }
];

// Stats section
const stats = [
  { value: "25+", label: "Chains Supported" },
  { value: "400+", label: "DEXs Aggregated" },
  { value: "900+", label: "Tokens Available" },
  { value: "Low", label: "Trading Fees" }
];

// Trust badges
const trustFeatures = [
  { icon: Shield, label: "Non-Custodial" },
  { icon: Zap, label: "Instant Swaps" },
  { icon: Globe, label: "No KYC Required" }
];

const FeatureCard = memo(function FeatureCard({ 
  feature, 
  index 
}: { 
  feature: typeof features[0]; 
  index: number; 
}) {
  const Icon = feature.icon;
  
  return (
    <div 
      className={`group relative p-6 rounded-2xl glass border border-border/50 hover:border-primary/40 transition-all duration-300 sweep-effect shadow-premium-hover ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 100)}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {feature.description}
        </p>
        
        <Link to={feature.href}>
          <Button variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80 group/btn">
            {feature.cta}
            <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
});

const Home = () => {
  return (
    <Layout>
      <Helmet>
        <title>xLama - The Ultimate Crypto Exchange Hub | DEX Aggregator</title>
        <meta
          name="description"
          content="Swap 900+ cryptocurrencies instantly across 25+ blockchains. Best rates from 400+ DEXs. Trade perpetuals, bridge assets, and track your portfolio. No KYC required."
        />
        <meta name="keywords" content="crypto exchange, dex aggregator, token swap, cross-chain bridge, perpetuals trading, defi, no kyc" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="xLama - The Ultimate Crypto Exchange Hub" />
        <meta property="og:description" content="Swap tokens instantly with the best rates across 400+ DEXs and 25+ blockchains." />
        <meta property="og:site_name" content="xLama" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="xLama - DEX Aggregator" />
        <meta name="twitter:description" content="The ultimate crypto exchange hub. Swap, bridge, and trade with best rates." />
      </Helmet>

      <main className="flex flex-col">
        {/* Hero Section */}
        <HeroSection />

        {/* Trust Badges */}
        <section className="py-6 border-y border-border/30 bg-surface-elevated/50">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
              {trustFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.label} className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need to Trade
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From instant swaps to perpetuals trading, xLama provides all the tools for your crypto journey.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <FeatureCard key={feature.title} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-background to-secondary/20">
          <div className="container px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label}
                  className={`text-center ${STAGGER_ITEM_CLASS}`}
                  style={getStaggerStyle(index, 80)}
                >
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Connect your wallet and start swapping instantly. No registration, no KYC, no hassle.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/swap">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                    Launch Exchange
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Read Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="py-12 sm:py-16 border-t border-border/30">
          <div className="container px-4 sm:px-6">
            <Suspense fallback={<div className="h-32 skeleton-shimmer rounded-lg" />}>
              <Partners />
            </Suspense>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Home;
