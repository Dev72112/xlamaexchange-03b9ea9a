import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { TokenWatchlist } from "@/components/TokenWatchlist";
import { GasEstimator } from "@/components/GasEstimator";
import { PricePrediction } from "@/components/PricePrediction";
import { PortfolioRebalancer } from "@/components/PortfolioRebalancer";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Fuel, TrendingUp, PieChart, Bell, Eye, BarChart3, ArrowRight } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const toolsConfig = [
  {
    id: "watchlist",
    title: "Token Watchlist",
    description: "Monitor token prices and set alerts for your favorite assets.",
    icon: Eye,
  },
  {
    id: "gas",
    title: "Gas Estimator",
    description: "Track real-time gas prices across multiple networks.",
    icon: Fuel,
  },
  {
    id: "prediction",
    title: "Price Prediction",
    description: "AI-powered technical analysis and price predictions.",
    icon: TrendingUp,
  },
  {
    id: "rebalancer",
    title: "Portfolio Rebalancer",
    description: "Set target allocations and optimize your portfolio.",
    icon: PieChart,
  },
  {
    id: "alerts",
    title: "Price Alerts",
    description: "Get notified when tokens reach your target prices.",
    icon: Bell,
  },
];

const Tools = memo(function Tools() {
  return (
    <Layout>
      <Helmet>
        <title>Trading Tools | xlama - Gas Estimator, Price Alerts & More</title>
        <meta
          name="description"
          content="Access powerful trading tools: multi-chain gas estimator, AI price predictions, portfolio rebalancer, token watchlist, and price alerts. All free, no registration."
        />
        <meta property="og:title" content="Trading Tools | xlama" />
        <meta property="og:description" content="Powerful trading tools: gas estimator, price predictions, portfolio rebalancer, and price alerts." />
        <link rel="canonical" href="https://xlama.exchange/tools" />
      </Helmet>

      <main className="container px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
            <Wrench className="w-4 h-4" />
            <span>Trading Tools</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Trading Tools
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Powerful tools to enhance your trading experience. Monitor gas prices, 
            track tokens, set alerts, and optimize your portfolio.
          </p>
        </div>

        {/* Quick Jump Navigation */}
        <nav className="flex flex-wrap justify-center gap-2 mb-10">
          {toolsConfig.map((tool, index) => (
            <a
              key={tool.id}
              href={`#${tool.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm font-medium hover:bg-secondary hover:border-primary/20 transition-colors ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 50)}
            >
              <tool.icon className="w-4 h-4 text-primary" />
              {tool.title}
            </a>
          ))}
        </nav>

        {/* Tools Sections */}
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Token Watchlist */}
          <section id="watchlist" className="scroll-mt-20">
            <TokenWatchlist />
          </section>

          {/* Gas & Prediction side by side */}
          <section className="grid md:grid-cols-2 gap-6">
            <div id="gas" className="scroll-mt-20">
              <GasEstimator />
            </div>
            <div id="prediction" className="scroll-mt-20">
              <PricePrediction />
            </div>
          </section>

          {/* Portfolio Rebalancer */}
          <section id="rebalancer" className="scroll-mt-20 max-w-xl mx-auto">
            <PortfolioRebalancer />
          </section>

          {/* Price Alerts */}
          <section id="alerts" className="scroll-mt-20">
            <PriceAlerts />
          </section>

          {/* Token Compare Link */}
          <section className="max-w-xl mx-auto">
            <Link to="/compare">
              <Card className="bg-card/50 border-border hover:border-primary/30 transition-all group cursor-pointer">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Token Compare</h3>
                        <p className="text-sm text-muted-foreground">
                          Compare up to 5 tokens side by side
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </section>
        </div>
      </main>
    </Layout>
  );
});

export default Tools;
