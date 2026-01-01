import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";

const Terms = () => {
  return (
    <Layout>
      <Helmet>
        <title>Terms of Use - xlama</title>
        <meta
          name="description"
          content="xlama Terms of Use. Read our terms and conditions for using our cryptocurrency exchange service."
        />
      </Helmet>

      <section className="py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: January 1, 2026
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using xlama ("the Service"), you accept and agree to be bound by 
                these Terms of Use. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p className="text-muted-foreground">
                xlama is a hybrid cryptocurrency exchange platform offering two modes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Instant Mode:</strong> Non-custodial exchange service powered by ChangeNow API that allows users to exchange cryptocurrencies without registration.</li>
                <li><strong>DEX Mode:</strong> Decentralized exchange aggregator powered by OKX DEX that enables on-chain token swaps directly from your wallet across multiple blockchains including Ethereum, Solana, Sui, TON, Tron, and more.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Eligibility</h2>
              <p className="text-muted-foreground">
                You must be at least 18 years old to use this service. By using xlama, you represent 
                and warrant that you are of legal age and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. User Responsibilities</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Ensure all wallet addresses provided are correct and valid</li>
                <li>Verify transaction details before confirming any swap</li>
                <li>Secure your wallet private keys and seed phrases</li>
                <li>Understand that on-chain transactions are irreversible</li>
                <li>Not use the service for any illegal or unauthorized purpose</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Supported Wallets</h2>
              <p className="text-muted-foreground">
                We support various wallets across multiple blockchains:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>EVM Chains:</strong> MetaMask, OKX Wallet</li>
                <li><strong>Solana:</strong> Phantom, Solflare</li>
                <li><strong>Sui:</strong> Sui Wallet</li>
                <li><strong>TON:</strong> Tonkeeper</li>
                <li><strong>Tron:</strong> TronLink, TokenPocket</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. DEX Mode Specific Terms</h2>
              <p className="text-muted-foreground">When using DEX Mode, you acknowledge and agree that:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You are interacting directly with smart contracts on public blockchains</li>
                <li>Token approvals grant spending permissions to DEX contracts</li>
                <li>Gas fees are required for on-chain transactions and are non-refundable</li>
                <li>Slippage settings affect transaction execution and may result in different output amounts</li>
                <li>Smart contracts carry inherent risks including potential bugs or exploits</li>
                <li>Cross-chain swaps may involve bridges with their own associated risks</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Instant Mode Specific Terms</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Standard Rate:</strong> May fluctuate based on market conditions</li>
                <li><strong>Fixed Rate:</strong> Locked for 15 minutes from exchange creation</li>
                <li>Send the exact amount specified for the exchange</li>
                <li>Provide valid refund address for potential refunds</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Prohibited Activities</h2>
              <p className="text-muted-foreground">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the service for money laundering or terrorist financing</li>
                <li>Exchange funds obtained through illegal means</li>
                <li>Violate any applicable anti-money laundering (AML) regulations</li>
                <li>Attempt to circumvent our security measures</li>
                <li>Manipulate prices or exploit smart contract vulnerabilities</li>
                <li>Use automated bots or scripts in an unauthorized manner</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                xlama is provided "as is" without warranties of any kind. We are not liable for any 
                losses resulting from market volatility, blockchain delays, smart contract failures, 
                user errors, wallet compromises, bridge failures, or circumstances beyond our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Our service integrates with ChangeNow, OKX DEX, and various wallet providers. These 
                third-party services have their own terms and conditions. We are not responsible for 
                any issues arising from their services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Continued use of the service after 
                changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us at{" "}
                <a href="mailto:support.xlama@defixlama.com" className="text-primary hover:underline">
                  support.xlama@defixlama.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
