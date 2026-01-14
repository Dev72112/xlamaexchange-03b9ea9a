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
      {/* Premium Animated Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Animated gradient orbs with glow */}
        <div 
          className="absolute top-0 left-1/4 w-64 sm:w-80 lg:w-96 h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-3xl animate-float" 
          style={{ willChange: 'transform, opacity' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-56 sm:w-72 lg:w-80 h-56 sm:h-72 lg:h-80 bg-gradient-to-tl from-accent/20 to-primary/10 rounded-full blur-3xl animate-float" 
          style={{ animationDelay: "2s", willChange: 'transform, opacity' }} 
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[500px] lg:w-[600px] h-[400px] sm:h-[500px] lg:h-[600px] bg-gradient-radial from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "1s", willChange: 'opacity' }} 
        />
        
        {/* Premium grid pattern with gradient fade */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
      </div>

      <div className="container px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mascot + Badge with glass effect */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 animate-fade-in">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
              <img 
                src={xlamaMascot} 
                alt="xLama mascot" 
                width={56}
                height={56}
                fetchPriority="high"
                decoding="async"
                className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full ring-2 ring-primary/30 shrink-0 hover-lift"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border border-primary/30 text-xs sm:text-sm text-primary shadow-glow">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
              </span>
              <span className="truncate font-medium">Live • DEX Aggregation Across 25+ Chains</span>
            </div>
          </div>

          {/* Headline with enhanced gradient */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 tracking-tight animate-fade-in-up">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              The Ultimate
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
              Crypto Exchange Hub
            </span>
          </h1>

          {/* Description with subtle animation */}
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Swap 900+ cryptocurrencies instantly, trade on-chain across 400+ DEXs, or bridge assets across 20+ chains. Best rates, no registration.
          </p>

          {/* CTA Buttons with premium sweep animation */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 lg:gap-4 justify-center mb-8 sm:mb-10 lg:mb-12 px-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              className="text-sm sm:text-base px-6 sm:px-8 press-effect w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 border-0 sweep-effect sweep-effect-fast shadow-premium-hover"
              onClick={() => document.getElementById('exchange-widget')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Trading
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-sm sm:text-base px-6 sm:px-8 press-effect w-full sm:w-auto glass border-primary/30 hover:border-primary/50 hover:bg-primary/5 sweep-effect"
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
              className="text-sm sm:text-base px-6 sm:px-8 press-effect w-full sm:w-auto hover:bg-surface-elevated sweep-effect"
              asChild
            >
              <a href="https://defixlama.com" target="_blank" rel="noopener noreferrer">
                Analytics
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Features Grid with premium glass cards + sweep effect */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 px-1">
            {features.map((feature, index) => (
              <article 
                key={feature.label}
                className={`group relative p-3 sm:p-4 lg:p-5 xl:p-6 rounded-xl glass border border-border/50 hover:border-primary/40 transition-all duration-300 overflow-hidden sweep-effect shadow-premium-hover glow-border-animated performance-critical ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 80)}
              >
                {/* Enhanced glow on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 text-primary mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
                    <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  </div>
                  <div className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold text-center leading-tight">
                    {feature.label}
                  </div>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground mt-0.5 sm:mt-1 text-center leading-tight">
                    {feature.description}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
