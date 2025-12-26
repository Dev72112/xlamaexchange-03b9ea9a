import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";

const Terms = () => {
  return (
    <Layout>
      <Helmet>
        <title>Terms of Use - CryptoSwap</title>
        <meta
          name="description"
          content="CryptoSwap Terms of Use. Read our terms and conditions for using our cryptocurrency exchange service."
        />
      </Helmet>

      <section className="py-20">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using CryptoSwap ("the Service"), you accept and agree to be bound by 
                these Terms of Use. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p className="text-muted-foreground">
                CryptoSwap provides a non-custodial cryptocurrency exchange service that allows users to 
                exchange one cryptocurrency for another. We act as an intermediary service provider and do 
                not hold or store user funds beyond what is necessary to complete an exchange.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Eligibility</h2>
              <p className="text-muted-foreground">
                You must be at least 18 years old to use this service. By using CryptoSwap, you represent 
                and warrant that you are of legal age and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. User Responsibilities</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Ensure all wallet addresses provided are correct and valid</li>
                <li>Send the exact amount specified for the exchange</li>
                <li>Not use the service for any illegal or unauthorized purpose</li>
                <li>Not attempt to manipulate or exploit the service</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Exchange Process</h2>
              <p className="text-muted-foreground">
                When you initiate an exchange, you agree to send the specified amount of cryptocurrency to 
                the deposit address provided. The exchange rate shown at the time of confirmation is 
                subject to the following:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Standard Rate:</strong> May fluctuate based on market conditions</li>
                <li><strong>Fixed Rate:</strong> Locked for 15 minutes from exchange creation</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Refunds</h2>
              <p className="text-muted-foreground">
                If an exchange cannot be completed and you have provided a valid refund address, we will 
                attempt to refund your funds minus any network fees incurred. Refunds are not guaranteed 
                if an invalid refund address is provided.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Prohibited Activities</h2>
              <p className="text-muted-foreground">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the service for money laundering or terrorist financing</li>
                <li>Exchange funds obtained through illegal means</li>
                <li>Violate any applicable anti-money laundering (AML) regulations</li>
                <li>Attempt to circumvent our security measures</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                CryptoSwap is provided "as is" without warranties of any kind. We are not liable for any 
                losses resulting from market volatility, blockchain delays, user errors, or circumstances 
                beyond our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Continued use of the service after 
                changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us at{" "}
                <a href="mailto:support@cryptoswap.com" className="text-primary hover:underline">
                  support@cryptoswap.com
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
