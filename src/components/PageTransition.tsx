import React, { memo, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = memo(function PageTransition({ 
  children, 
  className 
}: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Reset visibility on route change
    setIsVisible(false);
    
    // Small delay to ensure exit animation completes
    const showTimer = requestAnimationFrame(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(showTimer);
  }, [location.key, children]);

  return (
    <div
      className={cn(
        "page-transition",
        isVisible ? "page-enter" : "page-exit",
        className
      )}
    >
      {displayChildren}
    </div>
  );
});

// Wrapper for route elements to add transitions
export function withPageTransition<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <PageTransition>
        <Component {...props} />
      </PageTransition>
    );
  };
}
