import { ReactNode, useMemo } from 'react';
import { motion, AnimatePresence, type Transition, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface AnimatedRoutesProps {
  children: ReactNode;
}

// Smooth, premium page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
  },
};

// Premium easing curve for smooth transitions
const pageTransition: Transition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for premium feel
  duration: 0.35,
};

// Route-specific transitions for enhanced UX
const routeTransitions: Record<string, { enter: Variants; exit: Variants }> = {
  '/': {
    enter: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
    },
    exit: {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 0, scale: 1.02 },
    },
  },
  '/swap': {
    enter: {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
    },
    exit: {
      initial: { opacity: 1, x: 0 },
      animate: { opacity: 0, x: -30 },
    },
  },
  '/perpetuals': {
    enter: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
    },
    exit: {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 0, y: -20 },
    },
  },
};

export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  const location = useLocation();
  
  // Get route-specific variants or use default
  const currentVariants = useMemo(() => {
    const routeConfig = routeTransitions[location.pathname];
    if (routeConfig) {
      return {
        initial: routeConfig.enter.initial,
        animate: routeConfig.enter.animate,
        exit: routeConfig.exit.animate,
      };
    }
    return pageVariants;
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={currentVariants}
        transition={pageTransition}
        className="min-h-0 will-change-transform"
        style={{ willChange: 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
