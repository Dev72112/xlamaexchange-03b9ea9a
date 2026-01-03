import { lazy, ComponentType } from 'react';

// Map of routes to their lazy-loaded components
const routeComponents: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {
  '/': () => import('@/pages/Index'),
  '/favorites': () => import('@/pages/Favorites'),
  '/history': () => import('@/pages/History'),
  '/about': () => import('@/pages/About'),
  '/faq': () => import('@/pages/FAQ'),
  '/terms': () => import('@/pages/Terms'),
  '/privacy': () => import('@/pages/Privacy'),
  '/cookies': () => import('@/pages/CookiesPolicy'),
};

// Track which routes have been prefetched to avoid duplicate requests
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's component by importing it ahead of time.
 * This warms the browser cache so the actual navigation is instant.
 */
export function prefetchRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split('?')[0].split('#')[0];
  
  // Skip if already prefetched or not a known route
  if (prefetchedRoutes.has(normalizedPath)) return;
  
  const loader = routeComponents[normalizedPath];
  if (!loader) return;
  
  // Mark as prefetched immediately to prevent race conditions
  prefetchedRoutes.add(normalizedPath);
  
  // Prefetch with low priority
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loader().catch(() => {
        // Remove from prefetched set so it can be retried
        prefetchedRoutes.delete(normalizedPath);
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      loader().catch(() => {
        prefetchedRoutes.delete(normalizedPath);
      });
    }, 100);
  }
}

/**
 * Prefetch multiple routes at once
 */
export function prefetchRoutes(paths: string[]): void {
  paths.forEach(prefetchRoute);
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(path: string): boolean {
  const normalizedPath = path.split('?')[0].split('#')[0];
  return prefetchedRoutes.has(normalizedPath);
}

/**
 * Clear the prefetch cache (useful for testing)
 */
export function clearPrefetchCache(): void {
  prefetchedRoutes.clear();
}
