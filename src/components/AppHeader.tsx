/**
 * AppHeader - Compact header for trading/app pages
 * Streamlined navigation with essential actions only
 */
import { memo, useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";
import xlamaMascot from "@/assets/xlama-mascot.png";
import { MultiWalletButton } from "./wallet/MultiWalletButton";
import { NotificationCenter } from "./NotificationCenter";
import { ThemeToggle } from "./ThemeToggle";
import { Progress } from "@/components/ui/progress";
import { useRouteLoading } from "@/contexts/RouteLoadingContext";
import { 
  ArrowRightLeft, 
  Link2, 
  Activity, 
  ListOrdered, 
  BarChart3,
  Clock,
  LineChart,
} from "lucide-react";

const navLinks = [
  { path: "/swap", label: "Swap", icon: ArrowRightLeft },
  { path: "/bridge", label: "Bridge", icon: Link2 },
  { path: "/perpetuals", label: "Perps", icon: Activity },
  { path: "/orders", label: "Orders", icon: ListOrdered },
  { path: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { path: "/analytics", label: "Analytics", icon: LineChart },
  { path: "/history", label: "History", icon: Clock },
];

export const AppHeader = memo(function AppHeader() {
  const location = useLocation();
  const { isRouteLoading, progress } = useRouteLoading();
  
  const handleLinkHover = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/30">
      <div className="container flex h-12 items-center justify-between gap-2 max-w-full px-3">
        {/* Logo - Compact */}
        <Link 
          to="/" 
          className="flex items-center gap-2 font-display font-bold shrink-0"
          onMouseEnter={() => handleLinkHover('/')}
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-primary/20">
            <img 
              src={xlamaMascot} 
              alt="xLama" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-foreground hidden sm:inline text-lg">xlama</span>
        </Link>

        {/* Compact Nav */}
        <nav className="hidden md:flex items-center gap-0.5" role="navigation">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onMouseEnter={() => handleLinkHover(link.path)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                isActive(link.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <link.icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <MultiWalletButton />
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>

      {/* Route loading progress */}
      {isRouteLoading && (
        <Progress value={progress} className="h-0.5 rounded-none" />
      )}
    </header>
  );
});
