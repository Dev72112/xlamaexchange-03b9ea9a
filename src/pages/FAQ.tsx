import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is xlama?",
    answer: "xlama is a multi-chain cryptocurrency exchange aggregator that supports 25+ blockchain networks. We offer four core features: Instant Mode (via ChangeNOW) for cross-chain swaps with 900+ tokens in 1-5 minutes, DEX Mode (via OKX DEX) for on-chain swaps aggregated from 400+ decentralized exchanges, Cross-Chain Bridge (via Li.Fi) for bridging assets across 20+ networks, and Perpetuals Trading (via Hyperliquid) for leveraged futures with up to 50x leverage.",
  },
  {
    question: "Which wallet should I use?",
    answer: "We recommend OKX Wallet for the best experience. It offers seamless multi-chain support across EVM, Solana, Tron, Sui, and TON with a single connection. You can also use 526+ other wallets through WalletConnect (MetaMask, Trust Wallet, Rainbow, Coinbase Wallet, etc.) or native integrations with Phantom, Solflare (Solana), Sui Wallet (Sui), Tonkeeper (TON), and TronLink (Tron).",
  },
  {
    question: "Which blockchain networks are supported?",
    answer: "We support 25+ networks including EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche, Fantom, zkSync, Linea, Scroll, X Layer, Mantle, Blast) and non-EVM chains (Solana, Sui, TON, and Tron). For bridging via Li.Fi, we support 20+ EVM chains plus Solana.",
  },
  {
    question: "Do I need to create an account?",
    answer: "No registration required. For DEX Mode, Bridge, and Perpetuals, simply connect your wallet - we support 526+ wallets via WalletConnect plus native integrations for Solana, Sui, TON, and Tron wallets. For Instant Mode, no wallet connection is needed.",
  },
  {
    question: "What's the difference between Instant, DEX, Bridge, and Perpetuals modes?",
    answer: "Instant Mode (ChangeNOW) is ideal for cross-chain swaps - send crypto and receive different crypto on another blockchain. DEX Mode (OKX DEX) is for same-chain swaps directly on the blockchain, aggregating rates from 400+ DEXs. Bridge Mode (Li.Fi) is for moving the same token or stablecoins between different blockchains with optimized routes. Perpetuals Mode (Hyperliquid) is for leveraged trading with up to 50x leverage.",
  },
  {
    question: "What is Perpetual Trading on xLama?",
    answer: "Perpetual trading lets you speculate on crypto prices with leverage (up to 50x) without owning the underlying asset. Go long if you expect prices to rise, or short if you expect them to fall. We integrate with Hyperliquid for fast, low-fee perpetual futures trading on EVM chains.",
  },
  {
    question: "What leverage is available for perpetuals?",
    answer: "We support leverage from 1x up to 50x on Hyperliquid perpetuals. Higher leverage amplifies both gains and losses. The PnL Calculator tool helps you understand potential outcomes before trading. We recommend starting with lower leverage (2-5x) until you're comfortable with the mechanics.",
  },
  {
    question: "How do funding rates work?",
    answer: "Funding rates are periodic payments between long and short traders to keep perpetual prices aligned with spot prices. Positive funding means longs pay shorts; negative means shorts pay longs. Rates are typically charged every 8 hours. View current rates on the Perpetuals page.",
  },
  {
    question: "What are the risks of leveraged trading?",
    answer: "Leveraged trading carries significant risk: you can lose more than your initial margin. Liquidation occurs if your margin drops below maintenance requirements. Always use stop-losses, start with low leverage, and never trade more than you can afford to lose. The PnL Calculator shows your liquidation price before you trade.",
  },
  {
    question: "Which wallets support perpetuals?",
    answer: "Perpetual trading on Hyperliquid requires an EVM-compatible wallet. We recommend OKX Wallet or MetaMask. Connect via WalletConnect to access 526+ supported wallets. Solana, Sui, TON, and Tron wallets do not support perpetuals - use our DEX or Instant modes for those chains.",
  },
  {
    question: "What is the Cross-Chain Bridge?",
    answer: "Our Bridge page (/bridge) uses Li.Fi to find the best routes for moving assets between blockchains. Li.Fi aggregates 20+ bridge protocols (like Stargate, Hop, Across) to find you the optimal path based on speed, fees, and output amount. Perfect for moving ETH, USDC, or other assets between networks.",
  },
  {
    question: "How do I use the Bridge page?",
    answer: "1) Go to /bridge or click 'Bridge' in the navigation. 2) Connect your wallet. 3) Select source chain and token. 4) Select destination chain and token. 5) Enter the amount to bridge. 6) Review the route (bridge used, fees, estimated time). 7) Click Bridge and confirm in your wallet. Track progress in the Bridge History section.",
  },
  {
    question: "What bridges does Li.Fi use?",
    answer: "Li.Fi aggregates 20+ bridge protocols including Stargate, Hop Protocol, Across, Connext, Celer, Multichain, Synapse, and many more. The system automatically selects the best bridge based on your transfer size, destination, and preferences for speed vs. cost.",
  },
  {
    question: "What are Limit Orders?",
    answer: "Limit Orders let you set a target price for your swap. When the market reaches your target, you'll receive a notification and can execute the swap. Create limit orders from the DEX swap form - set your tokens, amount, and target price. Manage all orders from the /orders page.",
  },
  {
    question: "How do Cross-Chain Swaps work?",
    answer: "Cross-chain swaps allow you to swap tokens between different blockchains (e.g., ETH on Ethereum to USDC on Polygon). We use Li.Fi for bridging, which finds the optimal route across 20+ bridge protocols. You'll see the bridge used, fees, and estimated arrival time before confirming.",
  },
  {
    question: "What is Portfolio P&L Tracking?",
    answer: "The Portfolio Overview shows your total holdings value across all connected wallets and tracks your profit/loss over time (7D, 30D, 90D, All-time). We store daily snapshots of your portfolio to calculate performance metrics. Connect your wallet to start tracking.",
  },
  {
    question: "How do Price Alerts work?",
    answer: "Set price alerts for any trading pair or token from the /tools page. Choose 'Above' or 'Below' conditions and your target price. When the condition is met, you'll receive browser push notifications and optional sound alerts. Manage alerts from the Token Watchlist or Tools page.",
  },
  {
    question: "What is the Token Comparison tool?",
    answer: "The Token Compare page (/compare) lets you select up to 5 tokens for side-by-side comparison. View current prices, 24h/7d changes, market cap, trading volume, liquidity, and holder counts. Great for research before making swap decisions.",
  },
  {
    question: "What tools are available?",
    answer: "Visit /tools for our full suite: Token Watchlist (price monitoring), Gas Estimator (multi-chain gas prices), Price Prediction (AI technical analysis), Portfolio Rebalancer (target allocations), and Price Alerts (notifications). Visit /orders to manage Limit and DCA orders. Visit /perpetuals for leveraged trading.",
  },
  {
    question: "How do Solana swaps work?",
    answer: "Connect OKX Wallet, Phantom, or Solflare wallet, select Solana network, and swap any SPL token. We use OKX DEX aggregation for best rates across Solana liquidity sources. Transactions confirm in ~400ms with minimal gas fees (usually under $0.01).",
  },
  {
    question: "Why do I need to approve tokens before swapping?",
    answer: "For ERC-20, SPL, and similar tokens (not native coins), you must first approve the DEX contract to spend your tokens. This is a one-time security approval per token. Native coins like ETH, SOL, SUI, TON, and TRX don't require approval.",
  },
  {
    question: "What is slippage?",
    answer: "Slippage is the maximum price difference you'll accept between the quote and execution. We recommend 0.5-1% for stablecoins and 1-3% for volatile tokens. Adjust in the settings gear icon before swapping.",
  },
  {
    question: "What fees do you charge?",
    answer: "For DEX swaps (OKX DEX), we include a 1.5% commission in the quote. For Bridge transactions (Li.Fi), we include a 1.5% platform fee. For Instant swaps (ChangeNOW), fees are included in the exchange rate. Instant swaps typically complete in 1-5 minutes. You always see the final amount before confirming. Network gas fees are separate and paid to validators.",
  },
  {
    question: "How can I track my transaction?",
    answer: "For DEX swaps, we show real-time progress with estimated confirmation times. For bridge transactions, track progress on the Bridge page with live status updates. Once submitted, view your transaction on the blockchain explorer (Etherscan, Solscan, etc.) using the provided link.",
  },
  {
    question: "Is xlama safe to use?",
    answer: "Yes! xlama is completely non-custodial - we never hold your funds or access your private keys. DEX swaps interact directly with audited smart contracts. Bridge transactions use audited protocols via Li.Fi. Instant swaps are processed by ChangeNOW, a trusted exchange partner since 2017. Perpetuals are executed via Hyperliquid's audited infrastructure.",
  },
  {
    question: "What is DCA (Dollar Cost Averaging)?",
    answer: "DCA is an investment strategy where you buy a fixed amount of crypto at regular intervals (daily, weekly, monthly) regardless of price. This reduces the impact of volatility and removes emotional decision-making. Manage DCA orders from the /orders page.",
  },
];

const FAQ = () => {
  return (
    <Layout>
      <Helmet>
        <title>FAQ - xlama | Frequently Asked Questions</title>
        <meta
          name="description"
          content="Find answers to common questions about xlama cryptocurrency exchange. Learn about Instant Mode, DEX Mode, Perpetuals, limit orders, cross-chain swaps, portfolio tracking, and more."
        />
      </Helmet>

      <section className="pb-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>
            <p className="text-muted-foreground">
              Everything you need to know about exchanging cryptocurrency with xlama.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 sweep-effect performance-critical"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center p-8 bg-secondary/30 rounded-2xl sweep-effect">
            <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Can't find the answer you're looking for? Reach out to our support team.
            </p>
            <a
              href="mailto:support.xlama@defixlama.com"
              className="text-primary hover:underline font-medium"
            >
              Contact Support →
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
