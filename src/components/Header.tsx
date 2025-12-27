import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Star, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Exchange" },
    { path: "/favorites", label: "Favorites", icon: Star },
    { path: "/faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">X</span>
          </div>
          <span className="text-foreground">xlama</span>
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
  );
}
