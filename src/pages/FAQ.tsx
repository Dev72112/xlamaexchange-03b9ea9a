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
    answer: "xlama is a hybrid cryptocurrency exchange platform that offers two modes: Instant Mode (powered by ChangeNow) for quick cross-chain swaps, and DEX Mode (powered by OKX DEX) for on-chain swaps with the best rates from 400+ decentralized exchanges across 20+ chains.",
  },
  {
    question: "Do I need to create an account?",
    answer: "No registration is required for Instant Mode swaps. For DEX Mode, you simply connect your wallet (MetaMask, Phantom, OKX Wallet, Solflare, Sui Wallet, Tonkeeper, or TokenPocket) - no account creation needed.",
  },
  {
    question: "What cryptocurrencies can I exchange?",
    answer: "In Instant Mode, we support 900+ cryptocurrencies including Bitcoin, Ethereum, Solana, and many more. In DEX Mode, you can swap any token available on supported chains including Ethereum, Solana, Base, Polygon, Arbitrum, Sui, TON, Tron and more.",
  },
  {
    question: "Which blockchains are supported?",
    answer: "We support a wide range of blockchains including Ethereum, Solana, Base, Polygon, Arbitrum, Optimism, BNB Smart Chain, Avalanche, Sui, TON, Tron, X Layer, zkSync, Linea, Fantom, Mantle, Blast, Scroll, and many more.",
  },
  {
    question: "How long does an Instant Mode exchange take?",
    answer: "Most exchanges complete within 10-30 minutes, depending on blockchain network speed and confirmation times. Fixed-rate exchanges lock your rate for 15 minutes.",
  },
  {
    question: "What's the difference between Standard and Fixed rates?",
    answer: "Standard (floating) rate may fluctuate during the exchange based on market conditions. Fixed rate is locked for 15 minutes from exchange creation - you'll receive exactly what was quoted.",
  },
  {
    question: "What is DEX Mode?",
    answer: "DEX Mode allows you to swap tokens directly on-chain through decentralized exchanges. It aggregates rates from 400+ DEXs to find you the best price. Swaps are executed instantly on the blockchain with full transparency.",
  },
  {
    question: "Which wallets can I use for DEX swaps?",
    answer: "We support multiple wallets across different blockchains: MetaMask and OKX Wallet for EVM chains, Phantom and Solflare for Solana, Sui Wallet for Sui network, Tonkeeper for TON, and TronLink and TokenPocket for Tron.",
  },
  {
    question: "What is token approval?",
    answer: "Before swapping ERC-20 or SPL tokens, you need to approve the DEX contract to spend your tokens. This is a one-time transaction per token that requires a small gas fee. Native tokens like ETH or SOL don't require approval.",
  },
  {
    question: "Why do I need to pay gas fees in DEX mode?",
    answer: "DEX swaps are on-chain transactions that require gas fees paid to blockchain validators. Gas costs vary by network - Solana, Layer 2 chains like Base, Arbitrum, and X Layer typically have much lower fees than Ethereum mainnet.",
  },
  {
    question: "What is slippage and how do I set it?",
    answer: "Slippage is the maximum price difference you're willing to accept between the quoted price and execution price. We recommend 0.5% for most swaps, but volatile tokens may need 1-3%. You can adjust this in the settings.",
  },
  {
    question: "What fees do you charge?",
    answer: "For Instant Mode, fees are included in the displayed rate - what you see is what you get. For DEX Mode, you only pay blockchain gas fees. We don't add extra fees on top of DEX rates.",
  },
  {
    question: "Is my exchange anonymous?",
    answer: "Instant Mode requires no personal information or KYC. DEX Mode connects to your wallet but doesn't require any personal data - your transactions are on-chain and pseudonymous.",
  },
  {
    question: "Is xlama safe to use?",
    answer: "Yes. xlama is non-custodial, meaning we never hold your funds. For Instant Mode, swaps are processed by ChangeNow. For DEX Mode, you interact directly with audited smart contracts while your private keys remain in your wallet.",
  },
  {
    question: "How can I track my exchange?",
    answer: "For Instant Mode, use the transaction ID provided to track status on our platform. For DEX Mode, you can view your transaction directly on the blockchain explorer for the chain you're using.",
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
