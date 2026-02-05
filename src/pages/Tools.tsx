import { memo, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlowBar } from "@/components/ui/glow-bar";
import { EducationCollapsible } from "@/components/EducationCollapsible";
import { Wrench, Fuel, TrendingUp, PieChart, Bell, Eye, BarChart3, ArrowRight, Newspaper, HelpCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const toolsConfig = [
  { 
    id: "watchlist", 
    title: "Token Watchlist", 
    description: "Track your favorite tokens with real-time prices",
    icon: Eye, 
    route: "/tools/watchlist",
    stats: "25+ Chains",
    variant: "primary" as const,
  },
  { 
    id: "gas", 
    title: "Gas Estimator", 
    description: "Multi-chain gas price monitoring",
    icon: Fuel, 
    route: "/tools/gas",
    stats: "Real-time",
    variant: "success" as const,
  },
  { 
    id: "prediction", 
    title: "Price Prediction", 
    description: "AI-powered price forecasts",
    icon: TrendingUp, 
    route: "/tools/prediction",
    stats: "AI Powered",
    variant: "primary" as const,
  },
  { 
    id: "rebalancer", 
    title: "Portfolio Rebalancer", 
    description: "Optimize your token allocations",
    icon: PieChart, 
    route: "/tools/rebalancer",
    stats: "Smart",
    variant: "warning" as const,
  },
  { 
    id: "alerts", 
    title: "Price Alerts", 
    description: "Get notified on price movements",
    icon: Bell, 
    route: "/tools/alerts",
    stats: "Push",
    variant: "multi" as const,
  },
  { 
    id: "news", 
    title: "Market News", 
    description: "Latest crypto market updates",
    icon: Newspaper, 
    route: "/tools/news",
    stats: "Live",
    variant: "primary" as const,
  },
  { 
    id: "compare", 
    title: "Token Compare", 
    description: "Compare up to 5 tokens side by side",
    icon: BarChart3, 
    route: "/compare",
    stats: "5 Tokens",
    variant: "multi" as const,
  },
];

const toolsSteps = [
  { icon: Eye, title: "Track Tokens", description: "Add tokens to your watchlist for quick monitoring." },
  { icon: Fuel, title: "Check Gas", description: "View gas prices across multiple chains before trading." },
  { icon: Bell, title: "Set Alerts", description: "Get notified when prices hit your targets." },
  { icon: BarChart3, title: "Compare", description: "Analyze multiple tokens side by side." },
];

const toolsTips = [
  "All tools work across 25+ supported chains",
  "Price predictions use AI models for forecasting",
  "Alerts can be delivered via push notifications",
];

const Tools = memo(function Tools() {
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

      <main className="container px-4 pb-8 sm:pb-12 max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto relative">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <Wrench className="w-3.5 h-3.5" />
            <span>Trading Tools</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Trading Tools
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
            Professional tools to enhance your trading experience
          </p>
        </motion.div>

        {/* Tools Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {toolsConfig.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link to={tool.route}>
                <Card className="glass border-border/50 hover:border-primary/30 hover-lift transition-all group h-full overflow-hidden">
                  <GlowBar variant={tool.variant} />
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl glass-subtle border border-border/50 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                        <tool.icon className="w-6 h-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{tool.stats}</Badge>
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                    <div className="flex items-center text-primary text-sm font-medium">
                      Open <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Education Collapsible */}
        <EducationCollapsible
          title="How Tools Work"
          icon={HelpCircle}
          steps={toolsSteps}
          tips={toolsTips}
        />
      </main>
    </AppLayout>
  );
});

export default Tools;