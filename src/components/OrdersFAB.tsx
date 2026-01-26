/**
 * Orders Floating Action Button
 * 
 * Mobile-only FAB for quick order creation on the Orders page.
 * Positioned above the collapsed mobile nav pill.
 */

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, CalendarClock, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface OrdersFABProps {
  onCreateLimitOrder: () => void;
  onCreateDCAOrder: () => void;
  className?: string;
}

export const OrdersFAB = memo(function OrdersFAB({ 
  onCreateLimitOrder,
  onCreateDCAOrder,
  className 
}: OrdersFABProps) {
  const isMobile = useIsMobile();
  const { trigger } = useHapticFeedback();
  const [isOpen, setIsOpen] = useState(false);

  const toggleFAB = useCallback(() => {
    trigger('light');
    setIsOpen(prev => !prev);
  }, [trigger]);

  const handleLimitOrder = useCallback(() => {
    trigger('medium');
    setIsOpen(false);
    onCreateLimitOrder();
  }, [trigger, onCreateLimitOrder]);

  const handleDCAOrder = useCallback(() => {
    trigger('medium');
    setIsOpen(false);
    onCreateDCAOrder();
  }, [trigger, onCreateDCAOrder]);

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className={cn("fixed right-4 bottom-20 z-50", className)}>
        {/* Speed dial options */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
            >
              {/* DCA Order */}
              <button
                onClick={handleDCAOrder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
              >
                <span className="text-sm font-medium">DCA Strategy</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-primary" />
                </div>
              </button>

              {/* Limit Order */}
              <button
                onClick={handleLimitOrder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg active:scale-95 transition-transform"
              >
                <span className="text-sm font-medium">Limit Order</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={toggleFAB}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center transition-all",
            isOpen && "rotate-45 bg-muted text-muted-foreground shadow-none"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.button>
      </div>
    </>
  );
});
