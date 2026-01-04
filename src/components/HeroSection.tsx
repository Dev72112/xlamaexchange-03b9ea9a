import { memo } from "react";
import { ArrowRight, ExternalLink, Shield, Zap, Globe, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import xlamaMascot from "@/assets/xlama-mascot.png";

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

export const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Animated Background - optimized with reduced repaints */}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
        {/* Gradient orbs with will-change for smoother animations */}
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pulse-subtle" 
          style={{ willChange: 'opacity' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl pulse-subtle" 
          style={{ animationDelay: "1s", willChange: 'opacity' }} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pulse-subtle" 
          style={{ animationDelay: "2s", willChange: 'opacity' }} 
        />
        
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
          {/* Mascot + Badge */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img 
              src={xlamaMascot} 
              alt="xLama mascot" 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-primary/20"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>Live DEX Aggregation Across 25+ Chains</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              The Ultimate
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent-foreground bg-clip-text text-transparent">
              Crypto Exchange Hub
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Swap 900+ cryptocurrencies instantly or trade on-chain across 400+ DEXs. 
            Best rates, no registration, maximum security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-base px-8 hover-lift press-effect"
              onClick={() => document.getElementById('exchange-widget')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Trading
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base px-8 hover-lift press-effect"
              asChild
            >
              <a href="https://xlama.fun" target="_blank" rel="noopener noreferrer">
                Visit xlama.fun
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              className="text-base px-8 hover-lift press-effect"
              asChild
            >
              <a href="https://defixlama.com" target="_blank" rel="noopener noreferrer">
                Analytics
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {features.map((feature, index) => (
              <article 
                key={feature.label}
                className={`p-4 sm:p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 hover-lift transition-colors ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 80)}
              >
                <div className="flex items-center justify-center gap-2 text-primary mb-2" aria-hidden="true">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  {feature.label}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {feature.description}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
