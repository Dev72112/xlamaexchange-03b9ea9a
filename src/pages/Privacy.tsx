import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";

const Privacy = () => {
  return (
    <Layout>
      <Helmet>
        <title>Privacy Policy - xlama</title>
        <meta
          name="description"
          content="xlama Privacy Policy. Learn how we collect, use, and protect your information."
        />
      </Helmet>

      <section className="py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: January 4, 2026
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p className="text-muted-foreground">
                xlama ("we", "our", or "us") is committed to protecting your privacy. This Privacy 
                Policy explains how we collect, use, and safeguard your information when you use our 
                cryptocurrency exchange service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect minimal information necessary to provide our services:
              </p>
              
              <h3 className="text-lg font-medium mt-4">Instant Mode</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Wallet Addresses:</strong> Destination and refund addresses you provide</li>
                <li><strong>Transaction Data:</strong> Exchange amounts, currency pairs, and transaction IDs</li>
                <li><strong>Technical Data:</strong> IP address, browser type for security purposes</li>
              </ul>
              
              <h3 className="text-lg font-medium mt-4">DEX Mode</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Wallet Address:</strong> Your connected wallet's public address</li>
                <li><strong>Transaction Data:</strong> On-chain swap transactions (publicly visible on blockchain)</li>
                <li><strong>No Private Keys:</strong> We never have access to your wallet's private keys</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use collected information to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process and complete your cryptocurrency exchanges</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our service and user experience</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Blockchain Transparency</h2>
              <p className="text-muted-foreground">
                Please note that blockchain transactions are publicly visible. When you use DEX Mode, 
                your swap transactions, wallet address, and token balances are visible on the public 
                blockchain. This is inherent to blockchain technology and not within our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell or rent your personal information. We may share information only in the 
                following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>With service providers (ChangeNow, OKX DEX) necessary to complete exchanges</li>
                <li>When required by law or legal process</li>
                <li>To protect our rights and prevent fraud</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption of data in transit (HTTPS)</li>
                <li>No storage of private keys or seed phrases</li>
                <li>Regular security monitoring and audits</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Wallet Security</h2>
              <p className="text-muted-foreground">
                When using DEX Mode, you connect your own wallet (MetaMask, Phantom, Solflare, Sui Wallet, 
                Tonkeeper, TokenPocket, or others). We never have access to your private keys or seed phrase. 
                You are responsible for securing your wallet credentials.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Cookies and Local Storage</h2>
              <p className="text-muted-foreground">
                We use cookies and local storage to remember your preferences (theme, wallet connection 
                status, recent tokens) and improve your experience. You can control these through your 
                browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Your Rights</h2>
              <p className="text-muted-foreground">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to certain processing activities</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Our service integrates with ChangeNow for instant exchanges, OKX DEX for on-chain 
                swaps, and various wallet providers including Phantom, Solflare, MetaMask, Sui Wallet, 
                Tonkeeper, and TokenPocket. Their privacy practices are governed by their own privacy 
                policies. We encourage you to review their terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. We will notify you of any material changes 
                by posting the new policy on this page with an updated revision date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">12. Contact Us</h2>
              <p className="text-muted-foreground">
                For questions about this Privacy Policy or our privacy practices, please contact us at{" "}
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

export default Privacy;
