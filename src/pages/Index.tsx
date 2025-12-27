import { Layout } from "@/components/Layout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { TrendingPairs } from "@/components/TrendingPairs";
import { FavoritePairsSection } from "@/components/FavoritePairsSection";
import { TransactionTracker } from "@/components/TransactionTracker";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Partners } from "@/components/Partners";
import { Helmet } from "react-helmet-async";
import { Shield, Zap, Clock, RefreshCw } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      <Helmet>
        <title>xlama - Fast & Secure Cryptocurrency Exchange | Best Rates</title>
        <meta
          name="description"
          content="Exchange cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates. 900+ coins supported."
        />
        <meta name="keywords" content="crypto exchange, bitcoin swap, ethereum exchange, cryptocurrency, no KYC, instant swap" />
      </Helmet>

      {/* Hero Section - OKX Style Clean Layout */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container px-4 sm:px-6">
          {/* Title */}
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 tracking-tight">
              Crypto converter and calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              This page displays the real-time conversion rate of crypto against its cash equivalent. 
              You can instantly convert 900+ popular cryptocurrencies with the best available rates.
            </p>
          </div>

          {/* Exchange Widget - Centered */}
          <div className="max-w-xl mx-auto mb-16">
            <ExchangeWidget />
          </div>

          {/* Feature Cards - OKX Style */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">Make the most of our converter</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={RefreshCw}
                title="Real-time data"
                description="Our crypto converter is updated on-demand, just refresh the page for the latest rate."
              />
              <FeatureCard
                icon={Zap}
                title="900+ cryptocurrencies"
                description="You can convert between a large selection of cryptocurrencies at any time."
              />
              <FeatureCard
                icon={Shield}
                title="Easy to use"
                description="Simply select your assets, enter your desired amount, and convert for real-time price data."
              />
              <FeatureCard
                icon={Clock}
                title="No account needed"
                description="Our converter is publicly available with no registration required. Fast and anonymous."
              />
            </div>
          </div>
        </div>
      </section>

      <FavoritePairsSection />
      <TrendingPairs />
      <TransactionTracker />
      <PriceAlerts />
      <HowItWorks />
      <Features />
      <Partners />
    </Layout>
  );
};

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
      <Icon className="w-5 h-5 text-muted-foreground mb-3" />
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default Index;
