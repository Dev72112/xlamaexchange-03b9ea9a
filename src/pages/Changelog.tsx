import React from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  Shield,
  Bug,
  Wrench,
  Globe,
  ArrowLeftRight,
  Layers,
  Bell,
  TrendingUp,
  Rocket,
  Clock,
  Target,
  Users,
  Smartphone,
  BarChart3,
  Coins,
  Bot,
} from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: "major" | "minor" | "patch";
  changes: {
    category: "feature" | "improvement" | "fix" | "security";
    text: string;
  }[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-01-05",
    title: "Official Launch",
    description: "xLama is officially live with full multi-chain trading capabilities.",
    type: "major",
    changes: [
      { category: "feature", text: "DEX aggregation via OKX DEX with 400+ liquidity sources" },
      { category: "feature", text: "Cross-chain bridge via Li.Fi with 20+ bridge protocols" },
      { category: "feature", text: "Instant swaps via ChangeNOW with 900+ tokens" },
      { category: "feature", text: "Support for 25+ blockchain networks (EVM and non-EVM)" },
      { category: "feature", text: "Multi-wallet support: WalletConnect, Phantom, Sui Wallet, Tonkeeper, TronLink" },
      { category: "feature", text: "Limit orders with price target notifications" },
      { category: "feature", text: "DCA (Dollar Cost Averaging) automated orders" },
      { category: "feature", text: "Portfolio tracking with P&L monitoring" },
      { category: "feature", text: "Price alerts with push notifications" },
      { category: "feature", text: "Token watchlist and comparison tools" },
      { category: "feature", text: "Referral program with commission tracking" },
      { category: "security", text: "Non-custodial architecture - users control their keys" },
      { category: "security", text: "Cryptographic wallet signatures for all transactions" },
      { category: "security", text: "Rate limiting and nonce-based replay protection" },
    ],
  },
  {
    version: "0.9.0",
    date: "2025-12-20",
    title: "Beta Release",
    description: "Public beta with core trading functionality.",
    type: "minor",
    changes: [
      { category: "feature", text: "Initial DEX swap implementation" },
      { category: "feature", text: "Basic cross-chain bridging" },
      { category: "feature", text: "Wallet connection framework" },
      { category: "improvement", text: "Performance optimizations for quote fetching" },
      { category: "fix", text: "Fixed token balance display issues" },
    ],
  },
  {
    version: "0.8.0",
    date: "2025-12-01",
    title: "Alpha Testing",
    description: "Internal alpha release for testing core features.",
    type: "minor",
    changes: [
      { category: "feature", text: "Core swap interface" },
      { category: "feature", text: "Chain selection UI" },
      { category: "feature", text: "Token search and selection" },
      { category: "improvement", text: "UI/UX refinements based on feedback" },
    ],
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "feature":
      return <Sparkles className="h-4 w-4 text-green-500" />;
    case "improvement":
      return <Zap className="h-4 w-4 text-blue-500" />;
    case "fix":
      return <Bug className="h-4 w-4 text-orange-500" />;
    case "security":
      return <Shield className="h-4 w-4 text-purple-500" />;
    default:
      return <Wrench className="h-4 w-4 text-muted-foreground" />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "feature":
      return "New Feature";
    case "improvement":
      return "Improvement";
    case "fix":
      return "Bug Fix";
    case "security":
      return "Security";
    default:
      return "Other";
  }
};

const getVersionBadgeVariant = (type: string) => {
  switch (type) {
    case "major":
      return "default";
    case "minor":
      return "secondary";
    case "patch":
      return "outline";
    default:
      return "outline";
  }
};

const Changelog = () => {
  return (
    <Layout>
      <Helmet>
        <title>Changelog | xLama - Platform Updates & New Features</title>
        <meta
          name="description"
          content="Stay up to date with xLama platform updates, new features, improvements, and bug fixes. See what's new in our multi-chain DEX aggregator."
        />
        <link rel="canonical" href="https://xlama.io/changelog" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12" style={getStaggerStyle(0)}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Changelog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What&apos;s New
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track all updates, new features, and improvements to the xLama platform.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className={STAGGER_ITEM_CLASS}>
            <CardContent className="pt-6 text-center">
              <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">25+</p>
              <p className="text-sm text-muted-foreground">Chains</p>
            </CardContent>
          </Card>
          <Card className={STAGGER_ITEM_CLASS}>
            <CardContent className="pt-6 text-center">
              <ArrowLeftRight className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">400+</p>
              <p className="text-sm text-muted-foreground">DEX Sources</p>
            </CardContent>
          </Card>
          <Card className={STAGGER_ITEM_CLASS}>
            <CardContent className="pt-6 text-center">
              <Layers className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">20+</p>
              <p className="text-sm text-muted-foreground">Bridge Protocols</p>
            </CardContent>
          </Card>
          <Card className={STAGGER_ITEM_CLASS}>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">900+</p>
              <p className="text-sm text-muted-foreground">Tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-8">
            {CHANGELOG_DATA.map((entry, index) => (
              <div
                key={entry.version}
                className={`relative pl-12 md:pl-20 ${STAGGER_ITEM_CLASS}`}
                style={getStaggerStyle(index + 1)}
              >
                {/* Timeline dot */}
                <div className="absolute left-2 md:left-6 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <Badge variant={getVersionBadgeVariant(entry.type)}>
                        v{entry.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{entry.date}</span>
                    </div>
                    <h2 className="text-xl font-bold">{entry.title}</h2>
                    <p className="text-muted-foreground">{entry.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {getCategoryIcon(change.category)}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {getCategoryLabel(change.category)}
                            </span>
                            <p className="text-sm">{change.text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Section */}
        <div className="mt-16 mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Rocket className="h-4 w-4" />
              <span className="text-sm font-medium">Roadmap</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">What&apos;s Coming Next</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Planned features and improvements on our development roadmap.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Q1 2026 */}
            <Card className={`border-green-500/30 ${STAGGER_ITEM_CLASS}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    Q1 2026
                  </Badge>
                </div>
                <h3 className="text-lg font-bold">In Progress</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Mobile App (PWA)</p>
                    <p className="text-xs text-muted-foreground">Native-like mobile experience</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Advanced Analytics</p>
                    <p className="text-xs text-muted-foreground">Detailed trade history & insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Take Profit / Stop Loss</p>
                    <p className="text-xs text-muted-foreground">Automated exit strategies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">More Chains</p>
                    <p className="text-xs text-muted-foreground">Aptos, Sei, Injective support</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Q2 2026 */}
            <Card className={`border-blue-500/30 ${STAGGER_ITEM_CLASS}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                    Q2 2026
                  </Badge>
                </div>
                <h3 className="text-lg font-bold">Planned</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Bot className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Trading Bots</p>
                    <p className="text-xs text-muted-foreground">Automated trading strategies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Coins className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Yield Aggregator</p>
                    <p className="text-xs text-muted-foreground">Find best DeFi yields across chains</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Social Trading</p>
                    <p className="text-xs text-muted-foreground">Copy top traders&apos; strategies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">NFT Bridge</p>
                    <p className="text-xs text-muted-foreground">Cross-chain NFT transfers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Future */}
            <Card className={`border-purple-500/30 ${STAGGER_ITEM_CLASS}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-5 w-5 text-purple-500" />
                  <Badge variant="outline" className="border-purple-500/50 text-purple-500">
                    Future
                  </Badge>
                </div>
                <h3 className="text-lg font-bold">Exploring</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Account Abstraction</p>
                    <p className="text-xs text-muted-foreground">Gasless & social recovery</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Intent-Based Trading</p>
                    <p className="text-xs text-muted-foreground">Express intent, we find best execution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">P2P Trading</p>
                    <p className="text-xs text-muted-foreground">Direct peer-to-peer swaps</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Multi-language</p>
                    <p className="text-xs text-muted-foreground">Localized for global users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Roadmap is subject to change based on community feedback and market conditions.
          </p>
        </div>

        {/* Subscribe CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border">
          <Bell className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">
            Follow us on social media to get notified about new features and updates.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://x.com/xlama_exchange"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Follow on X
            </a>
            <a
              href="https://t.me/xlama_exchange"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border hover:bg-muted transition-colors"
            >
              Join Telegram
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Changelog;
