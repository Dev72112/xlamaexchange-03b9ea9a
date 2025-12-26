import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";

const Privacy = () => {
  return (
    <Layout>
      <Helmet>
        <title>Privacy Policy - CryptoSwap</title>
        <meta
          name="description"
          content="CryptoSwap Privacy Policy. Learn how we collect, use, and protect your information."
        />
      </Helmet>

      <section className="py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Introduction</h2>
              <p className="text-muted-foreground">
                CryptoSwap ("we", "our", or "us") is committed to protecting your privacy. This Privacy 
                Policy explains how we collect, use, and safeguard your information when you use our 
                cryptocurrency exchange service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect minimal information necessary to provide our exchange service:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Wallet Addresses:</strong> Destination and refund addresses you provide</li>
                <li><strong>Transaction Data:</strong> Exchange amounts, currency pairs, and transaction IDs</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and device information for security purposes</li>
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
              <h2 className="text-2xl font-semibold">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell or rent your personal information. We may share information only in the 
                following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>With service providers necessary to complete exchanges</li>
                <li>When required by law or legal process</li>
                <li>To protect our rights and prevent fraud</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication measures</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain transaction data for the duration required by applicable laws and regulations. 
                Technical data may be retained for security and analytical purposes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience and analyze usage 
                patterns. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Your Rights</h2>
              <p className="text-muted-foreground">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to certain processing activities</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Our service integrates with ChangeNow for exchange processing. Their privacy practices 
                are governed by their own privacy policy. We encourage you to review their terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. We will notify you of any material changes 
                by posting the new policy on this page with an updated revision date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">11. Contact Us</h2>
              <p className="text-muted-foreground">
                For questions about this Privacy Policy or our privacy practices, please contact us at{" "}
                <a href="mailto:privacy@cryptoswap.com" className="text-primary hover:underline">
                  privacy@cryptoswap.com
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
