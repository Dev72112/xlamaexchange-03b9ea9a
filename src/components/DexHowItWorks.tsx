import { Wallet, Coins, ArrowRightLeft, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Connect your OKX Wallet or MetaMask to get started with DEX swaps.",
  },
  {
    icon: Coins,
    title: "Select Tokens",
    description: "Choose which tokens you want to swap. We aggregate the best rates across 400+ DEXs.",
  },
  {
    icon: ArrowRightLeft,
    title: "Review & Approve",
    description: "Review the quote and approve token spending if needed. Confirm the transaction in your wallet.",
  },
  {
    icon: CheckCircle2,
    title: "Swap Complete",
    description: "Your tokens are swapped directly on-chain. Track the transaction on the block explorer.",
  },
];

export function DexHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How DEX Swaps Work
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Swap tokens directly on-chain with the best rates from 400+ decentralized exchanges.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="bg-card rounded-xl p-6 border border-border hover:border-foreground/20 transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <step.icon className="w-7 h-7 text-foreground" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-sm">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
