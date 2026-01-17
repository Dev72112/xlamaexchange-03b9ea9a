import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Mail, Sparkles } from "lucide-react";
import { XIcon, TelegramIcon, SOCIAL_LINKS } from "./SocialIcons";
import { showCookieConsent } from "./CookieConsent";
import { FeedbackSettings } from "./FeedbackSettings";
import { prefetchRoute } from "@/lib/routePrefetch";
import { useScrollReveal, getScrollRevealClass } from "@/hooks/useScrollReveal";

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  // Scroll reveal for sections
  const { ref: brandRef, isVisible: brandVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: linksRef, isVisible: linksVisible } = useScrollReveal<HTMLDivElement>();

  // Prefetch route on hover
  const handleLinkHover = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  return (
    <footer className="relative border-t border-border/50 bg-gradient-to-b from-background to-secondary/10 pb-20 md:pb-0" role="contentinfo">
      {/* Subtle glow effect at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container px-4 sm:px-6 py-10 sm:py-12">
        <div 
          ref={brandRef}
          className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-4 ${getScrollRevealClass(brandVisible, 'slide-up')}`}
        >
          {/* Brand Column */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl group" aria-label="xlama home">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
                <span className="text-primary-foreground font-bold text-sm">X</span>
              </div>
              <span className="text-foreground group-hover:text-primary transition-colors">xlama</span>
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
                className="p-2.5 rounded-lg glass text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover-lift"
                aria-label={SOCIAL_LINKS.x.label}
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.telegram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg glass text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover-lift"
                aria-label={SOCIAL_LINKS.telegram.label}
              >
                <TelegramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Exchange Links */}
          <nav aria-label="Exchange links">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Exchange
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" onMouseEnter={() => handleLinkHover('/')} onTouchStart={() => handleLinkHover('/')} className="text-foreground/80 hover:text-primary transition-colors">Instant Swap</Link></li>
              <li><Link to="/" onMouseEnter={() => handleLinkHover('/')} onTouchStart={() => handleLinkHover('/')} className="text-foreground/80 hover:text-primary transition-colors">DEX Aggregator</Link></li>
              <li><Link to="/perpetuals" onMouseEnter={() => handleLinkHover('/perpetuals')} onTouchStart={() => handleLinkHover('/perpetuals')} className="text-foreground/80 hover:text-primary transition-colors">Perpetuals</Link></li>
              <li><Link to="/bridge" onMouseEnter={() => handleLinkHover('/bridge')} onTouchStart={() => handleLinkHover('/bridge')} className="text-foreground/80 hover:text-primary transition-colors">Cross-Chain Bridge</Link></li>
              <li><Link to="/orders" onMouseEnter={() => handleLinkHover('/orders')} onTouchStart={() => handleLinkHover('/orders')} className="text-foreground/80 hover:text-primary transition-colors">Orders</Link></li>
              <li><Link to="/portfolio" onMouseEnter={() => handleLinkHover('/portfolio')} onTouchStart={() => handleLinkHover('/portfolio')} className="text-foreground/80 hover:text-primary transition-colors">Portfolio</Link></li>
            </ul>
          </nav>

          {/* Support Links */}
          <nav aria-label="Support links">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/docs" onMouseEnter={() => handleLinkHover('/docs')} onTouchStart={() => handleLinkHover('/docs')} className="text-foreground/80 hover:text-primary transition-colors">Documentation</Link></li>
              <li><Link to="/changelog" onMouseEnter={() => handleLinkHover('/changelog')} onTouchStart={() => handleLinkHover('/changelog')} className="text-foreground/80 hover:text-primary transition-colors">Changelog</Link></li>
              <li><Link to="/feedback" onMouseEnter={() => handleLinkHover('/feedback')} onTouchStart={() => handleLinkHover('/feedback')} className="text-foreground/80 hover:text-primary transition-colors">Community Feedback</Link></li>
              <li><Link to="/faq" onMouseEnter={() => handleLinkHover('/faq')} onTouchStart={() => handleLinkHover('/faq')} className="text-foreground/80 hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/about" onMouseEnter={() => handleLinkHover('/about')} onTouchStart={() => handleLinkHover('/about')} className="text-foreground/80 hover:text-primary transition-colors">About Us</Link></li>
              <li>
                <a href="mailto:support.xlama@defixlama.com" className="text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-1.5">
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
              <li><Link to="/terms" onMouseEnter={() => handleLinkHover('/terms')} onTouchStart={() => handleLinkHover('/terms')} className="text-foreground/80 hover:text-primary transition-colors">Terms of Use</Link></li>
              <li><Link to="/privacy" onMouseEnter={() => handleLinkHover('/privacy')} onTouchStart={() => handleLinkHover('/privacy')} className="text-foreground/80 hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" onMouseEnter={() => handleLinkHover('/cookies')} onTouchStart={() => handleLinkHover('/cookies')} className="text-foreground/80 hover:text-primary transition-colors">Cookie Policy</Link></li>
              <li>
                <button 
                  onClick={showCookieConsent}
                  className="text-foreground/80 hover:text-primary transition-colors"
                >
                  Manage Cookies
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div 
          ref={linksRef}
          className={`mt-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 ${getScrollRevealClass(linksVisible, 'fade')}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 glow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success font-medium">Live</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {currentYear} xlama
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <FeedbackSettings />
            <span className="glass px-3 py-1 rounded-full">v2.3 • Powered by ChangeNow, OKX DEX, Li.Fi, Jupiter & Hyperliquid</span>
          </div>
        </div>
      </div>
    </footer>
  );
});
