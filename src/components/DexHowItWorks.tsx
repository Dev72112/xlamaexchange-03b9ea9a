import { memo } from "react";
import { Wallet, Coins, ArrowRightLeft, CheckCircle2, Shield, Zap } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const steps = [
  {
    icon: Wallet,
    title: "Connect Your Wallet",
    description: "Connect Phantom, Solflare, MetaMask, OKX Wallet, Sui Wallet, Tonkeeper or TokenPocket. We support Solana, EVM chains, Sui, TON and Tron.",
  },
  {
    icon: Coins,
    title: "Select Your Tokens",
    description: "Choose the tokens you want to swap. We aggregate quotes from 400+ DEXs across 25+ chains to find you the best rate.",
  },
  {
    icon: ArrowRightLeft,
    title: "Review & Confirm",
    description: "Review the quote, price impact, and gas estimate. Approve token spending if needed, then confirm the swap in your wallet.",
  },
  {
    icon: CheckCircle2,
    title: "Swap Complete",
    description: "Your tokens are swapped directly on-chain in seconds. Track the transaction on the block explorer with full transparency.",
  },
];

const features = [
  { icon: Zap, title: "Lightning Fast", description: "Swaps execute in seconds" },
  { icon: Shield, title: "Non-Custodial", description: "Your keys, your crypto" },
];

export const DexHowItWorks = memo(function DexHowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-secondary/50" aria-labelledby="dex-how-it-works-heading">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <h2 id="dex-how-it-works-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            How DEX Aggregator Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Swap tokens directly on-chain with the best rates from 400+ decentralized exchanges across Solana, Ethereum, Base, Sui, TON, Tron and more.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10 sm:mb-12">
          {steps.map((step, index) => (
            <article 
              key={step.title} 
              className={`relative group ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 100)}
            >
              <div className="bg-card rounded-xl p-5 sm:p-6 border border-border hover:border-primary/20 hover-lift transition-all duration-300 h-full">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                  aria-hidden="true"
                >
                  <step.icon className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
                </div>
                <div 
                  className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-xs sm:text-sm"
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

        <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-card rounded-full border border-border ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index + steps.length, 80)}
            >
              <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
              <span className="font-medium text-sm sm:text-base">{feature.title}</span>
              <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">{feature.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
