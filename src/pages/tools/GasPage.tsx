import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { GasEstimator } from "@/components/GasEstimator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlowBar } from "@/components/ui/glow-bar";
import { Fuel, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const GasPage = memo(function GasPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Gas Estimator | xlama Trading Tools</title>
        <meta name="description" content="Monitor real-time gas prices across multiple blockchain networks." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-2xl mx-auto">
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
            <Fuel className="w-3.5 h-3.5" />
            <span>Gas Estimator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Gas Estimator</h1>
          <p className="text-muted-foreground text-sm">Real-time gas prices across chains</p>
        </motion.div>

        {/* Content */}
        <Card className="glass border-border/50 overflow-hidden">
          <GlowBar variant="success" />
          <CardContent className="pt-4">
            <GasEstimator />
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
});

export default GasPage;