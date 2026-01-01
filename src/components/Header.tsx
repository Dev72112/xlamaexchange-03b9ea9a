import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Star, Menu, X, Search, Clock, ArrowRightLeft, Info } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";

// Social icons as inline SVGs for consistency
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Exchange", icon: ArrowRightLeft },
    { path: "/favorites", label: "Favorites", icon: Star },
    { path: "/history", label: "History", icon: Clock },
    { path: "/about", label: "About", icon: Info },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">X</span>
            </div>
            <span className="text-foreground hidden sm:inline">xlama</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.path) 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Social Links */}
            <div className="hidden sm:flex items-center gap-1">
              <a
                href="https://x.com/XLAMA_OKX"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Follow us on X"
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href="https://t.me/XLAMA_OKX"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Join our Telegram"
              >
                <TelegramIcon className="w-4 h-4" />
              </a>
            </div>
            
            {/* Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search</span>
              <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium opacity-100 lg:inline-flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            
            {/* Mobile search */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </Button>
            
            <ThemeToggle />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.path) 
                      ? "bg-secondary text-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      
      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
