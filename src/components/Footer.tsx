import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { XIcon, TelegramIcon, SOCIAL_LINKS } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background" role="contentinfo">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl" aria-label="xlama home">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">X</span>
              </div>
              <span className="text-foreground">xlama</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Fast, secure, and anonymous cryptocurrency exchange. Instant swaps and DEX aggregation with the best rates across 20+ chains.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href={SOCIAL_LINKS.x.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={SOCIAL_LINKS.x.label}
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.telegram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={SOCIAL_LINKS.telegram.label}
              >
                <TelegramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          <nav aria-label="Exchange links">
            <h4 className="font-semibold mb-4">Exchange</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Instant Swap</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">DEX Aggregator</Link></li>
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
            </ul>
          </nav>

          <nav aria-label="Support links">
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li>
                <a href="mailto:support.xlama@defixlama.com" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Contact Us
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal links">
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} xlama. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Powered by ChangeNow & OKX DEX</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
