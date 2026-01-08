/**
 * Deferred Components
 * Non-critical components that load after initial render
 */
import { lazy, Suspense, useEffect, useState, ComponentType, memo } from 'react';
import { markInitialRenderComplete, shouldDeferOnNetwork } from '@/lib/deferredLoader';

// Lazy load non-critical floating components
const FloatingFeedback = lazy(() => import('@/components/FloatingFeedback').then(m => ({ default: m.FloatingFeedback })));
const KeyboardShortcuts = lazy(() => import('@/components/KeyboardShortcuts').then(m => ({ default: m.KeyboardShortcuts })));
const CookieConsent = lazy(() => import('@/components/CookieConsent').then(m => ({ default: m.CookieConsent })));
const BridgeNotificationWatcher = lazy(() => import('@/components/BridgeNotificationWatcher').then(m => ({ default: m.BridgeNotificationWatcher })));

interface DeferredWrapperProps {
  delay?: number;
  children: React.ReactNode;
}

/**
 * Wrapper that delays rendering until after initial load
 */
const DeferredWrapper = memo(function DeferredWrapper({ delay = 0, children }: DeferredWrapperProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Extra delay on slow networks
    const networkDelay = shouldDeferOnNetwork() ? 1000 : 0;
    const totalDelay = delay + networkDelay;

    if ('requestIdleCallback' in window) {
      const timeout = setTimeout(() => {
        requestIdleCallback(() => setReady(true), { timeout: 3000 });
      }, totalDelay);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setReady(true), totalDelay + 100);
      return () => clearTimeout(timeout);
    }
  }, [delay]);

  if (!ready) return null;
  return <>{children}</>;
});

/**
 * All deferred components bundled together
 * These load after the critical path is complete
 */
export const DeferredComponents = memo(function DeferredComponents() {
  useEffect(() => {
    // Signal that initial render is complete
    markInitialRenderComplete();
  }, []);

  return (
    <>
      {/* High priority deferred - keyboard shortcuts (desktop UX) */}
      <DeferredWrapper delay={100}>
        <Suspense fallback={null}>
          <KeyboardShortcuts />
        </Suspense>
      </DeferredWrapper>

      {/* Medium priority - bridge notifications (user feedback) */}
      <DeferredWrapper delay={200}>
        <Suspense fallback={null}>
          <BridgeNotificationWatcher />
        </Suspense>
      </DeferredWrapper>

      {/* Lower priority - floating feedback button */}
      <DeferredWrapper delay={500}>
        <Suspense fallback={null}>
          <FloatingFeedback />
        </Suspense>
      </DeferredWrapper>

      {/* Lowest priority - cookie consent (appears with delay anyway) */}
      <DeferredWrapper delay={800}>
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </DeferredWrapper>
    </>
  );
});

/**
 * HOC to make any component deferred
 */
export function withDeferred<P extends object>(
  Component: ComponentType<P>,
  delay: number = 0
): ComponentType<P> {
  return function DeferredComponent(props: P) {
    return (
      <DeferredWrapper delay={delay}>
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      </DeferredWrapper>
    );
  };
}
