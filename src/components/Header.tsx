import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { HeaderThemeCustomizer } from "./HeaderThemeCustomizer";
import { Menu, X, Search, Clock, ArrowRightLeft, BarChart3, LineChart, Link2, Wrench, ListOrdered } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";
import { XIcon, TelegramIcon, SOCIAL_LINKS } from "./SocialIcons";
import { Progress } from "@/components/ui/progress";
import { useRouteLoading } from "@/contexts/RouteLoadingContext";
import { prefetchRoute } from "@/lib/routePrefetch";
import xlamaMascot from "@/assets/xlama-mascot.png";
import { MultiWalletButton } from "./wallet/MultiWalletButton";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { isRouteLoading, progress } = useRouteLoading();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Exchange", icon: ArrowRightLeft },
    { path: "/bridge", label: "Bridge", icon: Link2 },
    { path: "/orders", label: "Orders", icon: ListOrdered },
    { path: "/tools", label: "Tools", icon: Wrench },
    { path: "/portfolio", label: "Portfolio", icon: BarChart3 },
    { path: "/analytics", label: "Analytics", icon: LineChart },
    { path: "/history", label: "History", icon: Clock },
  ];

  // Prefetch route on hover
  const handleLinkHover = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass border-b border-border/50 shadow-sm">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl group hover-lift">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden transition-transform group-hover:scale-105 ring-2 ring-primary/20">
              <img 
                src={xlamaMascot} 
                alt="xLama mascot" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-foreground hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">xlama</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => handleLinkHover(link.path)}
                onTouchStart={() => handleLinkHover(link.path)}
                onFocus={() => handleLinkHover(link.path)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.path)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                aria-current={isActive(link.path) ? "page" : undefined}
              >
                {link.icon && <link.icon className="w-4 h-4" aria-hidden="true" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Wallet Button */}
            <div className="hidden sm:block">
              <MultiWalletButton />
            </div>

            {/* Social Links */}
            <div className="hidden lg:flex items-center gap-1">
              <a
                href={SOCIAL_LINKS.x.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label={SOCIAL_LINKS.x.label}
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.telegram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label={SOCIAL_LINKS.telegram.label}
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
              aria-label="Open search"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
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
              aria-label="Open search"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </Button>

            <HeaderThemeCustomizer />
            <ThemeToggle />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Header progress indicator (page transitions) */}
        {isRouteLoading && (
          <div className="w-full" aria-hidden="true">
            <Progress value={progress} className="h-1 rounded-none" />
          </div>
        )}

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden border-t border-border bg-background p-4"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  onTouchStart={() => handleLinkHover(link.path)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors active:bg-accent/70",
                    isActive(link.path)
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                  aria-current={isActive(link.path) ? "page" : undefined}
                >
                  {link.icon && <link.icon className="w-4 h-4" aria-hidden="true" />}
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Wallet Button */}
              <div className="pt-2 mt-2 border-t border-border">
                <MultiWalletButton />
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
