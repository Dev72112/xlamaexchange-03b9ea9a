import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { ArrowRightLeft } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="gradient-text">CryptoSwap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Exchange
          </Link>
          <Link to="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link to="/terms" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link to="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
