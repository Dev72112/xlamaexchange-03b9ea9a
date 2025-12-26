import { Layout } from "@/components/Layout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <Layout>
      <Helmet>
        <title>CryptoSwap - Fast & Secure Cryptocurrency Exchange</title>
        <meta
          name="description"
          content="Exchange 900+ cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates."
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                900+ Cryptocurrencies Supported
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Swap Crypto{" "}
                <span className="gradient-text">Instantly</span>
                <br />
                No Account Needed
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                The fastest way to exchange cryptocurrency. Swap Bitcoin, Ethereum, 
                and 900+ other coins with the best rates and no hidden fees.
              </p>

              <div className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-success" />
                  </span>
                  No Registration
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-success" />
                  </span>
                  Best Rates
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-success" />
                  </span>
                  Fast & Secure
                </div>
              </div>
            </div>

            {/* Right Widget */}
            <div className="lg:pl-8">
              <ExchangeWidget />
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <Features />
    </Layout>
  );
};

export default Index;
