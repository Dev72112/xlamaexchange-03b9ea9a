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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MultiWalletButton } from "@/features/wallet";
import { FeedbackSettings } from "@/components/FeedbackSettings";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import xlamaMascot from "@/assets/xlama-mascot.png";

// Wallet disconnect button component
const WalletDisconnectButton = memo(function WalletDisconnectButton() {
  const { isConnected, disconnect } = useMultiWallet();
  const { trigger } = useHapticFeedback();
  
  if (!isConnected) return null;
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        trigger('medium');
        disconnect();
      }}
      className="h-8 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="text-xs">Disconnect</span>
    </Button>
  );
});

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
  { path: "/compare", icon: BarChart3, label: "Compare" },
  { path: "/docs", icon: FileText, label: "Docs" },
  { path: "/faq", icon: HelpCircle, label: "FAQ" },
  { path: "/feedback", icon: MessageSquare, label: "Feedback" },
];

// Smooth animation config - optimized for 60fps
const springTransition = { type: "spring" as const, damping: 30, stiffness: 400, mass: 0.8 };
const fadeTransition = { type: "spring" as const, damping: 25, stiffness: 300, mass: 0.7 };
const easeTransition = { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const };

// Touch-optimized minimum sizes
const TOUCH_TARGET_SIZE = 44; // Apple HIG recommendation

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
      {canUseDOM
        ? createPortal(
            <>
              {/* Top utility bar for mobile */}
              <motion.div 
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, ...springTransition }}
                className="fixed top-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-b border-border/40 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
                    <motion.img 
                      src={xlamaMascot} 
                      alt="xLama" 
                      className="w-7 h-7 rounded-lg object-cover"
                      whileTap={{ scale: 0.9 }}
                    />
                    <span className="font-semibold text-sm">xLama</span>
                  </Link>
                  <div className="flex items-center gap-1">
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
                    
                    <NotificationCenter />
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setShowSettings(prev => !prev);
                        trigger('light');
                      }}
                      className="h-9 w-9"
                    >
                      <motion.div animate={{ rotate: showSettings ? 90 : 0 }} transition={springTransition}>
                        <Settings className="h-4 w-4" />
                      </motion.div>
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
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
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
                            <motion.div
                              animate={{ rotate: theme === "dark" ? 0 : 180 }}
                              transition={springTransition}
                            >
                              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                            </motion.div>
                            <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <FeedbackSettings />
                          <WalletDisconnectButton />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Backdrop with blur */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => {
                      setIsExpanded(false);
                      setShowMore(false);
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Collapsed floating pill */}
              <AnimatePresence>
                {!isExpanded && (
                  <motion.button
                    initial={{ y: 100, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.9 }}
                    transition={fadeTransition}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleExpand}
                    className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 border border-primary/20"
                  >
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </motion.div>
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
                    transition={fadeTransition}
                    className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
                  >
                    {/* More menu grid */}
                    <AnimatePresence>
                      {showMore && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden border-b border-border/50"
                        >
                          <div className="grid grid-cols-4 gap-1 p-2">
                            {moreItems.map((item, index) => {
                              const Icon = item.icon;
                              const isActive = location.pathname === item.path;
                              return (
                                <motion.div
                                  key={item.path}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                >
                                  <NavLink
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
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Primary nav - optimized touch targets */}
                    <div className="flex items-center justify-around px-1 py-1">
                      {navItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={cn(
                              "flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl min-w-[52px] min-h-[52px] transition-colors active:scale-95",
                              isActive 
                                ? "text-primary bg-primary/5" 
                                : "text-muted-foreground active:text-foreground active:bg-muted/50"
                            )}
                            style={{ minHeight: TOUCH_TARGET_SIZE }}
                          >
                            <div className="relative">
                              <motion.div
                                animate={{ scale: isActive ? 1.05 : 1 }}
                                transition={{ duration: 0.15 }}
                                className="gpu-accelerated"
                              >
                                <Icon className="w-5 h-5" />
                              </motion.div>
                              {isActive && (
                                <motion.div
                                  layoutId="nav-indicator-mobile"
                                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
                          "flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl min-w-[52px] min-h-[52px] transition-colors active:scale-95",
                          showMore || isMoreActive
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground active:text-foreground active:bg-muted/50"
                        )}
                        style={{ minHeight: TOUCH_TARGET_SIZE }}
                      >
                        <motion.div 
                          animate={{ rotate: showMore ? 180 : 0 }} 
                          transition={{ duration: 0.15 }}
                          className="gpu-accelerated"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </motion.div>
                        <span className="text-[10px] font-medium">More</span>
                      </button>
                    </div>

                    {/* Collapse button */}
                    <div className="flex justify-center pb-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleExpand}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-muted-foreground text-xs bg-muted/50 active:bg-muted transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Close</span>
                      </motion.button>
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