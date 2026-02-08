import { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { TokenWatchlist } from "@/components/TokenWatchlist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ArrowLeft, Layers, RefreshCw, Lightbulb, Fuel, Bell } from "lucide-react";
import { motion } from "framer-motion";

const WatchlistPage = memo(function WatchlistPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Token Watchlist | xlama Trading Tools</title>
        <meta name="description" content="Track your favorite cryptocurrencies with real-time prices across 25+ chains." />
      </Helmet>

      <main className="container px-4 pb-8 max-w-4xl mx-auto">
        {/* Back link */}
        <Link to="/tools">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
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
            <Eye className="w-3.5 h-3.5" />
            <span>Watchlist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">Token Watchlist</h1>
          <p className="text-muted-foreground text-sm">Track your favorite tokens with real-time prices</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { value: "25+", label: "Chains", icon: Layers },
            { value: "30s", label: "Refresh Rate", icon: RefreshCw },
            { value: "∞", label: "Tokens", icon: Eye },
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

        {/* Main Content */}
        <TokenWatchlist />

        {/* Pro Tips */}
        <div className="mt-5 p-4 rounded-lg glass-subtle border border-primary/10">
          <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Pro Tips
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Pin your most-traded tokens for quick access</li>
            <li>• Prices auto-refresh every 30 seconds</li>
            <li>• Tap any token to see detailed charts and info</li>
          </ul>
        </div>

        {/* Related Tools */}
        <div className="mt-5">
          <p className="text-xs text-muted-foreground mb-2">Related Tools</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/tools/gas">
              <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                <Fuel className="w-3 h-3" /> Gas Estimator
              </Badge>
            </Link>
            <Link to="/tools/alerts">
              <Badge variant="secondary" className="gap-1 hover:bg-primary/10 cursor-pointer">
                <Bell className="w-3 h-3" /> Price Alerts
              </Badge>
            </Link>
          </div>
        </div>
      </main>
    </AppLayout>
  );
});

export default WatchlistPage;
