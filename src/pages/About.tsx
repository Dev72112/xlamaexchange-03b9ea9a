import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { Users, Zap, Heart, Code, Target, Rocket, ArrowRightLeft, Link2, Shield, ExternalLink, Activity } from "lucide-react";
import { XIcon, TelegramIcon, SOCIAL_LINKS } from "@/components/SocialIcons";
import { Card, CardContent } from "@/components/ui/card";

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

  const techPartners = [
    {
      name: "OKX Wallet",
      description: "Recommended wallet for seamless multi-chain trading",
      logo: "https://static.okx.com/cdn/assets/imgs/2112/1C734C18B89E3B51.png",
      url: "https://www.okx.com/web3/wallet",
      icon: Shield,
    },
    {
      name: "OKX DEX",
      description: "DEX aggregation across 400+ exchanges on 25+ chains",
      logo: "https://static.okx.com/cdn/assets/imgs/2112/1C734C18B89E3B51.png",
      url: "https://www.okx.com/web3/dex",
      icon: ArrowRightLeft,
    },
    {
      name: "Li.Fi",
      description: "Cross-chain bridging via 20+ bridge protocols",
      logo: "https://li.fi/logo192.png",
      url: "https://li.fi",
      icon: Link2,
    },
    {
      name: "ChangeNOW",
      description: "Instant crypto exchange for 900+ tokens (1-5 min)",
      logo: "https://changenow.io/images/changenow-logo.svg",
      url: "https://changenow.io",
      icon: Zap,
    },
    {
      name: "Hyperliquid",
      description: "Perpetual futures with up to 50x leverage",
      logo: "https://hyperliquid.xyz/favicon.ico",
      url: "https://hyperliquid.xyz",
      icon: Activity,
    },
    {
      name: "Alchemy",
      description: "Enterprise-grade RPC for EVM & Solana",
      logo: "https://www.alchemy.com/favicon.ico",
      url: "https://www.alchemy.com",
      icon: Zap,
    },
  ];

  return (
    <Layout>
      <Helmet>
        <title>About xLama - Community-Powered Crypto Exchange</title>
        <meta
          name="description"
          content="Learn about xLama - the community-fueled crypto exchange built from the trenches. No VCs, no funding, just pure community energy and the best rates across 25+ chains."
        />
        <meta property="og:title" content="About xLama - Community-Powered Crypto Exchange" />
        <meta property="og:description" content="The community-fueled crypto exchange built from the trenches. No VCs, no funding, just pure community energy." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About xLama - Community-Powered Crypto Exchange" />
        <meta name="twitter:description" content="The community-fueled crypto exchange built from the trenches. No VCs, no funding, just pure community energy." />
      </Helmet>

      <main className="container pb-12 sm:pb-16 lg:pb-20">
        {/* Hero Section */}
        <section className="text-center mb-16" aria-labelledby="about-heading">
          <h1 id="about-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            WTF is <span className="text-primary">xLAMA</span>?
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The unapologetic, chaos-powered crypto exchange — existing purely for builders, 
            meme lords, and market raiders who thrive on community vibes.
          </p>
        </section>

        {/* Origin Story */}
        <section className="max-w-4xl mx-auto mb-20" aria-labelledby="origin-heading">
          <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <h2 id="origin-heading" className="text-2xl sm:text-3xl font-bold mb-6">The Legend of xLAMA</h2>
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
        </section>

        {/* Values Grid */}
        <section className="mb-20" aria-labelledby="values-heading">
          <h2 id="values-heading" className="text-2xl sm:text-3xl font-bold text-center mb-10">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <article 
                key={index}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors sweep-effect shadow-premium-hover performance-critical"
              >
                <value.icon className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Born From Chaos */}
        <section className="max-w-4xl mx-auto mb-20" aria-labelledby="chaos-heading">
          <h2 id="chaos-heading" className="text-2xl sm:text-3xl font-bold mb-6">Born From Chaos</h2>
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
        </section>

        {/* Principles */}
        <section className="mb-20" aria-labelledby="principles-heading">
          <h2 id="principles-heading" className="text-2xl sm:text-3xl font-bold text-center mb-10">What We Stand For</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {principles.map((principle, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border sweep-effect"
              >
                <principle.icon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="font-medium">{principle.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Partners */}
        <section className="mb-20" aria-labelledby="partners-heading">
          <h2 id="partners-heading" className="text-2xl sm:text-3xl font-bold text-center mb-10">Technology Partners</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            We integrate with industry-leading protocols to provide the best trading experience across 25+ chains.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {techPartners.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full bg-card/50 border-border hover:border-primary/30 transition-all group-hover:shadow-lg sweep-effect glow-border-animated">
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                      <img 
                        src={partner.logo} 
                        alt={partner.name} 
                        className="w-10 h-10 rounded-lg object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <partner.icon className="w-6 h-6 text-primary hidden" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center justify-center gap-1">
                      {partner.name}
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{partner.description}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </section>

        {/* Team Quote */}
        <section className="max-w-3xl mx-auto mb-20">
          <blockquote className="text-center">
            <p className="text-lg sm:text-xl italic text-muted-foreground mb-4">
              "Created by a squad of passionate devs who believe the best things in crypto come from the trenches, 
              not the boardrooms. We're here to build, meme, and ride whatever wave the market throws at us. 
              No promises, just pure community energy."
            </p>
            <footer className="text-primary font-semibold">— The xLama Team</footer>
          </blockquote>
        </section>

        {/* Join Community CTA */}
        <section className="text-center p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold mb-4">Join the Community</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            If you're here early — you didn't find xLama by accident. 
            Join the lurkers who stayed, the builders who kept going, and the memers who understood the joke.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href={SOCIAL_LINKS.x.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity sweep-effect sweep-effect-fast"
              aria-label={SOCIAL_LINKS.x.label}
            >
              <XIcon className="w-5 h-5" />
              Follow on X
            </a>
            <a
              href={SOCIAL_LINKS.telegram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity sweep-effect sweep-effect-fast"
              aria-label={SOCIAL_LINKS.telegram.label}
            >
              <TelegramIcon className="w-5 h-5" />
              Join Telegram
            </a>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center mt-12 text-muted-foreground">
          <p>
            Questions? Reach out at{" "}
            <a href="mailto:support.xlama@defixlama.com" className="text-primary hover:underline">
              support.xlama@defixlama.com
            </a>
          </p>
        </section>
      </main>
    </Layout>
  );
};

export default About;
