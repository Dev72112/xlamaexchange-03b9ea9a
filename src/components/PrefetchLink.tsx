import { forwardRef, useCallback } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute } from '@/lib/routePrefetch';

interface PrefetchLinkProps extends LinkProps {
  prefetchDelay?: number;
}

/**
 * A Link component that prefetches the target route on hover.
 * This makes page transitions feel instant by loading the component ahead of time.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetchDelay = 50, onMouseEnter, onFocus, ...props }, ref) => {
    const path = typeof to === 'string' ? to : to.pathname || '';

    const handlePrefetch = useCallback(() => {
      // Small delay to avoid prefetching on quick mouse movements
      const timeoutId = setTimeout(() => {
        prefetchRoute(path);
      }, prefetchDelay);
      
      return () => clearTimeout(timeoutId);
    }, [path, prefetchDelay]);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onMouseEnter?.(e);
    }, [handlePrefetch, onMouseEnter]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onFocus?.(e);
    }, [handlePrefetch, onFocus]);

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
