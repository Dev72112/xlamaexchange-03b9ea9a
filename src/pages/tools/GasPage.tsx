import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { GasEstimator } from "@/components/GasEstimator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowBar } from "@/components/ui/glow-bar";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Fuel, ArrowLeft, Globe, Clock, Lightbulb, PieChart, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";

const GasPage = memo(function GasPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Gas Estimator | xlama Trading Tools</title>
        <meta name="description" content="Monitor real-time gas prices across multiple blockchain networks." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-5xl lg:max-w-6xl mx-auto">
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
            <Fuel className="w-3.5 h-3.5" />
            <span>Gas Estimator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Gas Estimator</h1>
          <p className="text-muted-foreground text-sm">Real-time gas prices across chains</p>
        </motion.div>

        <div className="lg:grid lg:grid-cols-5 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Row - mobile only */}
            <div className="grid grid-cols-3 gap-2 mb-5 lg:hidden">
              {[
                { value: 10, suffix: "+", label: "Networks", icon: Globe },
                { value: 15, suffix: "s", label: "Updates", icon: Clock },
                { label: "Precision", textValue: "Gwei", icon: Fuel },
              ].map((stat) => (
                <Card key={stat.label} className="glass-subtle border-border/30 text-center transition-all duration-200 active:scale-[0.98]">
                  <CardContent className="p-3">
                    <stat.icon className="w-4 h-4 text-primary mx-auto mb-1.5 opacity-70" />
                    <p className="text-lg font-bold text-primary leading-tight">
                      {stat.value != null ? <AnimatedNumber value={stat.value} suffix={stat.suffix} /> : stat.textValue}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass border-border/50 overflow-hidden">
              <GlowBar variant="success" />
              <CardContent className="pt-4">
                <GasEstimator standalone />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4 mt-5 lg:mt-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Stats - desktop only */}
              <div className="hidden lg:grid grid-cols-1 gap-3">
                {[
                  { value: 10, suffix: "+", label: "Networks Tracked", icon: Globe },
                  { value: 15, suffix: "s", label: "Refresh Rate", icon: Clock },
                  { label: "Gwei Precision", textValue: "Gwei", icon: Fuel },
                ].map((stat) => (
                  <Card key={stat.label} className="glass-subtle border-border/30 transition-all duration-200 md:hover:shadow-lg md:hover:border-primary/20">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary leading-tight">
                          {stat.value != null ? <AnimatedNumber value={stat.value} suffix={stat.suffix} /> : stat.textValue}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pro Tips */}
              <div className="p-4 rounded-lg glass-subtle border border-primary/10">
                <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Pro Tips
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Trade during off-peak hours for lower gas fees</li>
                  <li>• L2 chains offer 10-100x cheaper gas than Ethereum</li>
                  <li>• Batch transactions when possible to save on gas</li>
                </ul>
              </div>

              {/* Related */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Related Tools</p>
                <div className="flex gap-2 flex-wrap">
                  <Link to="/tools/rebalancer">
                    <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                      <PieChart className="w-3 h-3" /> Rebalancer
                    </Badge>
                  </Link>
                  <Link to="/compare">
                    <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                      <ArrowRightLeft className="w-3 h-3" /> Token Compare
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
});

export default GasPage;
