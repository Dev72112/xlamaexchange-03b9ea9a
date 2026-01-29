/**
 * GlowBar - Animated gradient top border for cards
 * Provides consistent visual polish across the application
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlowBarProps {
  className?: string;
  variant?: 'primary' | 'success' | 'warning' | 'multi' | 'premium';
  delay?: number;
  duration?: number;
}

const gradients = {
  primary: 'from-primary to-primary/60',
  success: 'from-success to-success/60',
  warning: 'from-warning to-warning/60',
  multi: 'from-primary via-chart-2 to-chart-4',
  premium: 'from-primary via-chart-2 via-chart-3 to-chart-4',
};

export function GlowBar({ 
  className, 
  variant = 'multi', 
  delay = 0,
  duration = 0.8,
}: GlowBarProps) {
  return (
    <motion.div 
      className={cn(
        "h-1 bg-gradient-to-r rounded-t-lg",
        gradients[variant],
        className
      )}
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ 
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1] 
      }}
    />
  );
}

/**
 * Static version without animation for server components or reduced motion
 */
export function GlowBarStatic({ 
  className, 
  variant = 'multi',
}: Pick<GlowBarProps, 'className' | 'variant'>) {
  return (
    <div 
      className={cn(
        "h-1 bg-gradient-to-r rounded-t-lg",
        gradients[variant],
        className
      )}
    />
  );
}
