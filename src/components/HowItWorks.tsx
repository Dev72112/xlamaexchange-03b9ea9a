import { Search, Wallet, ArrowRightLeft, CheckCircle2 } from "lucide-react";

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

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Exchange cryptocurrency in just a few simple steps. No account required.
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
