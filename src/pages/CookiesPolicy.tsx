import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, BarChart3, Megaphone, Cookie, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showCookieConsent } from "@/components/CookieConsent";

export default function CookiesPolicy() {
  return (
    <Layout>
      <Helmet>
        <title>Cookie Policy - xlama</title>
        <meta name="description" content="Learn about how xlama uses cookies to improve your experience on our cryptocurrency exchange platform." />
      </Helmet>

      <div className="container py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Cookie className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Cookie Policy</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              This policy explains how xlama uses cookies and similar technologies to recognize you when you visit our platform.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: January 4, 2026
            </p>
          </div>

          {/* What are cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-primary" />
                What are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Cookies are small text files that are stored on your device when you visit a website. They help the website remember your preferences and improve your browsing experience.
              </p>
              <p>
                We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device for a set period or until you delete them).
              </p>
            </CardContent>
          </Card>

          {/* Cookie Categories */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Types of Cookies We Use</h2>
            
            {/* Essential Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Essential Cookies
                  <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded">Always Active</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Cookie Name</th>
                        <th className="text-left py-2 font-medium">Purpose</th>
                        <th className="text-left py-2 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">xlama-cookie-consent</td>
                        <td className="py-2">Stores your cookie consent status</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">xlama-cookie-preferences</td>
                        <td className="py-2">Stores your cookie preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">xlama-theme</td>
                        <td className="py-2">Remembers your theme preference (dark/light)</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">xlama-favorites</td>
                        <td className="py-2">Stores your favorite trading pairs</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Analytics Cookies
                  <span className="ml-auto text-xs font-normal bg-muted text-muted-foreground px-2 py-1 rounded">Optional</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our services.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Cookie Name</th>
                        <th className="text-left py-2 font-medium">Purpose</th>
                        <th className="text-left py-2 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">_ga</td>
                        <td className="py-2">Google Analytics - Distinguishes users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">_gid</td>
                        <td className="py-2">Google Analytics - Distinguishes users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">_gat</td>
                        <td className="py-2">Google Analytics - Throttle request rate</td>
                        <td className="py-2">1 minute</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Marketing Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  Marketing Cookies
                  <span className="ml-auto text-xs font-normal bg-muted text-muted-foreground px-2 py-1 rounded">Optional</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  These cookies are used to deliver advertisements more relevant to you and your interests. They may also be used to limit the number of times you see an advertisement.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Cookie Name</th>
                        <th className="text-left py-2 font-medium">Purpose</th>
                        <th className="text-left py-2 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 font-mono text-xs">_fbp</td>
                        <td className="py-2">Facebook Pixel - Track conversions</td>
                        <td className="py-2">3 months</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">_fbc</td>
                        <td className="py-2">Facebook Pixel - Store click identifier</td>
                        <td className="py-2">3 months</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Managing Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Managing Your Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You can change your cookie preferences at any time by clicking the button below. You can also configure your browser to block or delete cookies, although this may affect some website functionality.
              </p>
              <Button onClick={showCookieConsent} className="gap-2">
                <Settings className="w-4 h-4" />
                Manage Cookie Preferences
              </Button>
              <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Browser Settings</p>
                <p>
                  Most web browsers allow you to control cookies through their settings. Here are links to instructions for common browsers:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-center">
                If you have any questions about our use of cookies, please contact us at{" "}
                <a href="mailto:support.xlama@defixlama.com" className="text-primary hover:underline">
                  support.xlama@defixlama.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
