import { Shield, Zap, Globe, Lock, Clock, Coins } from "lucide-react";

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

export function Features() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose xlama
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The simplest way to exchange cryptocurrency without compromising on security or speed.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-foreground/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                <feature.icon className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
