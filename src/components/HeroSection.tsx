import { ArrowRight, ExternalLink, TrendingUp, Activity, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDexStats } from "@/hooks/useDexStats";
import { Skeleton } from "@/components/ui/skeleton";

function formatVolume(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function HeroSection() {
  const { data: stats, isLoading, isError } = useDexStats();

  const statItems = [
    {
      icon: Activity,
      label: "24h Volume",
      value: stats?.total24h,
      change: stats?.change_1d,
    },
    {
      icon: TrendingUp,
      label: "7d Volume",
      value: stats?.total7d,
      change: stats?.change_7d,
    },
    {
      icon: Layers,
      label: "30d Volume",
      value: stats?.total30d,
      change: stats?.change_1m,
    },
    {
      icon: Zap,
      label: "DEX Protocols",
      value: stats?.protocols,
      isCount: true,
    },
  ];

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Live DEX Aggregation Across 25+ Chains
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              The Ultimate
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Crypto Exchange Hub
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Swap 900+ cryptocurrencies instantly or trade on-chain across 400+ DEXs. 
            Best rates, no registration, maximum security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-base px-8"
              onClick={() => document.getElementById('exchange-widget')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Trading
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base px-8"
              asChild
            >
              <a href="https://xlama.fun" target="_blank" rel="noopener noreferrer">
                Visit xlama.fun
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="text-base px-8"
              asChild
            >
              <a href="https://defixlama.com" target="_blank" rel="noopener noreferrer">
                Analytics
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statItems.map((stat, index) => (
              <div 
                key={stat.label}
                className="p-4 sm:p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-medium">{stat.label}</span>
                </div>
                
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mx-auto" />
                ) : isError ? (
                  <span className="text-lg font-semibold text-muted-foreground">--</span>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold">
                      {stat.isCount 
                        ? `${stat.value?.toLocaleString()}+` 
                        : formatVolume(stat.value || 0)
                      }
                    </div>
                    {stat.change !== undefined && (
                      <div className={`text-xs sm:text-sm font-medium mt-1 ${
                        stat.change >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {formatChange(stat.change)}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
