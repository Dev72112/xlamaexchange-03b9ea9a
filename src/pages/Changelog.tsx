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
