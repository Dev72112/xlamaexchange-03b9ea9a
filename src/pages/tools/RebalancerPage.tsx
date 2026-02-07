import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PortfolioRebalancer } from "@/components/PortfolioRebalancer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowBar } from "@/components/ui/glow-bar";
import { PieChart, ArrowLeft, Layers, Sliders, Lightbulb, Eye, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const RebalancerPage = memo(function RebalancerPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Portfolio Rebalancer | xlama Trading Tools</title>
        <meta name="description" content="Optimize your cryptocurrency portfolio allocations with smart rebalancing." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-xl mx-auto">
        <Link to="/tools">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Tools
          </Button>
        </Link>

        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-primary/20 text-xs text-primary mb-3">
            <PieChart className="w-3.5 h-3.5" />
            <span>Rebalancer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Portfolio Rebalancer</h1>
          <p className="text-muted-foreground text-sm">Optimize your token allocations</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { value: "25+", label: "Chains", icon: Layers },
            { value: "Auto", label: "Scheduling", icon: Sliders },
            { value: "1%", label: "Threshold", icon: PieChart },
          ].map((stat) => (
            <Card key={stat.label} className="glass-subtle border-border/30 text-center">
              <CardContent className="p-3">
                <stat.icon className="w-4 h-4 text-primary mx-auto mb-1.5 opacity-70" />
                <p className="text-lg font-bold text-primary leading-tight">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass border-border/50 overflow-hidden">
          <GlowBar variant="warning" />
          <CardContent className="pt-4">
            <PortfolioRebalancer />
          </CardContent>
        </Card>

        {/* Pro Tips */}
        <div className="mt-5 p-4 rounded-lg glass-subtle border border-primary/10">
          <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Pro Tips
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Rebalance monthly for optimal risk management</li>
            <li>• Consider gas costs before rebalancing small amounts</li>
            <li>• Set a threshold to avoid unnecessary micro-trades</li>
          </ul>
        </div>

        {/* Related */}
        <div className="mt-5">
          <p className="text-xs text-muted-foreground mb-2">Related Tools</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/portfolio">
              <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                <BarChart3 className="w-3 h-3" /> Portfolio
              </Badge>
            </Link>
            <Link to="/tools/watchlist">
              <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                <Eye className="w-3 h-3" /> Watchlist
              </Badge>
            </Link>
          </div>
        </div>
      </main>
    </AppLayout>
  );
});

export default RebalancerPage;
