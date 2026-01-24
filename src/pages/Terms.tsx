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
              Last updated: January 24, 2026
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
                xlama is a hybrid cryptocurrency exchange platform offering multiple modes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Instant Mode:</strong> Non-custodial exchange service powered by ChangeNow API that allows users to exchange cryptocurrencies without registration.</li>
                <li><strong>DEX Mode:</strong> Decentralized exchange aggregator powered by OKX DEX that enables on-chain token swaps directly from your wallet across multiple blockchains including Ethereum, Solana, Sui, TON, Tron, and more.</li>
                <li><strong>Bridge Mode:</strong> Cross-chain bridging powered by Li.Fi, enabling asset transfers across 20+ blockchain networks.</li>
                <li><strong>Perpetuals Mode:</strong> Leveraged perpetual futures trading via Hyperliquid, supporting up to 50x leverage on major crypto assets. Available for EVM wallets only.</li>
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
                <li><strong>EVM Chains:</strong> MetaMask, OKX Wallet, and 526+ wallets via WalletConnect</li>
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
              <h2 className="text-2xl font-semibold">8. Perpetuals Mode Specific Terms</h2>
              <p className="text-muted-foreground">When using Perpetuals Mode, you acknowledge and agree that:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Leveraged trading carries substantial risk of loss, potentially exceeding your initial margin</li>
                <li>Liquidation occurs when margin falls below maintenance requirements</li>
                <li>Funding rates are charged periodically and may impact position profitability</li>
                <li>Market volatility can cause rapid price movements and unexpected losses</li>
                <li>Stop-loss orders may not execute at exact specified prices during high volatility</li>
                <li>You are solely responsible for managing risk and position sizing</li>
                <li>Past performance does not guarantee future results</li>
                <li>Perpetuals trading is only available with EVM-compatible wallets</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Leveraged Trading Risk Disclosure</h2>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-muted-foreground font-medium mb-2">
                  WARNING: Leveraged trading is highly speculative and carries significant risk.
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>You can lose your entire investment</li>
                  <li>Losses can exceed your initial deposit</li>
                  <li>Leveraged products are not suitable for all investors</li>
                  <li>You should not trade with money you cannot afford to lose</li>
                  <li>Seek independent financial advice if you do not fully understand the risks</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Prohibited Activities</h2>
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
              <h2 className="text-2xl font-semibold">11. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                xlama is provided "as is" without warranties of any kind. We are not liable for any 
                losses resulting from market volatility, blockchain delays, smart contract failures, 
                user errors, wallet compromises, bridge failures, liquidations, or circumstances beyond our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Our service integrates with ChangeNow, OKX DEX, Li.Fi, Jupiter, Hyperliquid, and various wallet providers. These 
                third-party services have their own terms and conditions. We are not responsible for 
                any issues arising from their services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">13. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Continued use of the service after 
                changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">14. Contact</h2>
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
