import { memo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { TokenWatchlist } from "@/components/TokenWatchlist";
import { GasEstimator } from "@/components/GasEstimator";
import { PricePrediction } from "@/components/PricePrediction";
import { PortfolioRebalancer } from "@/components/PortfolioRebalancer";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GlowBar } from "@/components/ui/glow-bar";
import { Wrench, Fuel, TrendingUp, PieChart, Bell, Eye, BarChart3, ArrowRight } from "lucide-react";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";

const toolsConfig = [
  { id: "watchlist", title: "Watchlist", icon: Eye },
  { id: "gas", title: "Gas", icon: Fuel },
  { id: "prediction", title: "Prediction", icon: TrendingUp },
  { id: "rebalancer", title: "Rebalancer", icon: PieChart },
  { id: "alerts", title: "Alerts", icon: Bell },
];

const Tools = memo(function Tools() {
  // Smooth scroll handler with haptic feedback
  const handleSmoothScroll = useCallback((e: React.MouseEvent<HTMLButtonElement>, targetId: string) => {
    e.preventDefault();
    hapticFeedback('light');
    
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      window.history.pushState(null, '', `#${targetId}`);
    }
  }, []);

  return (
    <AppLayout>
      <Helmet>
        <title>Trading Tools | xlama - Gas Estimator, Price Alerts & More</title>
        <meta
          name="description"
          content="Access powerful trading tools: multi-chain gas estimator, AI price predictions, portfolio rebalancer, token watchlist, and price alerts."
        />
        <link rel="canonical" href="https://xlama.exchange/tools" />
      </Helmet>

        <main className="container px-4 pb-4 sm:pb-6 max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto">
        {/* Header - Premium */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-primary/20 text-xs sm:text-sm text-primary mb-3">
            <Wrench className="w-3.5 h-3.5" />
            <span>Trading Tools</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 gradient-text">
            Trading Tools
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gas estimation, price alerts, predictions & more
          </p>
        </div>

        {/* Quick Jump Navigation - Horizontal Scroll */}
        <ScrollArea className="w-full mb-6 -mx-4 px-4">
          <div className="flex gap-2 pb-2">
            {toolsConfig.map((tool) => (
              <Button
                key={tool.id}
                variant="outline"
                size="sm"
                onClick={(e) => handleSmoothScroll(e, tool.id)}
                className="flex-shrink-0 gap-1.5 h-9 px-3 glass-subtle hover:border-primary/30"
              >
                <tool.icon className="w-3.5 h-3.5 text-primary" />
                {tool.title}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tools Sections */}
        <div className="space-y-6">
          {/* Token Watchlist */}
          <section id="watchlist" className="scroll-mt-16">
            <Card className="glass border-border/50 overflow-hidden">
              <GlowBar variant="multi" delay={0.1} />
              <CardContent className="pt-4">
                <TokenWatchlist />
              </CardContent>
            </Card>
          </section>

          {/* Gas & Prediction - Side by side on desktop, stacked on mobile */}
          <div className="grid sm:grid-cols-2 gap-4">
            <section id="gas" className="scroll-mt-16">
              <Card className="glass border-border/50 overflow-hidden h-full">
                <GlowBar variant="success" delay={0.2} />
                <CardContent className="pt-4">
                  <GasEstimator />
                </CardContent>
              </Card>
            </section>
            <section id="prediction" className="scroll-mt-16">
              <Card className="glass border-border/50 overflow-hidden h-full">
                <GlowBar variant="primary" delay={0.3} />
                <CardContent className="pt-4">
                  <PricePrediction />
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Portfolio Rebalancer */}
          <section id="rebalancer" className="scroll-mt-16 max-w-xl mx-auto">
            <Card className="glass border-border/50 overflow-hidden">
              <GlowBar variant="warning" delay={0.4} />
              <CardContent className="pt-4">
                <PortfolioRebalancer />
              </CardContent>
            </Card>
          </section>

          {/* Price Alerts */}
          <section id="alerts" className="scroll-mt-16">
            <Card className="glass border-border/50 overflow-hidden">
              <GlowBar variant="multi" delay={0.5} />
              <CardContent className="pt-4">
                <PriceAlerts />
              </CardContent>
            </Card>
          </section>

          {/* Token Compare Link */}
          <section className="max-w-xl mx-auto">
            <Link to="/compare">
              <Card className="glass border-border hover:border-primary/30 hover-lift transition-all group cursor-pointer">
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg glass-subtle border border-primary/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Token Compare</h3>
                        <p className="text-xs text-muted-foreground">
                          Compare up to 5 tokens
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </section>
        </div>
      </main>
    </AppLayout>
  );
});

export default Tools;