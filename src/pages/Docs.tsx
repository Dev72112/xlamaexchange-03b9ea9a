import React, { memo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowLeftRight,
  Shield,
  Zap,
  Globe,
  Clock,
  Bell,
  TrendingUp,
  Layers,
  DollarSign,
  Lock,
  BookOpen,
  Repeat,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Code,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { SUPPORTED_CHAINS, getChainIcon } from "@/data/chains";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const DOCS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "xLama Platform Documentation",
  "description": "Comprehensive guide to using xLama - multi-chain DEX aggregator, cross-chain bridge, and trading platform",
  "author": { "@type": "Organization", "name": "xLama" },
};

const QuickNavCard = memo(({ icon: Icon, title, description, section }: {
  icon: React.ElementType;
  title: string;
  description: string;
  section: string;
}) => (
  <Card
    className={`cursor-pointer hover:border-primary/50 transition-colors sweep-effect shadow-premium-hover glow-border-animated ${STAGGER_ITEM_CLASS}`}
    onClick={() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" })}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
));
QuickNavCard.displayName = "QuickNavCard";

const ChainGrid = memo(() => {
  const evmChains = SUPPORTED_CHAINS.filter(c => c.isEvm);
  const nonEvmChains = SUPPORTED_CHAINS.filter(c => !c.isEvm);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Badge variant="outline">EVM</Badge>
          <span className="text-muted-foreground text-sm">({evmChains.length} chains)</span>
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {evmChains.map((chain) => (
            <div
              key={chain.chainIndex}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors sweep-effect"
            >
              <img
                src={getChainIcon(chain)}
                alt={chain.name}
                className="w-8 h-8 rounded-full"
                loading="lazy"
              />
              <span className="text-xs text-center truncate w-full">{chain.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Badge variant="secondary">Non-EVM</Badge>
          <span className="text-muted-foreground text-sm">({nonEvmChains.length} chains)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {nonEvmChains.map((chain) => (
            <div
              key={chain.chainIndex}
              className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors sweep-effect"
            >
              <img
                src={getChainIcon(chain)}
                alt={chain.name}
                className="w-8 h-8 rounded-full"
                loading="lazy"
              />
              <div>
                <span className="text-sm font-medium">{chain.name}</span>
                <p className="text-xs text-muted-foreground">{chain.nativeCurrency.symbol}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
ChainGrid.displayName = "ChainGrid";

const Docs = () => {
  return (
    <Layout>
      <Helmet>
        <title>Documentation | xLama - Multi-Chain Trading Platform</title>
        <meta
          name="description"
          content="Learn how to use xLama for cross-chain swaps, DEX aggregation, limit orders, DCA, and portfolio tracking across 25+ blockchains."
        />
        <link rel="canonical" href="https://xlama.io/docs" />
        <script type="application/ld+json">{JSON.stringify(DOCS_SCHEMA)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12" style={getStaggerStyle(0)}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">Documentation</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            xLama Platform Guide
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about trading, bridging, and managing your crypto across 25+ blockchains.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <QuickNavCard
            icon={Wallet}
            title="Getting Started"
            description="Connect your wallet and make your first swap"
            section="getting-started"
          />
          <QuickNavCard
            icon={Globe}
            title="Supported Networks"
            description="25+ chains including EVM and non-EVM"
            section="networks"
          />
          <QuickNavCard
            icon={ArrowLeftRight}
            title="Exchange Modes"
            description="Instant, DEX, Bridge & Perpetuals"
            section="exchange-modes"
          />
          <QuickNavCard
            icon={TrendingUp}
            title="Perpetual Trading"
            description="Leverage, funding rates, positions"
            section="perpetuals"
          />
          <QuickNavCard
            icon={BarChart3}
            title="Trading Features"
            description="Limit orders, DCA, alerts, and more"
            section="trading-features"
          />
          <QuickNavCard
            icon={DollarSign}
            title="Fees & Pricing"
            description="Transparent fee structure"
            section="fees"
          />
          <QuickNavCard
            icon={Shield}
            title="Security"
            description="How we keep your assets safe"
            section="security"
          />
        </div>

        {/* Documentation Sections */}
        <Accordion type="multiple" defaultValue={["getting-started"]} className="space-y-4">
          {/* Getting Started */}
          <AccordionItem value="getting-started" id="getting-started" className="border rounded-lg px-4 sweep-effect performance-critical">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Getting Started</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6">
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  Connect Your Wallet
                </h4>
                <p className="text-muted-foreground ml-8">
                  Click the "Connect Wallet" button in the header. <strong>We recommend OKX Wallet</strong> for the best multi-chain experience - it supports EVM, Solana, Tron, Sui, and TON with a single connection. You can also use 526+ other wallets through WalletConnect, 
                  plus native integrations with Phantom, Solflare, Sui Wallet, Tonkeeper, and TronLink.
                </p>

                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  Choose Your Mode
                </h4>
                <p className="text-muted-foreground ml-8">
                  Select between <strong>Instant</strong> (cross-chain via partner), <strong>DEX</strong> (on-chain aggregation), 
                  or <strong>Bridge</strong> (cross-chain bridging) based on your needs.
                </p>

                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                  Enter Swap Details
                </h4>
                <p className="text-muted-foreground ml-8">
                  Select your source and destination tokens, enter the amount, and review the quote. 
                  All fees are shown before you confirm.
                </p>

                <h4 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                  Confirm & Sign
                </h4>
                <p className="text-muted-foreground ml-8">
                  Review the transaction details and sign with your wallet. Track progress in real-time 
                  until completion.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Supported Networks */}
          <AccordionItem value="networks" id="networks" className="border rounded-lg px-4 sweep-effect performance-critical">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Supported Networks</span>
                <Badge variant="secondary" className="ml-2">{SUPPORTED_CHAINS.length}+ Chains</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <p className="text-muted-foreground mb-6">
                xLama supports a wide range of blockchain networks, enabling you to swap and bridge assets 
                across the multi-chain ecosystem.
              </p>
              <ChainGrid />
            </AccordionContent>
          </AccordionItem>

          {/* Exchange Modes */}
          <AccordionItem value="exchange-modes" id="exchange-modes" className="border rounded-lg px-4 sweep-effect performance-critical">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Exchange Modes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6">
              <div className="grid gap-4">
                <Card className="border-green-500/30 bg-green-500/5 sweep-effect">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-500" />
                      <CardTitle className="text-base">Instant Mode</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Cross-chain swaps via our exchange partner. Best for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>900+ tradable tokens</li>
                      <li>No wallet needed for quotes</li>
                      <li>Completes in 1-5 minutes</li>
                      <li>Cross-chain without bridging complexity</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/30 bg-blue-500/5 sweep-effect">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-base">DEX Mode</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>On-chain swaps via DEX aggregation. Best for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>400+ aggregated DEX sources</li>
                      <li>Best on-chain rates</li>
                      <li>Full transparency and control</li>
                      <li>Same-chain swaps</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/30 bg-purple-500/5 sweep-effect">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-base">Bridge Mode</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Cross-chain bridging via Li.Fi. Best for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>20+ bridge protocols aggregated</li>
                      <li>Stargate, Hop, Across, and more</li>
                      <li>Route comparison for best rates</li>
                      <li>Moving assets between chains</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Trading Features */}
          <AccordionItem value="trading-features" id="trading-features" className="border rounded-lg px-4 sweep-effect performance-critical">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Trading Features</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Limit Orders</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set target prices and get notified when they're hit. 
                    Orders execute automatically when conditions are met.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">DCA Orders</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dollar-cost average into positions with automated recurring buys. 
                    Set frequency and amounts.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Portfolio Tracking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monitor your P&L across all chains. Daily snapshots track 
                    performance over time.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Price Alerts</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set alerts for price movements. Receive browser push notifications 
                    when targets are reached.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Token Watchlist</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Track your favorite tokens with real-time price updates 
                    and quick-trade access.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">Token Compare</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Compare tokens side-by-side with charts, metrics, 
                    and performance data.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Wallet Support */}
          <AccordionItem value="wallets" id="wallets" className="border rounded-lg px-4 sweep-effect performance-critical">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Wallet Support</span>
                <Badge variant="secondary" className="ml-2">526+ Wallets</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6">
              <p className="text-muted-foreground">
                Connect with virtually any wallet through our multi-chain integration:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="glow">Recommended</Badge>
                    OKX Wallet
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Best multi-chain experience. Single connection for EVM, Solana, Tron, Sui, and TON. 
                    Seamless chain switching with no extra signing.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">WalletConnect</h4>
                  <p className="text-sm text-muted-foreground">
                    526+ wallets supported including MetaMask, Rainbow, Trust Wallet, 
                    Coinbase Wallet, and more.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Native Integrations</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Phantom & Solflare (Solana)</li>
                  <li>• Sui Wallet (Sui)</li>
                  <li>• Tonkeeper (TON)</li>
                  <li>• TronLink (Tron)</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">
                  <strong>Mobile Support:</strong> Deep-link integration for seamless mobile wallet connections. 
                  Scan QR codes or tap to connect directly.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Fees & Pricing */}
          <AccordionItem value="fees" id="fees" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Fees & Pricing</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6">
              <p className="text-muted-foreground">
                Transparent, competitive fees with no hidden costs:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">DEX Swaps</h4>
                    <p className="text-sm text-muted-foreground">1.5% platform fee on swap amount</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Bridge Transactions</h4>
                    <p className="text-sm text-muted-foreground">1.5% platform fee on bridge amount</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Instant Mode</h4>
                    <p className="text-sm text-muted-foreground">Fees included in the exchange rate shown</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Network Gas Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      Paid separately to blockchain validators. Varies by network congestion.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                All final amounts are displayed before you confirm any transaction.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Security */}
          <AccordionItem value="security" id="security" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Security</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6">
              <p className="text-muted-foreground">
                Your security is our priority. xLama is built with security-first principles:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Non-Custodial</h4>
                    <p className="text-sm text-muted-foreground">
                      You always control your keys. We never have access to your funds.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">No Registration</h4>
                    <p className="text-sm text-muted-foreground">
                      No accounts, no KYC. Just connect your wallet and trade.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Signed Transactions</h4>
                    <p className="text-sm text-muted-foreground">
                      Every swap requires your wallet signature. Nothing executes without your approval.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Trusted Protocols</h4>
                    <p className="text-sm text-muted-foreground">
                      We integrate with audited protocols: OKX DEX, Li.Fi, and ChangeNOW.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <strong>Remember:</strong> Always verify transaction details in your wallet before signing. 
                  Never share your seed phrase or private keys with anyone.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bridge Guide */}
          <AccordionItem value="bridge-guide" id="bridge-guide" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Bridge Guide</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6">
              <div className="space-y-4">
                <h4 className="font-semibold">How Bridging Works</h4>
                <ol className="space-y-3 ml-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">1</span>
                    <p className="text-muted-foreground">Select source chain and token you want to bridge</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">2</span>
                    <p className="text-muted-foreground">Choose destination chain and token to receive</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">3</span>
                    <p className="text-muted-foreground">Compare routes from 20+ bridge protocols for best rates</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">4</span>
                    <p className="text-muted-foreground">Approve token spending (first time only)</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">5</span>
                    <p className="text-muted-foreground">Sign the bridge transaction</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm flex-shrink-0">6</span>
                    <p className="text-muted-foreground">Track progress until funds arrive on destination chain</p>
                  </li>
                </ol>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Supported Bridge Protocols</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Stargate", "Hop", "Across", "Connext", "Celer", "Multichain", "Hyphen", "Synapse"].map((protocol) => (
                      <Badge key={protocol} variant="outline">{protocol}</Badge>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Estimated Times:</strong> Bridge transactions typically take 2-20 minutes depending on 
                    the protocol and network congestion. Some routes may take longer for finality.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Developer API */}
          <AccordionItem value="developer-api" id="developer-api" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Developer API</span>
                <Badge variant="outline" className="ml-2">Public</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6">
              <p className="text-muted-foreground">
                Integrate xLama functionality into your own applications using our public APIs and partner services.
              </p>

              {/* Price Data */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Price Data (DefiLlama)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  We use DefiLlama for reliable, real-time token pricing across all supported chains.
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <p className="text-muted-foreground mb-2"># Get current price for any token</p>
                  <code className="text-foreground">
                    GET https://coins.llama.fi/prices/current/ethereum:0x...
                  </code>
                </div>
                <a 
                  href="https://defillama.com/docs/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  DefiLlama API Docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* DEX Aggregation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">DEX Aggregation (OKX DEX)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  On-chain swap quotes and execution via OKX DEX aggregator API.
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <p className="text-muted-foreground mb-2"># Get swap quote</p>
                  <code className="text-foreground">
                    GET /api/v5/dex/aggregator/quote?chainId=1&fromTokenAddress=...
                  </code>
                </div>
                <a 
                  href="https://www.okx.com/web3/build/docs/waas/dex-api-reference" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  OKX DEX API Docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Cross-Chain Bridge */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Cross-Chain Bridge (Li.Fi)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bridge aggregation with 20+ protocols for cross-chain transfers.
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <p className="text-muted-foreground mb-2"># Get bridge routes</p>
                  <code className="text-foreground">
                    GET https://li.quest/v1/quote?fromChain=1&toChain=137&...
                  </code>
                </div>
                <a 
                  href="https://docs.li.fi/li.fi-api/li.fi-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Li.Fi API Docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Instant Exchange */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Instant Exchange (ChangeNOW)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cross-chain instant swaps with 900+ supported tokens.
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <p className="text-muted-foreground mb-2"># Get exchange estimate</p>
                  <code className="text-foreground">
                    GET https://api.changenow.io/v2/exchange/estimated-amount?...
                  </code>
                </div>
                <a 
                  href="https://changenow.io/api/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  ChangeNOW API Docs <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <strong>Note:</strong> These are public APIs from our partner services. 
                  For production use, refer to each provider&apos;s documentation for API keys and rate limits.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border">
          <h2 className="text-2xl font-bold mb-2">Ready to Trade?</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet and start swapping across 25+ chains.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              <ArrowLeftRight className="h-4 w-4" />
              Start Trading
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border hover:bg-muted transition-colors">
              <BookOpen className="h-4 w-4" />
              View FAQ
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Docs;
