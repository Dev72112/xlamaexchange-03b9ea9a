import { Layout } from "@/components/Layout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { RateComparison } from "@/components/RateComparison";
import { TrendingPairs } from "@/components/TrendingPairs";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Partners } from "@/components/Partners";
import { Helmet } from "react-helmet-async";
import { Shield, Zap, Clock } from "lucide-react";

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

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 sm:px-6 relative">
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-fade-in">
                <Zap className="w-4 h-4" />
                Powered by ChangeNOW
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight animate-fade-in">
                The{" "}
                <span className="gradient-text">fastest</span>
                <br />
                crypto exchange
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 animate-fade-in">
                Swap Bitcoin, Ethereum, and 900+ cryptocurrencies instantly. 
                No registration. No hidden fees. Just fast, secure exchanges.
              </p>

              <div className="flex flex-wrap gap-6 justify-center lg:justify-start animate-fade-in">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="p-1.5 rounded-full bg-success/10">
                    <Shield className="w-4 h-4 text-success" />
                  </div>
                  <span className="font-medium">Non-custodial</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="p-1.5 rounded-full bg-success/10">
                    <Zap className="w-4 h-4 text-success" />
                  </div>
                  <span className="font-medium">Best Rates</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="p-1.5 rounded-full bg-success/10">
                    <Clock className="w-4 h-4 text-success" />
                  </div>
                  <span className="font-medium">2-20 min</span>
                </div>
              </div>
            </div>

            {/* Right Widget */}
            <div className="lg:pl-8 w-full max-w-lg mx-auto lg:max-w-none animate-scale-in">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-2xl opacity-50" />
                <ExchangeWidget />
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrendingPairs />
      <RateComparison />
      <PriceAlerts />
      <HowItWorks />
      <Features />
      <Partners />
    </Layout>
  );
};

export default Index;
