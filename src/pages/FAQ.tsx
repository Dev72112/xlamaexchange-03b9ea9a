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
    question: "What is CryptoSwap?",
    answer:
      "CryptoSwap is a non-custodial cryptocurrency exchange service powered by ChangeNow. We allow you to quickly and securely exchange one cryptocurrency for another without registration or storing your funds.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No, you don't need to create an account or register. Simply select your currencies, enter the amount and your wallet address, and complete the exchange. It's that simple.",
  },
  {
    question: "What cryptocurrencies can I exchange?",
    answer:
      "We support over 900 cryptocurrencies including Bitcoin, Ethereum, Tether, BNB, Solana, XRP, Cardano, Dogecoin, and many more. You can exchange between any supported pair.",
  },
  {
    question: "How long does an exchange take?",
    answer:
      "Most exchanges complete within 10-30 minutes, depending on the blockchain network speed and confirmation times. Fixed-rate exchanges are typically faster as the rate is locked for 15 minutes.",
  },
  {
    question: "What's the difference between Standard and Fixed rates?",
    answer:
      "Standard (floating) rate: The rate may fluctuate slightly during the exchange due to market volatility. You might receive slightly more or less than estimated. Fixed rate: The rate is locked for 15 minutes from the moment you create the exchange. You'll receive exactly what was quoted, regardless of market movements.",
  },
  {
    question: "What fees do you charge?",
    answer:
      "Our fees are included in the exchange rate displayed. There are no hidden fees. The rate you see is the rate you get. Network fees for the destination blockchain are also included.",
  },
  {
    question: "Is my exchange anonymous?",
    answer:
      "Yes, we don't require any personal information or KYC verification for standard exchanges. Your privacy is protected.",
  },
  {
    question: "What if I send the wrong amount?",
    answer:
      "If you send a different amount than specified, the exchange will still process but you'll receive a proportional amount of the destination currency. For fixed-rate exchanges, the original rate applies only to the specified amount.",
  },
  {
    question: "How can I track my exchange?",
    answer:
      "After creating an exchange, you'll receive a transaction ID. You can use this ID to track the status of your exchange on our platform.",
  },
  {
    question: "What if something goes wrong with my exchange?",
    answer:
      "If you provided a refund address and the exchange cannot be completed, your funds will be refunded automatically. For any issues, please contact our support team with your transaction ID.",
  },
  {
    question: "Is there a minimum or maximum exchange amount?",
    answer:
      "Yes, there are minimum amounts that vary by cryptocurrency pair. The minimum is displayed when you select your currencies. There's no maximum limit for most exchanges.",
  },
  {
    question: "Which wallets are supported?",
    answer:
      "You can use any wallet that supports your chosen cryptocurrency. This includes hardware wallets, software wallets, exchange wallets, or mobile wallets. Just make sure you enter the correct address format.",
  },
];

const FAQ = () => {
  return (
    <Layout>
      <Helmet>
        <title>FAQ - CryptoSwap | Frequently Asked Questions</title>
        <meta
          name="description"
          content="Find answers to common questions about CryptoSwap cryptocurrency exchange. Learn about rates, fees, security, and how to exchange crypto."
        />
      </Helmet>

      <section className="py-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h1>
            <p className="text-muted-foreground">
              Everything you need to know about exchanging cryptocurrency with CryptoSwap.
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
              href="mailto:support@cryptoswap.com"
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
