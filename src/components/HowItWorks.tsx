import { memo } from "react";
import { Search, Wallet, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const steps = [
  {
    icon: Search,
    title: "Choose Your Pair",
    description: "Select the cryptocurrency you want to exchange and the one you wish to receive.",
  },
  {
    icon: Wallet,
    title: "Enter Address",
    description: "Provide your wallet address where you'd like to receive your new cryptocurrency.",
  },
  {
    icon: ArrowRightLeft,
    title: "Send Funds",
    description: "Transfer your crypto to the provided deposit address. No registration needed.",
  },
  {
    icon: CheckCircle2,
    title: "Receive Crypto",
    description: "Once confirmed, your exchanged cryptocurrency is sent directly to your wallet.",
  },
];

export const HowItWorks = memo(function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-secondary/50" aria-labelledby="how-it-works-heading">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Exchange cryptocurrency in just a few simple steps. No account required.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article 
              key={step.title} 
              className={`relative group ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 100)}
            >
              <div className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:border-primary/20 hover-lift transition-all duration-300 h-full sweep-effect shadow-premium-hover performance-critical overflow-hidden">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                  aria-hidden="true"
                >
                  <step.icon className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
                </div>
                <div 
                  className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-xs sm:text-sm z-10"
                  aria-label={`Step ${index + 1}`}
                >
                  {index + 1}
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
