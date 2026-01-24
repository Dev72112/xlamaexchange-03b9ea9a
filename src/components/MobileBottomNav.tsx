import { memo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Compass, 
  ClipboardList, 
  PieChart, 
  Activity,
  MoreHorizontal,
  Search,
  Moon,
  Sun,
  BarChart3,
  History,
  Wrench,
  FileText,
  HelpCircle,
  MessageSquare,
  Home,
  ChevronUp,
  ChevronDown,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MultiWalletButton } from "@/features/wallet";
import { FeedbackSettings } from "@/components/FeedbackSettings";
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
  { path: "/feedback", icon: MessageSquare, label: "Feedback" },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const { trigger } = useHapticFeedback();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const canUseDOM = typeof document !== "undefined";

  const handleNavClick = useCallback(() => {
    trigger('light');
    setIsExpanded(false);
    setShowMore(false);
  }, [trigger]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
    trigger('light');
  }, [theme, setTheme, trigger]);

  const toggleExpand = useCallback(() => {
    trigger('light');
    setIsExpanded(prev => !prev);
    if (isExpanded) setShowMore(false);
  }, [isExpanded, trigger]);

  const isMoreActive = moreItems.some(item => location.pathname === item.path);

  return (
    <>
      {/* Spacer for the fixed top utility bar */}
      <div className="h-[56px] md:hidden" />

      {/* Render fixed mobile UI in a portal so it's truly viewport-fixed even inside animated/translated parents */}
      {canUseDOM
        ? createPortal(
            <>
              {/* Top utility bar for mobile */}
              <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur border-b border-border/40 px-3 py-2">
                <div className="flex items-center justify-between">
                  <Link to="/" className="flex items-center gap-2">
                    <img src={xlamaMascot} alt="xLama" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="font-semibold text-sm">xLama</span>
                  </Link>
                  <div className="flex items-center gap-1">
                    {/* Wallet Button - Compact for mobile */}
                    <MultiWalletButton />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearchOpen(true);
                        trigger('light');
                      }}
                      className="h-9 w-9"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    
                    {/* Notifications - using the component directly */}
                    <NotificationCenter />
                    
                    {/* Settings dropdown */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setShowSettings(prev => !prev);
                        trigger('light');
                      }}
                      className="h-9 w-9"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Settings dropdown panel */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/50 mt-2 pt-2"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Theme</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={toggleTheme} 
                            className="h-8 gap-1.5"
                          >
                            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                            <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
                          </Button>
                        </div>
                        <FeedbackSettings />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Backdrop */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => {
                      setIsExpanded(false);
                      setShowMore(false);
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Collapsed pill */}
              <AnimatePresence>
                {!isExpanded && (
                  <motion.button
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={toggleExpand}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary/20 active:scale-95 transition-transform"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Menu</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Expanded nav */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.nav
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
                  >
                    {/* More menu */}
                    <AnimatePresence>
                      {showMore && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-b border-border/50"
                        >
                          <div className="grid grid-cols-4 gap-1 p-2">
                            {moreItems.map((item) => {
                              const Icon = item.icon;
                              const isActive = location.pathname === item.path;
                              return (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  onClick={handleNavClick}
                                  className={cn(
                                    "flex flex-col items-center gap-1 py-3 px-2 rounded-lg transition-all",
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground active:bg-muted"
                                  )}
                                >
                                  <Icon className="w-5 h-5" />
                                  <span className="text-[10px] font-medium">{item.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Primary nav */}
                    <div className="flex items-center justify-around px-2 py-2">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={cn(
                              "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg min-w-[56px] transition-all",
                              isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
                            )}
                          >
                            <div className="relative">
                              <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                              {isActive && (
                                <motion.div
                                  layoutId="nav-indicator-mobile"
                                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                                />
                              )}
                            </div>
                            <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                              {item.label}
                            </span>
                          </NavLink>
                        );
                      })}
                      <button
                        onClick={() => {
                          trigger('light');
                          setShowMore((prev) => !prev);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg min-w-[56px] transition-all",
                          showMore || isMoreActive
                            ? "text-primary"
                            : "text-muted-foreground active:text-foreground"
                        )}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-[10px] font-medium">More</span>
                      </button>
                    </div>

                    {/* Collapse */}
                    <div className="flex justify-center pb-2">
                      <button
                        onClick={toggleExpand}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-muted-foreground text-xs bg-muted/50 active:bg-muted transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Close Menu</span>
                      </button>
                    </div>
                  </motion.nav>
                )}
              </AnimatePresence>
            </>,
            document.body
          )
        : null}

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
});