import { memo } from "react";
import { Shield, Zap, Globe, Lock, Clock, Coins, Target, Bell } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const features = [
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Non-custodial swaps. No registration, no KYC. Your keys, your crypto.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "DEX swaps confirm in seconds. Instant mode exchanges in 10-30 minutes.",
  },
  {
    icon: Globe,
    title: "25+ Chains",
    description: "Trade across Ethereum, Solana, Sui, TON, Tron, and 20+ more networks.",
  },
  {
    icon: Target,
    title: "Limit Orders",
    description: "Set target prices and get notified when the market hits your level.",
  },
  {
    icon: Bell,
    title: "Price Alerts",
    description: "Real-time notifications when tokens reach your target price.",
  },
  {
    icon: Lock,
    title: "Cross-Chain",
    description: "Bridge assets between chains with secure, audited protocols.",
  },
  {
    icon: Clock,
    title: "24/7 Trading",
    description: "Exchange crypto anytime. Markets never sleep, neither do we.",
  },
  {
    icon: Coins,
    title: "Best Rates",
    description: "Aggregated from 400+ DEXs. Transparent fees, no hidden costs.",
  },
];

export const Features = memo(function Features() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="features-heading">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <h2 id="features-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Why Choose xlama
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            The simplest way to exchange cryptocurrency without compromising on security, speed, or features.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`group p-5 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/20 hover-lift transition-all duration-300 ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 60)}
            >
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent transition-colors"
                aria-hidden="true"
              >
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
