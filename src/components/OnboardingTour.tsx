import { memo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Wallet, 
  ArrowLeftRight, 
  BarChart3, 
  Sparkles,
  CheckCircle2,
  Compass,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useHapticFeedback";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Wallet;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to xLama! 🦙",
    description: "Your all-in-one crypto trading hub across 25+ chains. Let's take a quick tour of the key features.",
    icon: Sparkles,
    position: 'center',
  },
  {
    id: "swap-modes",
    title: "Swap Modes",
    description: "Toggle between Instant (900+ tokens, cross-chain) and DEX (on-chain, 400+ DEXs) modes for flexible trading options.",
    icon: ArrowLeftRight,
    targetSelector: '[data-tour="mode-toggle"]',
    position: 'bottom',
  },
  {
    id: "wallet",
    title: "Connect Your Wallet",
    description: "Use OKX Wallet (recommended) for seamless multi-chain support, or connect MetaMask, Phantom, and 526+ other wallets.",
    icon: Wallet,
    targetSelector: '[data-tour="wallet-button"]',
    position: 'bottom',
  },
  {
    id: "bridge",
    title: "Cross-Chain Bridge",
    description: "Move assets between 20+ chains using Li.Fi's aggregated bridge protocols like Stargate, Hop, and Across.",
    icon: Compass,
    position: 'center',
  },
  {
    id: "perpetuals",
    title: "Perpetual Trading",
    description: "Trade crypto with up to 50x leverage via Hyperliquid. Go long or short on BTC, ETH, SOL and 100+ markets.",
    icon: Activity,
    position: 'center',
  },
  {
    id: "portfolio",
    title: "Portfolio Tracking",
    description: "View holdings across all chains, track P&L history, and get rebalancing recommendations.",
    icon: BarChart3,
    position: 'center',
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "Start trading with the best rates. Check out FAQ for help or use the feedback button anytime.",
    icon: CheckCircle2,
    position: 'center',
  },
];

const TOUR_STORAGE_KEY = 'xlama-tour-completed';

export const OnboardingTour = memo(function OnboardingTour() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // CRITICAL: Only trigger tour on home page ("/") to prevent jumping around
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    const isHomePage = location.pathname === "/" || location.pathname === "/swap";
    
    if (!hasSeenTour && isHomePage) {
      // Delay tour start to let page fully load
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Update target element position
  useEffect(() => {
    if (!isOpen) return;
    
    const step = tourSteps[currentStep];
    if (step.targetSelector) {
      // Wait a bit for elements to render
      const findElement = () => {
        const element = document.querySelector(step.targetSelector!);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTargetRect(null);
        }
      };
      
      // Try immediately and after a short delay
      findElement();
      const timer = setTimeout(findElement, 300);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  const handleNext = useCallback(() => {
    hapticFeedback('light');
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    hapticFeedback('light');
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    hapticFeedback('medium');
    setIsOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);

  const handleSkip = useCallback(() => {
    hapticFeedback('light');
    handleComplete();
  }, [handleComplete]);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isCentered = step.position === 'center' || !targetRect;

  if (!isOpen) return null;

  // Calculate safe left position that keeps tooltip within viewport
  const getTooltipLeft = () => {
    if (!targetRect) return undefined;
    const cardWidth = 320;
    const margin = 16;
    const targetCenter = targetRect.left + targetRect.width / 2;
    const idealLeft = targetCenter - cardWidth / 2;
    return Math.min(Math.max(margin, idealLeft), window.innerWidth - cardWidth - margin);
  };

  const tooltipContent = (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "fixed z-[60] p-5 rounded-xl glass border border-primary/30 shadow-2xl",
        "left-4 right-4 sm:left-auto sm:right-auto sm:w-96 max-w-[calc(100vw-2rem)]",
        isCentered && "!left-4 !right-4 sm:!left-1/2 sm:!right-auto top-1/2 sm:-translate-x-1/2 -translate-y-1/2",
        !isCentered && step.position === 'bottom' && "mt-3",
        !isCentered && step.position === 'top' && "mb-3"
      )}
      style={
        !isCentered && targetRect
          ? {
              left: window.innerWidth >= 640 ? getTooltipLeft() : undefined,
              top:
                step.position === 'bottom'
                  ? Math.min(targetRect.bottom + 12, window.innerHeight - 320)
                  : step.position === 'top'
                  ? Math.max(80, targetRect.top - 240)
                  : targetRect.top,
            }
          : undefined
      }
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center glow-sm"
          >
            <step.icon className="w-5 h-5 text-primary" />
          </motion.div>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {tourSteps.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <motion.h3 
        key={`title-${step.id}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="text-lg font-semibold mb-2 break-words"
      >
        {step.title}
      </motion.h3>
      <motion.p 
        key={`desc-${step.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-muted-foreground mb-5 leading-relaxed break-words"
      >
        {step.description}
      </motion.p>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {tourSteps.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              hapticFeedback('light');
              setCurrentStep(index);
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentStep
                ? "bg-primary w-6"
                : index < currentStep
                ? "bg-primary/50 w-2"
                : "bg-muted-foreground/30 w-2"
            )}
            aria-label={`Go to step ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        {!isFirstStep ? (
          <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip Tour
          </Button>
        )}

        <Button size="sm" onClick={handleNext} className="gap-1">
          {isLastStep ? (
            <>
              Get Started
              <Sparkles className="w-4 h-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Spotlight on target element */}
          {targetRect && !isCentered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed z-[56] rounded-lg ring-4 ring-primary/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
            />
          )}

          {tooltipContent}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

// Hook to manually trigger the tour
export function useTriggerTour() {
  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.location.reload();
  }, []);

  return { resetTour };
}
