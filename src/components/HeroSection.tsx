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
    description: "1-5 min swaps",
  },
  {
    icon: Shield,
    label: "OKX Wallet",
    description: "Recommended",
  },
  {
    icon: Zap,
    label: "Best Rates",
    description: "400+ DEXs",
  },
];

export const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-20 lg:py-28">
      {/* Animated Background - optimized with reduced repaints */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Gradient orbs with will-change for smoother animations */}
        <div 
          className="absolute top-0 left-1/4 w-64 sm:w-80 lg:w-96 h-64 sm:h-80 lg:h-96 bg-primary/20 rounded-full blur-3xl pulse-subtle" 
          style={{ willChange: 'opacity' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-56 sm:w-72 lg:w-80 h-56 sm:h-72 lg:h-80 bg-accent/15 rounded-full blur-3xl pulse-subtle" 
          style={{ animationDelay: "1s", willChange: 'opacity' }} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[500px] lg:w-[600px] h-[400px] sm:h-[500px] lg:h-[600px] bg-primary/10 rounded-full blur-3xl pulse-subtle" 
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

      <div className="container px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mascot + Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <img 
              src={xlamaMascot} 
              alt="xLama mascot" 
              className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full border-2 border-primary/20 shrink-0"
            />
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
              </span>
              <span className="truncate">Live • DEX Aggregation Across 25+ Chains</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              The Ultimate
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent-foreground bg-clip-text text-transparent">
              Crypto Exchange Hub
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
            Swap 900+ cryptocurrencies instantly, trade on-chain across 400+ DEXs, or bridge assets across 20+ chains. Best rates, no registration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 lg:gap-4 justify-center mb-8 sm:mb-10 lg:mb-12 px-2">
            <Button 
              size="lg" 
              className="text-sm sm:text-base px-6 sm:px-8 hover-lift press-effect w-full sm:w-auto"
              onClick={() => document.getElementById('exchange-widget')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Trading
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-sm sm:text-base px-6 sm:px-8 hover-lift press-effect w-full sm:w-auto"
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
              className="text-sm sm:text-base px-6 sm:px-8 hover-lift press-effect w-full sm:w-auto"
              asChild
            >
              <a href="https://defixlama.com" target="_blank" rel="noopener noreferrer">
                Analytics
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6">
            {features.map((feature, index) => (
              <article 
                key={feature.label}
                className={`p-3 sm:p-4 lg:p-5 xl:p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/30 hover-lift transition-colors ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 80)}
              >
                <div className="flex items-center justify-center gap-2 text-primary mb-1.5 sm:mb-2" aria-hidden="true">
                  <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold">
                  {feature.label}
                </div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground mt-0.5 sm:mt-1">
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
