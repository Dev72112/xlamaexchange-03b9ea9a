/**
 * Loading Overlay Component
 * Full-screen or container loading states with consistent styling
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  blur?: boolean;
  fullScreen?: boolean;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  className,
  blur = true,
  fullScreen = false,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "flex items-center justify-center z-50",
            fullScreen ? "fixed inset-0" : "absolute inset-0",
            blur && "backdrop-blur-sm bg-background/60",
            !blur && "bg-background/80",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center gap-3 p-4"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            {message && (
              <p className="text-sm text-muted-foreground font-medium">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InlineLoader({ 
  className,
  size = 16,
}: { 
  className?: string;
  size?: number;
}) {
  return (
    <Loader2 
      className={cn("animate-spin text-muted-foreground", className)} 
      style={{ width: size, height: size }}
    />
  );
}

export function DotLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
