import React, { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  ThumbsUp,
  Check,
  Activity,
} from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { useFeatureVotes } from "@/hooks/useFeatureVotes";
import { AnonymousFeedback } from "@/components/AnonymousFeedback";
import { toast } from "sonner";

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

interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  progress: number;
}

interface RoadmapQuarter {
  quarter: string;
  status: string;
  color: string;
  icon: React.ElementType;
  features: RoadmapFeature[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "2026-01-24",
    title: "Mobile UX & Data Isolation Fixes",
    description: "Enhanced mobile navigation, wallet disconnect, manual refresh, and critical bridge data isolation fix.",
    type: "major",
    changes: [
      { category: "feature", text: "Manual refresh buttons on Portfolio and Analytics pages" },
      { category: "feature", text: "Wallet disconnect button in mobile settings dropdown" },
      { category: "feature", text: "NotificationCenter now functional on mobile header" },
      { category: "feature", text: "Theme toggle and FeedbackSettings in mobile menu" },
      { category: "improvement", text: "Larger touch targets for chart drawings (20px hit tolerance)" },
      { category: "improvement", text: "Touch scroll prevention when drawing on charts" },
      { category: "improvement", text: "Site-wide SEO updates: sitemap, manifest shortcuts, canonical URLs" },
      { category: "security", text: "Bridge transaction history now properly isolated per wallet" },
      { category: "fix", text: "Fixed bridge transactions leaking between user wallets" },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-01-17",
    title: "Hyperliquid Perpetuals Trading",
    description: "Launch perpetual futures trading with up to 50x leverage via Hyperliquid integration.",
    type: "major",
    changes: [
      { category: "feature", text: "Hyperliquid perpetuals trading with up to 50x leverage" },
      { category: "feature", text: "Real-time orderbook with bid/ask depth visualization" },
      { category: "feature", text: "Live WebSocket candlestick price charts" },
      { category: "feature", text: "Position management: close, modify SL/TP, add margin" },
      { category: "feature", text: "PnL calculator with liquidation price estimation" },
      { category: "feature", text: "Funding rate history charts and 24h volume display" },
      { category: "feature", text: "Mobile swipe gestures for quick Long/Short trades" },
      { category: "improvement", text: "EVM/Solana chain toggle on Portfolio, Analytics, History pages" },
      { category: "improvement", text: "Perpetuals added to main navigation (desktop + mobile)" },
      { category: "improvement", text: "Unified chain selector component across all pages" },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-01-12",
    title: "Performance & Jupiter Integration",
    description: "60fps GPU-accelerated animations, Alchemy RPC integration, and Jupiter Ultra API with commissions.",
    type: "major",
    changes: [
      { category: "feature", text: "Jupiter Ultra API for Solana swaps with 0.8% commission" },
      { category: "feature", text: "Alchemy RPC integration for reliable EVM/Solana connectivity" },
      { category: "improvement", text: "60fps GPU-accelerated sweep animations site-wide" },
      { category: "improvement", text: "GPU-optimized .performance-critical class for high-frequency components" },
      { category: "improvement", text: "Preconnect/dns-prefetch hints for all API partners" },
      { category: "improvement", text: "Service worker v5 with cache-first strategies" },
      { category: "improvement", text: "TokenImage and ChainImage with explicit sizing to prevent CLS" },
      { category: "improvement", text: "Granular bundle splitting (vendor-wallet, vendor-solana, vendor-lifi)" },
      { category: "security", text: "Jupiter API key secured via edge function proxy" },
    ],
  },
  {
    version: "2.1.0",
    date: "2026-01-07",
    title: "Performance & Security Hardening",
    description: "Major performance optimizations and security improvements across the platform.",
    type: "major",
    changes: [
      { category: "feature", text: "Added skeleton loading states for Portfolio, Orders, and Analytics pages" },
      { category: "feature", text: "New performance monitoring with Web Vitals tracking (LCP, FCP, CLS, TTFB)" },
      { category: "feature", text: "Client-side error tracking and security event logging" },
      { category: "improvement", text: "Optimized Vite build with granular code splitting (10 vendor chunks)" },
      { category: "improvement", text: "Enhanced service worker with versioned caching and stale-while-revalidate" },
      { category: "improvement", text: "Added 18 database indexes for faster wallet address lookups" },
      { category: "improvement", text: "React Query optimization with centralized query client config" },
      { category: "security", text: "Hardened edge functions with input validation and request size limits" },
      { category: "security", text: "Tightened Content Security Policy - removed 'unsafe-eval'" },
      { category: "security", text: "Standardized security headers across all edge functions" },
      { category: "fix", text: "Fixed CSS @import order causing build failures" },
      { category: "fix", text: "Fixed Sui package resolution in Vite config" },
    ],
  },
  {
    version: "2.0.0",
    date: "2026-01-06",
    title: "Site-Wide UI Refresh",
    description: "Major UI/UX improvements, OKX Wallet integration, and content updates.",
    type: "major",
    changes: [
      { category: "feature", text: "OKX Wallet as recommended connection method for multi-chain support" },
      { category: "improvement", text: "Updated timing: Instant swaps now complete in 1-5 minutes" },
      { category: "improvement", text: "New card and badge component variants (glass, gradient, interactive)" },
      { category: "improvement", text: "Live status indicator in footer and hero section" },
      { category: "improvement", text: "Enhanced Portfolio dashboard with OKX Wallet recommendations" },
      { category: "improvement", text: "Refreshed FAQ and Docs with accurate information" },
      { category: "improvement", text: "Improved 404 page with animated background" },
      { category: "fix", text: "Fixed P&L chart flickering (rave party bug)" },
      { category: "fix", text: "P&L now correctly shows losses, not just profits" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-05",
    title: "Official Launch",
    description: "xLama is officially live with full multi-chain trading capabilities.",
    type: "major",
    changes: [
      { category: "feature", text: "DEX aggregation via OKX DEX with 400+ liquidity sources" },
      { category: "feature", text: "Cross-chain bridge via Li.Fi with 20+ bridge protocols" },
      { category: "feature", text: "Instant swaps via ChangeNOW with 900+ tokens (1-5 min completion)" },
      { category: "feature", text: "Support for 25+ blockchain networks (EVM and non-EVM)" },
      { category: "feature", text: "Multi-wallet support: OKX Wallet (recommended), WalletConnect, Phantom, Sui Wallet, Tonkeeper, TronLink" },
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
];

const ROADMAP_DATA: RoadmapQuarter[] = [
  {
    quarter: "Q1 2026",
    status: "In Progress",
    color: "green",
    icon: Clock,
    features: [
      { id: "perpetuals-trading", title: "Perpetuals Trading", description: "50x leverage via Hyperliquid", icon: Activity, progress: 100 },
      { id: "mobile-pwa", title: "Mobile App (PWA)", description: "Native-like mobile experience", icon: Smartphone, progress: 70 },
      { id: "advanced-analytics", title: "Advanced Analytics", description: "Detailed trade history & insights", icon: BarChart3, progress: 55 },
      { id: "tp-sl", title: "Take Profit / Stop Loss", description: "Automated exit strategies", icon: Target, progress: 85 },
      { id: "more-chains", title: "More Chains", description: "Aptos, Sei, Injective support", icon: Globe, progress: 15 },
    ],
  },
  {
    quarter: "Q2 2026",
    status: "Planned",
    color: "blue",
    icon: Target,
    features: [
      { id: "perpetuals-advanced", title: "Perpetuals Order Types", description: "Stop-limit, trailing stop orders", icon: TrendingUp, progress: 0 },
      { id: "trading-bots", title: "Trading Bots", description: "Automated trading strategies", icon: Bot, progress: 0 },
      { id: "yield-aggregator", title: "Yield Aggregator", description: "Find best DeFi yields across chains", icon: Coins, progress: 0 },
      { id: "social-trading", title: "Social Trading", description: "Copy top traders' strategies", icon: Users, progress: 0 },
    ],
  },
  {
    quarter: "Future",
    status: "Exploring",
    color: "purple",
    icon: Rocket,
    features: [
      { id: "perpetuals-leaderboard", title: "Perpetuals Leaderboard", description: "Top traders rankings", icon: TrendingUp, progress: 0 },
      { id: "account-abstraction", title: "Account Abstraction", description: "Gasless & social recovery", icon: Shield, progress: 0 },
      { id: "intent-trading", title: "Intent-Based Trading", description: "Express intent, we find best execution", icon: Zap, progress: 0 },
      { id: "p2p-trading", title: "P2P Trading", description: "Direct peer-to-peer swaps", icon: ArrowLeftRight, progress: 0 },
      { id: "multi-language", title: "Multi-language", description: "Localized for global users", icon: Globe, progress: 0 },
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

const getColorClasses = (color: string) => {
  switch (color) {
    case "green":
      return { border: "border-green-500/30", badge: "border-green-500/50 text-green-500", icon: "text-green-500", progress: "bg-green-500" };
    case "blue":
      return { border: "border-blue-500/30", badge: "border-blue-500/50 text-blue-500", icon: "text-blue-500", progress: "bg-blue-500" };
    case "purple":
      return { border: "border-purple-500/30", badge: "border-purple-500/50 text-purple-500", icon: "text-purple-500", progress: "bg-purple-500" };
    default:
      return { border: "border-muted", badge: "", icon: "text-muted-foreground", progress: "bg-primary" };
  }
};

interface FeatureItemProps {
  feature: RoadmapFeature;
  color: string;
  vote: (id: string) => Promise<boolean>;
  hasVoted: (id: string) => boolean;
  getVoteCount: (id: string) => number;
}

const FeatureItem = memo(function FeatureItem({ feature, color, vote, hasVoted, getVoteCount }: FeatureItemProps) {
  const colors = getColorClasses(color);
  const voted = hasVoted(feature.id);
  const voteCount = getVoteCount(feature.id);
  const isComplete = feature.progress === 100;

  const handleVote = async () => {
    if (voted || isComplete) {
      if (isComplete) {
        toast.info("This feature is already complete!");
      } else {
        toast.info("You already voted for this feature");
      }
      return;
    }
    const success = await vote(feature.id);
    if (success) {
      toast.success(`Voted for "${feature.title}"!`);
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors sweep-effect-fast">
      <div className="flex items-start gap-3">
        <feature.icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium flex items-center gap-2">
            {feature.title}
            {isComplete && <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">Complete</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">{feature.description}</p>
        </div>
        {!isComplete && (
          <Button
            variant={voted ? "secondary" : "outline"}
            size="sm"
            className="h-7 px-2 gap-1 flex-shrink-0"
            onClick={handleVote}
            disabled={voted}
          >
            {voted ? (
              <Check className="h-3 w-3" />
            ) : (
              <ThumbsUp className="h-3 w-3" />
            )}
            <span className="text-xs">{voteCount}</span>
          </Button>
        )}
      </div>
      {feature.progress > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={feature.progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-8">{feature.progress}%</span>
        </div>
      )}
    </div>
  );
});

const Changelog = () => {
  const { vote, hasVoted, getVoteCount, isLoading } = useFeatureVotes();

  return (
    <Layout>
      <Helmet>
        <title>Changelog | xLama - Platform Updates & New Features</title>
        <meta
          name="description"
          content="Stay up to date with xLama platform updates, new features, improvements, and bug fixes. See what's new in our multi-chain DEX aggregator."
        />
        <link rel="canonical" href="https://xlama.exchange/changelog" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl lg:max-w-5xl 2xl:max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12" style={getStaggerStyle(0)}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Changelog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What&apos;s New
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Track all updates, new features, and improvements to the xLama platform.
          </p>
          <AnonymousFeedback />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className={`${STAGGER_ITEM_CLASS} sweep-effect shadow-premium-hover`}>
            <CardContent className="pt-6 text-center">
              <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">25+</p>
              <p className="text-sm text-muted-foreground">Chains</p>
            </CardContent>
          </Card>
          <Card className={`${STAGGER_ITEM_CLASS} sweep-effect shadow-premium-hover`}>
            <CardContent className="pt-6 text-center">
              <ArrowLeftRight className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">400+</p>
              <p className="text-sm text-muted-foreground">DEX Sources</p>
            </CardContent>
          </Card>
          <Card className={`${STAGGER_ITEM_CLASS} sweep-effect shadow-premium-hover`}>
            <CardContent className="pt-6 text-center">
              <Activity className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">50x</p>
              <p className="text-sm text-muted-foreground">Leverage</p>
            </CardContent>
          </Card>
          <Card className={`${STAGGER_ITEM_CLASS} sweep-effect shadow-premium-hover`}>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">900+</p>
              <p className="text-sm text-muted-foreground">Tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Rocket className="h-4 w-4" />
              <span className="text-sm font-medium">Roadmap</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">What&apos;s Coming Next</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Vote for features you want most! Your feedback shapes our priorities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ROADMAP_DATA.map((quarter) => {
              const colors = getColorClasses(quarter.color);
              const QuarterIcon = quarter.icon;

              return (
                <Card key={quarter.quarter} className={`${colors.border} ${STAGGER_ITEM_CLASS} sweep-effect glow-border-animated`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <QuarterIcon className={`h-5 w-5 ${colors.icon}`} />
                      <Badge variant="outline" className={colors.badge}>
                        {quarter.quarter}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold">{quarter.status}</h3>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quarter.features.map((feature) => (
                      <FeatureItem
                        key={feature.id}
                        feature={feature}
                        color={quarter.color}
                        vote={vote}
                        hasVoted={hasVoted}
                        getVoteCount={getVoteCount}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Roadmap priorities may change based on community votes and market conditions.
          </p>
        </div>

        {/* Timeline */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Release History</h2>
          </div>

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
                        <span className="text-sm text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{entry.title}</h3>
                      <p className="text-muted-foreground">{entry.description}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {entry.changes.map((change, changeIndex) => (
                          <li
                            key={changeIndex}
                            className="flex items-start gap-2 text-sm"
                          >
                            {getCategoryIcon(change.category)}
                            <span className="text-muted-foreground">
                              {change.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Changelog;
