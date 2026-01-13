import { memo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Wallet, 
  ArrowLeftRight, 
  BarChart3, 
  Sparkles,
  CheckCircle2
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
    title: "Welcome to xlama! 🦙",
    description: "Your all-in-one crypto exchange hub. Let us show you around the key features.",
    icon: Sparkles,
    position: 'center',
  },
  {
    id: "swap-modes",
    title: "Two Swap Modes",
    description: "Switch between Instant (custodial, 900+ tokens) and DEX (on-chain, 25+ chains) modes for flexible trading.",
    icon: ArrowLeftRight,
    targetSelector: '[data-tour="mode-toggle"]',
    position: 'bottom',
  },
  {
    id: "wallet",
    title: "Connect Your Wallet",
    description: "Connect OKX Wallet (recommended), MetaMask, Phantom, or any other wallet to start trading on-chain.",
    icon: Wallet,
    targetSelector: '[data-tour="wallet-button"]',
    position: 'bottom',
  },
  {
    id: "portfolio",
    title: "Track Your Portfolio",
    description: "View holdings across 25+ chains, track P&L history, and get rebalancing recommendations.",
    icon: BarChart3,
    targetSelector: '[data-tour="portfolio-link"]',
    position: 'top',
  },
  {
    id: "complete",
    title: "You're All Set! 🎉",
    description: "Start trading with the best rates across 400+ DEXs. Need help? Check our FAQ or send feedback anytime.",
    icon: CheckCircle2,
    position: 'center',
  },
];

const TOUR_STORAGE_KEY = 'xlama-tour-completed';

export const OnboardingTour = memo(function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if user has seen the tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasSeenTour) {
      // Delay tour start to let page load
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update target element position
  useEffect(() => {
    if (!isOpen) return;
    
    const step = tourSteps[currentStep];
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
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
    const cardWidth = 320; // max-w-sm = 384px, but actual is ~320px with padding
    const margin = 16;
    const targetCenter = targetRect.left + targetRect.width / 2;
    const idealLeft = targetCenter - cardWidth / 2;
    // Clamp to viewport bounds
    return Math.min(Math.max(margin, idealLeft), window.innerWidth - cardWidth - margin);
  };

  const tooltipContent = (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        // Mobile-first: full width with margins, then fixed width on larger screens
        "fixed z-[60] p-5 rounded-xl glass border border-primary/30 shadow-2xl",
        "left-4 right-4 sm:left-auto sm:right-auto sm:w-96 max-w-[calc(100vw-2rem)]",
        // Center positioning for welcome/complete steps
        isCentered && "!left-4 !right-4 sm:!left-1/2 sm:!right-auto top-1/2 sm:-translate-x-1/2 -translate-y-1/2",
        // Bottom margin to clear mobile nav bar
        !isCentered && step.position === 'bottom' && "mt-3",
        !isCentered && step.position === 'top' && "mb-3"
      )}
      style={
        !isCentered && targetRect
          ? {
              left: window.innerWidth >= 640 ? getTooltipLeft() : undefined, // Only apply on sm+
              top:
                step.position === 'bottom'
                  ? Math.min(targetRect.bottom + 12, window.innerHeight - 320) // Prevent overflow at bottom
                  : step.position === 'top'
                  ? Math.max(80, targetRect.top - 240) // Account for taller mobile cards
                  : targetRect.top,
            }
          : undefined
      }
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center glow-sm">
            <step.icon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {tourSteps.length}
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

      {/* Content - with overflow protection */}
      <h3 className="text-lg font-semibold mb-2 break-words">{step.title}</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed break-words overflow-hidden">
        {step.description}
      </p>

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
              "w-2 h-2 rounded-full transition-all",
              index === currentStep
                ? "bg-primary w-4"
                : index < currentStep
                ? "bg-primary/50"
                : "bg-muted-foreground/30"
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Spotlight on target element */}
          {targetRect && !isCentered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
