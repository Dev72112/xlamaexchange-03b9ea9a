import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { XIcon, TelegramIcon, SOCIAL_LINKS } from "./SocialIcons";
import { showCookieConsent } from "./CookieConsent";
import { FeedbackSettings } from "./FeedbackSettings";
import { prefetchRoute } from "@/lib/routePrefetch";

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  // Prefetch route on hover
  const handleLinkHover = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  return (
    <footer className="border-t border-border bg-background" role="contentinfo">
      <div className="container px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl" aria-label="xlama home">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">X</span>
              </div>
              <span className="text-foreground">xlama</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fast, secure, and anonymous cryptocurrency exchange. Instant swaps and DEX aggregation with the best rates across 25+ chains.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-2">
              <a
                href={SOCIAL_LINKS.x.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={SOCIAL_LINKS.x.label}
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.telegram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={SOCIAL_LINKS.telegram.label}
              >
                <TelegramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Exchange Links */}
          <nav aria-label="Exchange links">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Exchange</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" onMouseEnter={() => handleLinkHover('/')} className="text-foreground/80 hover:text-foreground transition-colors">Instant Swap</Link></li>
              <li><Link to="/" onMouseEnter={() => handleLinkHover('/')} className="text-foreground/80 hover:text-foreground transition-colors">DEX Aggregator</Link></li>
              <li><Link to="/bridge" onMouseEnter={() => handleLinkHover('/bridge')} className="text-foreground/80 hover:text-foreground transition-colors">Cross-Chain Bridge</Link></li>
              <li><Link to="/orders" onMouseEnter={() => handleLinkHover('/orders')} className="text-foreground/80 hover:text-foreground transition-colors">Orders</Link></li>
              <li><Link to="/tools" onMouseEnter={() => handleLinkHover('/tools')} className="text-foreground/80 hover:text-foreground transition-colors">Trading Tools</Link></li>
              <li><Link to="/compare" onMouseEnter={() => handleLinkHover('/compare')} className="text-foreground/80 hover:text-foreground transition-colors">Token Compare</Link></li>
            </ul>
          </nav>

          {/* Support Links */}
          <nav aria-label="Support links">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/faq" onMouseEnter={() => handleLinkHover('/faq')} className="text-foreground/80 hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/about" onMouseEnter={() => handleLinkHover('/about')} className="text-foreground/80 hover:text-foreground transition-colors">About Us</Link></li>
              <li>
                <a href="mailto:support.xlama@defixlama.com" className="text-foreground/80 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Contact Us
                </a>
              </li>
            </ul>
          </nav>

          {/* Legal Links */}
          <nav aria-label="Legal links">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/terms" onMouseEnter={() => handleLinkHover('/terms')} className="text-foreground/80 hover:text-foreground transition-colors">Terms of Use</Link></li>
              <li><Link to="/privacy" onMouseEnter={() => handleLinkHover('/privacy')} className="text-foreground/80 hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" onMouseEnter={() => handleLinkHover('/cookies')} className="text-foreground/80 hover:text-foreground transition-colors">Cookie Policy</Link></li>
              <li>
                <button 
                  onClick={showCookieConsent}
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  Manage Cookies
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} xlama. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <FeedbackSettings />
            <span>Powered by ChangeNow, OKX DEX & Li.Fi</span>
          </div>
        </div>
      </div>
    </footer>
  );
});
