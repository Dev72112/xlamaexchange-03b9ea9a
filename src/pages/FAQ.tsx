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
    answer: "xlama is a multi-chain cryptocurrency exchange aggregator that supports 25+ blockchain networks. We offer two modes: Instant Mode (via ChangeNOW) for cross-chain swaps with 900+ tokens, and DEX Mode (via OKX DEX) for on-chain swaps aggregated from 400+ decentralized exchanges.",
  },
  {
    question: "How many wallets do you support?",
    answer: "We support 526+ wallets through WalletConnect integration, including MetaMask, Trust Wallet, Rainbow, Coinbase Wallet, and hundreds more. We also have native integrations for Phantom, Solflare (Solana), Sui Wallet, Suiet (Sui), Tonkeeper (TON), and TronLink (Tron).",
  },
  {
    question: "Which blockchain networks are supported?",
    answer: "We support 25+ networks including EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Avalanche, Fantom, zkSync, Linea, Scroll, X Layer, Mantle, Blast) and non-EVM chains (Solana, Sui, TON, and Tron).",
  },
  {
    question: "Do I need to create an account?",
    answer: "No registration required. For DEX Mode, simply connect your wallet - we support 526+ wallets via WalletConnect plus native integrations for Solana, Sui, TON, and Tron wallets. For Instant Mode, no wallet connection is needed.",
  },
  {
    question: "What's the difference between Instant and DEX mode?",
    answer: "Instant Mode (ChangeNOW) is ideal for cross-chain swaps - send crypto and receive different crypto on another blockchain. DEX Mode (OKX DEX) is for same-chain swaps directly on the blockchain, aggregating rates from 400+ DEXs for the best prices.",
  },
  {
    question: "How do Solana swaps work?",
    answer: "Connect Phantom or Solflare wallet, select Solana network, and swap any SPL token. We aggregate rates from Jupiter, Raydium, Orca, and other Solana DEXs. Transactions confirm in ~400ms with minimal gas fees (usually under $0.01).",
  },
  {
    question: "How do Sui swaps work?",
    answer: "Connect Sui Wallet or Suiet, select SUI network, then swap SUI or any Sui tokens. Our DEX aggregator finds the best rates across Sui DEXs. Transactions are extremely fast (~2 seconds) with minimal fees.",
  },
  {
    question: "How do TON swaps work?",
    answer: "Connect Tonkeeper wallet to swap on TON network. We aggregate rates from TON DEXs like STON.fi and DeDust. TON transactions typically confirm in about 5 seconds with low fees.",
  },
  {
    question: "How do Tron swaps work?",
    answer: "Install TronLink extension or app, connect to swap TRX and TRC-20 tokens. We aggregate rates from SunSwap and other Tron DEXs. Transactions confirm in about 3 seconds.",
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
    question: "What is price impact?",
    answer: "Price impact shows how your trade affects the token's price due to available liquidity. Large trades in low-liquidity pools can cause significant impact. We show warnings for impact over 5% - consider splitting large trades.",
  },
  {
    question: "What fees do you charge?",
    answer: "For DEX swaps, we include a small 1.5% commission in the quote. For Instant swaps via ChangeNOW, fees are included in the exchange rate. You always see the final amount before confirming. Network gas fees are separate and paid to validators.",
  },
  {
    question: "How can I track my transaction?",
    answer: "For DEX swaps, we show real-time progress with estimated confirmation times. Once submitted, you can view your transaction on the blockchain explorer (Etherscan, Solscan, SuiScan, TONScan, TronScan, etc.) using the provided link. For Instant swaps, use the Transaction Tracker on our homepage.",
  },
  {
    question: "Is xlama safe to use?",
    answer: "Yes! xlama is completely non-custodial - we never hold your funds or access your private keys. DEX swaps interact directly with audited smart contracts. Instant swaps are processed by ChangeNOW, a trusted exchange partner since 2017.",
  },
];

const FAQ = () => {
  return (
    <Layout>
      <Helmet>
        <title>FAQ - xlama | Frequently Asked Questions</title>
        <meta
          name="description"
          content="Find answers to common questions about xlama cryptocurrency exchange. Learn about Instant Mode, DEX Mode, wallet connection, supported chains, rates, fees, and security."
        />
      </Helmet>

      <section className="py-20">
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
                className="bg-card border border-border rounded-lg px-6"
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

          <div className="mt-12 text-center p-8 bg-secondary/30 rounded-2xl">
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
