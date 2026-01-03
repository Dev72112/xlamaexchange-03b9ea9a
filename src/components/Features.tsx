import { memo } from "react";
import { Shield, Zap, Globe, Lock, Clock, Coins } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const features = [
  {
    icon: Shield,
    title: "Secure & Private",
    description: "No registration required. Your personal data stays private.",
  },
  {
    icon: Zap,
    title: "Fast Exchanges",
    description: "Most exchanges complete in just 10-30 minutes.",
  },
  {
    icon: Globe,
    title: "Hundreds of Coins",
    description: "Exchange between hundreds of coins and tokens.",
  },
  {
    icon: Lock,
    title: "Fixed Rates",
    description: "Lock in your rate to avoid market volatility.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Exchange crypto anytime, anywhere in the world.",
  },
  {
    icon: Coins,
    title: "No Hidden Fees",
    description: "Transparent pricing. What you see is what you get.",
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
            The simplest way to exchange cryptocurrency without compromising on security or speed.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
