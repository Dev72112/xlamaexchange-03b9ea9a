/**
 * Lazy Wallet Loader - Defers heavy wallet SDK imports until needed
 * This improves initial page load by not blocking on wallet initialization
 */
import { lazy, Suspense, ReactNode, useState, useEffect } from 'react';

// Lazy load the full MultiWalletContext which imports heavy SDKs
const MultiWalletProviderLazy = lazy(() => 
  import('./MultiWalletContext').then(mod => ({ 
    default: mod.MultiWalletProvider 
  }))
);

interface LazyWalletLoaderProps {
  children: ReactNode;
}

// Minimal placeholder context for initial render
export function LazyWalletLoader({ children }: LazyWalletLoaderProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Start loading wallet providers after initial paint
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShouldLoad(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!shouldLoad) {
    // Render children without wallet context during initial load
    // Components should handle undefined wallet state gracefully
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <MultiWalletProviderLazy>
        {children}
      </MultiWalletProviderLazy>
    </Suspense>
  );
}
