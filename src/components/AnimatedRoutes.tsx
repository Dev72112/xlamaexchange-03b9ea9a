/**
 * AnimatedRoutes - CSS-based page transitions
 * Replaced framer-motion AnimatePresence with lightweight CSS animations
 * Saves ~100KB from initial bundle
 */

import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface AnimatedRoutesProps {
  children: ReactNode;
}

export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  const location = useLocation();

  return (
    <div 
      key={location.pathname} 
      className="page-enter min-h-0"
    >
      {children}
    </div>
  );
}
