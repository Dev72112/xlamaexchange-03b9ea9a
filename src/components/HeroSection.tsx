import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Shield, Zap, Globe, Coins, Sparkles } from "lucide-react";
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
  const navigate = useNavigate();
  
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Premium Animated Background with Dynamic Gradients */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Primary animated orb - larger with blur */}
        <div 
          className="absolute top-0 left-1/4 w-72 sm:w-96 lg:w-[500px] h-72 sm:h-96 lg:h-[500px] bg-gradient-to-br from-primary/40 via-primary/20 to-transparent rounded-full blur-[100px] animate-float opacity-60" 
          style={{ willChange: 'transform, opacity' }}
        />
        
        {/* Secondary animated orb with offset timing */}
        <div 
          className="absolute bottom-0 right-1/4 w-64 sm:w-80 lg:w-[400px] h-64 sm:h-80 lg:h-[400px] bg-gradient-to-tl from-accent/30 via-primary/15 to-transparent rounded-full blur-[80px] animate-float opacity-50" 
          style={{ animationDelay: "2s", willChange: 'transform, opacity' }} 
        />
        
        {/* Central radial glow - pulsing */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] lg:w-[900px] h-[500px] sm:h-[700px] lg:h-[900px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-[120px] animate-pulse-glow" 
          style={{ animationDuration: '4s', willChange: 'opacity' }} 
        />
        
        {/* Floating accent particles */}
        <div 
          className="absolute top-1/3 right-1/3 w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s", animationDuration: "6s" }}
        />
        <div 
          className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "3s", animationDuration: "7s" }}
        />
        
        {/* Premium grid pattern with gradient fade */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.4) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
        />
        
        {/* Animated gradient lines */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              hsl(var(--primary) / 0.3) 100px,
              hsl(var(--primary) / 0.3) 101px
            )`,
            animation: 'gradient-shift 20s linear infinite',
          }}
        />
      </div>

      <div className="container px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          {/* Mascot + Badge with premium glass effect */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in">
            <div className="relative group">
              {/* Outer glow ring */}
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/60 via-accent/40 to-primary/60 rounded-full blur-lg opacity-50 group-hover:opacity-80 transition-opacity animate-pulse-glow" />
              {/* Inner glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-full blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
              <img 
                src={xlamaMascot} 
                alt="xLama mascot" 
                width={64}
                height={64}
                fetchPriority="high"
                decoding="async"
                className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full ring-2 ring-primary/40 shrink-0 hover-lift transition-transform duration-300"
              />
            </div>
            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full glass border border-primary/40 text-xs sm:text-sm text-primary shadow-glow backdrop-blur-xl">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
              </span>
              <span className="truncate font-medium tracking-wide">Live • DEX Aggregation Across 25+ Chains</span>
            </div>
          </div>

          {/* Headline with enhanced animated gradient */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 tracking-tight animate-fade-in-up">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent block sm:inline">
              The Ultimate
            </span>
            <br className="hidden sm:block" />
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:300%_auto]">
                Crypto Exchange Hub
              </span>
              {/* Sparkle accent */}
              <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-primary/60 animate-pulse hidden sm:block" />
            </span>
          </h1>

          {/* Description with subtle animation */}
          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2 animate-fade-in font-light" style={{ animationDelay: '0.2s' }}>
            Swap 900+ cryptocurrencies instantly, trade on-chain across 400+ DEXs, or bridge assets across 20+ chains. 
            <span className="text-foreground font-medium"> Best rates, no registration.</span>
          </p>

          {/* Premium CTA Buttons with sweep animation */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-14 px-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {/* Primary CTA - Start Trading */}
            <Button 
              size="lg" 
              className="group relative text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 press-effect w-full sm:w-auto bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-xl shadow-primary/30 border-0 overflow-hidden transition-all duration-300"
              onClick={() => navigate('/swap')}
            >
              {/* Sweep effect overlay */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center gap-2">
                Start Trading
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
            </Button>
            
            {/* Secondary CTA - Visit xlama.fun */}
            <Button 
              variant="outline" 
              size="lg" 
              className="group text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 press-effect w-full sm:w-auto glass border-primary/40 hover:border-primary/60 hover:bg-primary/10 transition-all duration-300"
              asChild
            >
              <a href="https://xlama.fun" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                Visit xlama.fun
                <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
              </a>
            </Button>
            
            {/* Tertiary CTA - Analytics */}
            <Button 
              variant="ghost" 
              size="lg" 
              className="group text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 press-effect w-full sm:w-auto hover:bg-surface-elevated transition-all duration-300"
              asChild
            >
              <a href="https://defixlama.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                Analytics
                <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Features Grid with premium glass cards + sweep effect */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1">
            {features.map((feature, index) => (
              <article 
                key={feature.label}
                className={`group relative p-4 sm:p-5 lg:p-6 rounded-2xl glass border border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl hover:shadow-primary/10 performance-critical ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index, 80)}
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Top glow accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                    <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-center leading-tight">
                    {feature.label}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 text-center leading-tight">
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
