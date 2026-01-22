import { memo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  ArrowLeftRight, 
  Compass, 
  ClipboardList, 
  PieChart, 
  Activity,
  MoreHorizontal,
  Search,
  Bell,
  Moon,
  Sun,
  BarChart3,
  History,
  Wrench,
  FileText,
  HelpCircle,
  MessageSquare,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import xlamaMascot from "@/assets/xlama-mascot.png";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/swap", icon: ArrowLeftRight, label: "Exchange" },
  { path: "/bridge", icon: Compass, label: "Bridge" },
  { path: "/perpetuals", icon: Activity, label: "Perps" },
  { path: "/portfolio", icon: PieChart, label: "Portfolio" },
];

const moreItems = [
  { path: "/orders", icon: ClipboardList, label: "Orders" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/history", icon: History, label: "History" },
  { path: "/tools", icon: Wrench, label: "Tools" },
  { path: "/docs", icon: FileText, label: "Docs" },
  { path: "/faq", icon: HelpCircle, label: "FAQ" },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const { trigger } = useHapticFeedback();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleNavClick = () => {
    trigger('light');
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    trigger('light');
  };

  const isMoreActive = moreItems.some(item => location.pathname === item.path);

  return (
    <>
      {/* Top utility bar for mobile - replaces header */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-b border-border/40 px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img 
              src={xlamaMascot} 
              alt="xLama" 
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="font-semibold text-sm">xLama</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchOpen(true);
                trigger('light');
              }}
              className="h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed top bar */}
      <div className="h-[48px] md:hidden" />

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-border/50 safe-area-bottom"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-6 gap-1 px-1 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200",
                  "touch-target min-h-[56px]",
                  isActive 
                    ? "text-primary bg-primary/10 glow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 mb-1 transition-transform duration-200",
                    isActive && "scale-110"
                  )} 
                />
                <span className={cn(
                  "text-[10px] font-medium leading-tight truncate max-w-full",
                  isActive && "text-primary"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
                )}
              </NavLink>
            );
          })}
          
          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={handleNavClick}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200",
                  "touch-target min-h-[56px]",
                  isMoreActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <MoreHorizontal className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium leading-tight">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 mb-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.path} asChild>
                    <NavLink to={item.path} className="flex items-center gap-2 cursor-pointer">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/feedback" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  Feedback
                </NavLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Global Search */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
});
