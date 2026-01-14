import { ReactNode } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface AnimatedRoutesProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.15, // Faster for perceived performance
};

export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
