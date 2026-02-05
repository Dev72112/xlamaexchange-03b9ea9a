import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PortfolioRebalancer } from "@/components/PortfolioRebalancer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlowBar } from "@/components/ui/glow-bar";
import { PieChart, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const RebalancerPage = memo(function RebalancerPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Portfolio Rebalancer | xlama Trading Tools</title>
        <meta name="description" content="Optimize your cryptocurrency portfolio allocations with smart rebalancing." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-xl mx-auto">
        {/* Back link */}
        <Link to="/tools">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Tools
          </Button>
        </Link>

        {/* Header */}
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

        {/* Content */}
        <Card className="glass border-border/50 overflow-hidden">
          <GlowBar variant="warning" />
          <CardContent className="pt-4">
            <PortfolioRebalancer />
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
});

export default RebalancerPage;