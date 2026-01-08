import { ComponentType } from 'react';
import { shouldDeferOnNetwork } from './deferredLoader';

/**
 * Route priority levels for prefetching
 * Critical: Always prefetch immediately
 * High: Prefetch on idle
 * Low: Only prefetch on hover/focus
 */
type RoutePriority = 'critical' | 'high' | 'low';

interface RouteConfig {
  loader: () => Promise<{ default: ComponentType<unknown> }>;
  priority: RoutePriority;
}

// Map of routes to their lazy-loaded components with priorities
const routeComponents: Record<string, RouteConfig> = {
  // Critical routes - prefetch on app load
  '/': { loader: () => import('@/pages/Index'), priority: 'critical' },
  '/bridge': { loader: () => import('@/pages/Bridge'), priority: 'critical' },
  
  // High priority - prefetch on idle
  '/portfolio': { loader: () => import('@/pages/Portfolio'), priority: 'high' },
  '/orders': { loader: () => import('@/pages/Orders'), priority: 'high' },
  '/analytics': { loader: () => import('@/pages/Analytics'), priority: 'high' },
  '/tools': { loader: () => import('@/pages/Tools'), priority: 'high' },
  
  // Low priority - only on hover/focus
  '/favorites': { loader: () => import('@/pages/Favorites'), priority: 'low' },
  '/history': { loader: () => import('@/pages/History'), priority: 'low' },
  '/about': { loader: () => import('@/pages/About'), priority: 'low' },
  '/faq': { loader: () => import('@/pages/FAQ'), priority: 'low' },
  '/terms': { loader: () => import('@/pages/Terms'), priority: 'low' },
  '/privacy': { loader: () => import('@/pages/Privacy'), priority: 'low' },
  '/cookies': { loader: () => import('@/pages/CookiesPolicy'), priority: 'low' },
  '/compare': { loader: () => import('@/pages/TokenCompare'), priority: 'low' },
  '/docs': { loader: () => import('@/pages/Docs'), priority: 'low' },
  '/changelog': { loader: () => import('@/pages/Changelog'), priority: 'low' },
  '/feedback': { loader: () => import('@/pages/Feedback'), priority: 'low' },
};

// Track which routes have been prefetched to avoid duplicate requests
const prefetchedRoutes = new Set<string>();

// Track in-progress loads to avoid duplicate concurrent loads
const loadingRoutes = new Set<string>();

/**
 * Normalize a path for lookup
 */
function normalizePath(path: string): string {
  return path.split('?')[0].split('#')[0] || '/';
}

/**
 * Schedule a callback based on priority
 */
function scheduleByPriority(
  callback: () => void,
  priority: RoutePriority
): void {
  switch (priority) {
    case 'critical':
      // Run immediately via microtask
      queueMicrotask(callback);
      break;
    case 'high':
      // Use requestIdleCallback with short timeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 1000 });
      } else {
        setTimeout(callback, 50);
      }
      break;
    case 'low':
      // Use requestIdleCallback with longer timeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 5000 });
      } else {
        setTimeout(callback, 200);
      }
      break;
  }
}

/**
 * Prefetch a route's component by importing it ahead of time.
 * This warms the browser cache so the actual navigation is instant.
 */
export function prefetchRoute(path: string, force = false): void {
  const normalizedPath = normalizePath(path);
  
  // Skip if already prefetched or loading
  if (prefetchedRoutes.has(normalizedPath)) return;
  if (loadingRoutes.has(normalizedPath)) return;
  
  const config = routeComponents[normalizedPath];
  if (!config) return;
  
  // On slow networks, only prefetch critical routes unless forced
  if (!force && shouldDeferOnNetwork() && config.priority !== 'critical') {
    return;
  }
  
  // Mark as loading
  loadingRoutes.add(normalizedPath);
  
  scheduleByPriority(() => {
    config.loader()
      .then(() => {
        prefetchedRoutes.add(normalizedPath);
        loadingRoutes.delete(normalizedPath);
      })
      .catch(() => {
        loadingRoutes.delete(normalizedPath);
      });
  }, config.priority);
}

/**
 * Prefetch critical routes immediately
 */
export function prefetchCriticalRoutes(): void {
  Object.entries(routeComponents)
    .filter(([, config]) => config.priority === 'critical')
    .forEach(([path]) => prefetchRoute(path));
}

/**
 * Prefetch high-priority routes on idle
 */
export function prefetchHighPriorityRoutes(): void {
  Object.entries(routeComponents)
    .filter(([, config]) => config.priority === 'high')
    .forEach(([path]) => prefetchRoute(path));
}

/**
 * Prefetch multiple routes at once
 */
export function prefetchRoutes(paths: string[]): void {
  paths.forEach(path => prefetchRoute(path));
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(path: string): boolean {
  return prefetchedRoutes.has(normalizePath(path));
}

/**
 * Check if a route is currently loading
 */
export function isRouteLoading(path: string): boolean {
  return loadingRoutes.has(normalizePath(path));
}

/**
 * Get route priority
 */
export function getRoutePriority(path: string): RoutePriority | null {
  const config = routeComponents[normalizePath(path)];
  return config?.priority ?? null;
}

/**
 * Clear the prefetch cache (useful for testing)
 */
export function clearPrefetchCache(): void {
  prefetchedRoutes.clear();
  loadingRoutes.clear();
}
