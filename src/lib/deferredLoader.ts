/**
 * Deferred Component Loader
 * Utilities for loading non-critical components after initial render
 */

type LoaderCallback = () => void;

const loadQueue: LoaderCallback[] = [];
let isProcessing = false;
let initialRenderComplete = false;

/**
 * Mark initial render as complete and start processing deferred loads
 */
export function markInitialRenderComplete(): void {
  initialRenderComplete = true;
  processQueue();
}

/**
 * Queue a callback to run after initial render
 */
export function deferUntilIdle(callback: LoaderCallback, priority: 'high' | 'low' = 'low'): void {
  if (initialRenderComplete) {
    scheduleCallback(callback, priority);
  } else {
    if (priority === 'high') {
      loadQueue.unshift(callback);
    } else {
      loadQueue.push(callback);
    }
  }
}

function scheduleCallback(callback: LoaderCallback, priority: 'high' | 'low'): void {
  if (priority === 'high') {
    // High priority: use microtask
    queueMicrotask(callback);
  } else if ('requestIdleCallback' in window) {
    requestIdleCallback(() => callback(), { timeout: 2000 });
  } else {
    setTimeout(callback, 50);
  }
}

function processQueue(): void {
  if (isProcessing || loadQueue.length === 0) return;
  
  isProcessing = true;
  
  const processNext = () => {
    const callback = loadQueue.shift();
    if (callback) {
      scheduleCallback(callback, 'low');
      // Small delay between items to avoid blocking
      setTimeout(processNext, 16);
    } else {
      isProcessing = false;
    }
  };
  
  // Start processing after a frame
  requestAnimationFrame(processNext);
}

/**
 * Preload a module without blocking
 */
export function preloadModule(importFn: () => Promise<unknown>): void {
  deferUntilIdle(() => {
    importFn().catch(() => {
      // Silent fail - this is just a preload
    });
  }, 'low');
}

/**
 * Create a deferred import that loads after initial render
 */
export function createDeferredImport<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): () => Promise<{ default: T }> {
  let cached: { default: T } | null = null;
  let loading: Promise<{ default: T }> | null = null;

  return () => {
    if (cached) return Promise.resolve(cached);
    if (loading) return loading;

    loading = importFn().then(mod => {
      cached = mod;
      return mod;
    });

    return loading;
  };
}

/**
 * Visibility-based lazy loading
 * Only load component when it's likely to be needed
 */
export function createVisibilityLoader<T>(
  importFn: () => Promise<{ default: T }>,
  options: { rootMargin?: string; threshold?: number } = {}
): (element: Element | null) => void {
  let loaded = false;
  
  return (element: Element | null) => {
    if (loaded || !element || typeof IntersectionObserver === 'undefined') {
      if (!loaded && element) {
        // Fallback: just load it
        importFn().then(() => { loaded = true; }).catch(() => {});
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          loaded = true;
          observer.disconnect();
          importFn().catch(() => {});
        }
      },
      {
        rootMargin: options.rootMargin || '200px',
        threshold: options.threshold || 0,
      }
    );

    observer.observe(element);
  };
}

/**
 * Network-aware loading
 * Defer loading on slow connections
 */
export function shouldDeferOnNetwork(): boolean {
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (conn?.saveData) return true;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return true;
  }
  return false;
}

/**
 * Chunk priorities for bundle loading
 */
export const CHUNK_PRIORITIES = {
  critical: ['vendor-react', 'vendor-router', 'vendor-ui-core'],
  high: ['vendor-query', 'vendor-ui-extended'],
  medium: ['vendor-charts', 'vendor-forms'],
  low: ['vendor-wallet-evm', 'vendor-wallet-solana', 'vendor-wallet-sui', 'vendor-wallet-ton', 'vendor-wallet-okx', 'vendor-lifi'],
} as const;
