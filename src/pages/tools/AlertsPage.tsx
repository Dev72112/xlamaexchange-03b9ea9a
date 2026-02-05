import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PriceAlerts } from "@/components/PriceAlerts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlowBar } from "@/components/ui/glow-bar";
import { Bell, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const AlertsPage = memo(function AlertsPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Price Alerts | xlama Trading Tools</title>
        <meta name="description" content="Set up price alerts and get notified when your target prices are reached." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-4xl mx-auto">
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
            <Bell className="w-3.5 h-3.5" />
            <span>Price Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Price Alerts</h1>
          <p className="text-muted-foreground text-sm">Get notified on price movements</p>
        </motion.div>

        {/* Content */}
        <Card className="glass border-border/50 overflow-hidden">
          <GlowBar variant="multi" />
          <CardContent className="pt-4">
            <PriceAlerts />
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
});

export default AlertsPage;