import { Wallet, Coins, ArrowRightLeft, CheckCircle2, Shield, Zap } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Connect Your Wallet",
    description: "Connect Phantom, Solflare, MetaMask, OKX Wallet, Sui Wallet, Tonkeeper or TokenPocket. We support Solana, EVM chains, Sui, TON and Tron.",
  },
  {
    icon: Coins,
    title: "Select Your Tokens",
    description: "Choose the tokens you want to swap. We aggregate quotes from 400+ DEXs across 20+ chains to find you the best rate.",
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

export function DexHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How DEX Aggregator Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Swap tokens directly on-chain with the best rates from 400+ decentralized exchanges across Solana, Ethereum, Base, Sui, TON, Tron and more.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
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

        <div className="flex flex-wrap justify-center gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 px-6 py-3 bg-card rounded-full border border-border">
              <feature.icon className="w-5 h-5 text-primary" />
              <span className="font-medium">{feature.title}</span>
              <span className="text-muted-foreground text-sm">{feature.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
