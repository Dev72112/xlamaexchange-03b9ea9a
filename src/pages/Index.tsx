import { Layout } from "@/components/Layout";
import { ExchangeWidget } from "@/components/exchange/ExchangeWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <Layout>
      <Helmet>
        <title>xlama - Fast & Secure Cryptocurrency Exchange</title>
        <meta
          name="description"
          content="Exchange cryptocurrencies instantly with no registration. Fast, secure, and anonymous crypto swaps with the best rates."
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 md:py-32 overflow-hidden">
        <div className="container px-4 sm:px-6">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Faster, better, stronger
                <br />
                <span className="text-muted-foreground">than your average</span>
                <br />
                <span className="text-muted-foreground">crypto exchange</span>
              </h1>
              
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                The fastest way to exchange cryptocurrency. Swap Bitcoin, Ethereum, 
                and hundreds of other coins with the best rates.
              </p>

              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  No Registration
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  Best Rates
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  Fast & Secure
                </div>
              </div>
            </div>

            {/* Right Widget */}
            <div className="lg:pl-8 w-full max-w-lg mx-auto lg:max-w-none">
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
