import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { Users, Zap, Heart, Code, Target, Rocket } from "lucide-react";

// Social icons
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const About = () => {
  const values = [
    {
      icon: Users,
      title: "Community First",
      description: "Built by the community, for the community. No suits, no VCs, just vibes."
    },
    {
      icon: Zap,
      title: "Zero Funding",
      description: "Pockets emptier than a bear market. Maximum hustle energy."
    },
    {
      icon: Heart,
      title: "Pure Passion",
      description: "Embracing the meme. Living the dream. Building with purpose."
    },
    {
      icon: Code,
      title: "XLayer Native",
      description: "Home on XLayer. Multi-chain enabled. Ready for liftoff."
    },
  ];

  const principles = [
    { icon: Target, text: "Build first, talk later" },
    { icon: Heart, text: "Culture before hype" },
    { icon: Rocket, text: "Progress over perfection" },
    { icon: Zap, text: "Memes with meaning" },
  ];

  return (
    <Layout>
      <Helmet>
        <title>About xLama - Community-Powered Crypto Exchange</title>
        <meta
          name="description"
          content="Learn about xLama - the community-fueled crypto exchange built from the trenches. No VCs, no funding, just pure community energy and the best rates across 20+ chains."
        />
      </Helmet>

      <div className="container py-12 sm:py-16 lg:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            WTF is <span className="text-primary">xLAMA</span>?
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The unapologetic, chaos-powered crypto exchange — existing purely for builders, 
            meme lords, and market raiders who thrive on community vibes.
          </p>
        </div>

        {/* Origin Story */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">The Legend of xLAMA</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                In a land flooded with VC bags, overpromised roadmaps, and loud narratives… 
                one llama showed up with <strong className="text-foreground">nothing</strong>.
              </p>
              <p>
                No funding. No insiders. No shortcuts.
              </p>
              <p>
                Just a few broke devs, empty wallets, and an unreasonable belief that culture still matters.
              </p>
              <p className="text-foreground font-medium">
                They called it xLama.
              </p>
            </div>
          </div>
        </div>

        {/* Values Grid */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <value.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Born From Chaos */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Born From Chaos</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              xLama wasn't planned in a boardroom. It wasn't backed by funds or whispered in private groups.
            </p>
            <p>
              It was built in the open — during long nights, broken builds, and bear-market silence.
            </p>
            <p>
              Every line of code was a choice. Every meme was a signal. Every update was shipped, not promised.
            </p>
          </div>
        </div>

        {/* Principles */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">What We Stand For</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {principles.map((principle, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border"
              >
                <principle.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium">{principle.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Quote */}
        <div className="max-w-3xl mx-auto mb-20">
          <blockquote className="text-center">
            <p className="text-lg sm:text-xl italic text-muted-foreground mb-4">
              "Created by a squad of NB devs who believe the best things in crypto come from the trenches, 
              not the boardrooms. We're here to build, meme, and ride whatever wave the market throws at us. 
              No promises, just pure community energy."
            </p>
            <footer className="text-primary font-semibold">— The xLama Team</footer>
          </blockquote>
        </div>

        {/* Join Community CTA */}
        <div className="text-center p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Join the Community</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            If you're here early — you didn't find xLama by accident. 
            Join the lurkers who stayed, the builders who kept going, and the memers who understood the joke.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://x.com/XLAMA_OKX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <XIcon className="w-5 h-5" />
              Follow on X
            </a>
            <a
              href="https://t.me/XLAMA_OKX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              <TelegramIcon className="w-5 h-5" />
              Join Telegram
            </a>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mt-12 text-muted-foreground">
          <p>
            Questions? Reach out at{" "}
            <a href="mailto:support.xlama@defixlama.com" className="text-primary hover:underline">
              support.xlama@defixlama.com
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default About;
