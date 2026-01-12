import { useState, useEffect, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, X, ArrowRightLeft, Link2, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { motion, AnimatePresence } from "framer-motion";

interface FABAction {
  icon: typeof ArrowRightLeft;
  label: string;
  href: string;
  color: string;
}

const fabActions: FABAction[] = [
  { icon: ArrowRightLeft, label: "Swap", href: "/", color: "bg-primary" },
  { icon: Link2, label: "Bridge", href: "/bridge", color: "bg-blue-500" },
  { icon: BarChart3, label: "Portfolio", href: "/portfolio", color: "bg-green-500" },
  { icon: Wallet, label: "Connect", href: "#wallet", color: "bg-purple-500" },
];

export const FloatingActionButton = memo(function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isMobile = useIsMobile();

  // Hide FAB when scrolling down, show when scrolling up
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsOpen(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMobile]);

  const toggleOpen = useCallback(() => {
    hapticFeedback("medium");
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback((action: FABAction) => {
    hapticFeedback("light");
    setIsOpen(false);
    
    if (action.href === "#wallet") {
      // Dispatch custom event to open wallet modal
      window.dispatchEvent(new CustomEvent("open-wallet-modal"));
    }
  }, []);

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div
        className={cn(
          "fixed right-4 z-50 flex flex-col-reverse items-center gap-3 transition-all duration-300",
          // Position above mobile nav (h-16 = 64px + safe area + padding)
          "bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)]",
          !isVisible && "translate-y-32 opacity-0 pointer-events-none"
        )}
      >
        {/* Action buttons */}
        <AnimatePresence>
          {isOpen && (
            <>
              {fabActions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { delay: index * 0.05 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: 20, 
                    scale: 0.8,
                    transition: { delay: (fabActions.length - index - 1) * 0.05 }
                  }}
                >
                  {action.href === "#wallet" ? (
                    <button
                      onClick={() => handleActionClick(action)}
                      className="flex items-center gap-3 group"
                    >
                      <span className="px-3 py-1.5 rounded-lg glass border border-border/50 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {action.label}
                      </span>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover-lift",
                          action.color
                        )}
                      >
                        <action.icon className="w-5 h-5" />
                      </div>
                    </button>
                  ) : (
                    <Link
                      to={action.href}
                      onClick={() => handleActionClick(action)}
                      className="flex items-center gap-3 group"
                    >
                      <span className="px-3 py-1.5 rounded-lg glass border border-border/50 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {action.label}
                      </span>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover-lift",
                          action.color
                        )}
                      >
                        <action.icon className="w-5 h-5" />
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={toggleOpen}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
            "bg-primary text-primary-foreground",
            "glow",
            isOpen && "rotate-45"
          )}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </motion.button>
      </div>
    </>
  );
});
