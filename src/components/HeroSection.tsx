import { ArrowRight, ExternalLink, Shield, Zap, Globe, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const features = [
    {
      icon: Globe,
      label: "25+ Chains",
      description: "Multi-chain support",
    },
    {
      icon: Coins,
      label: "900+ Tokens",
      description: "Instant swaps",
    },
    {
      icon: Shield,
      label: "Non-Custodial",
      description: "Your keys, your crypto",
    },
    {
      icon: Zap,
      label: "Best Rates",
      description: "Aggregated liquidity",
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

          {/* Features Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature) => (
              <div 
                key={feature.label}
                className="p-4 sm:p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 text-primary mb-2">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  {feature.label}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
