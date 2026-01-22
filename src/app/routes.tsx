/**
 * Centralized Route Configuration
 * All app routes defined in one place for easier management
 */
import { lazy, ComponentType, LazyExoticComponent } from 'react';

export interface RouteConfig {
  path: string;
  element: LazyExoticComponent<ComponentType<unknown>>;
  preload?: boolean;
  label?: string;
  showInNav?: boolean;
}

// Lazy load all pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Index = lazy(() => import('@/pages/Index'));
const Bridge = lazy(() => import('@/pages/Bridge'));
const Orders = lazy(() => import('@/pages/Orders'));
const Tools = lazy(() => import('@/pages/Tools'));
const Portfolio = lazy(() => import('@/pages/Portfolio'));
const TokenCompare = lazy(() => import('@/pages/TokenCompare'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const History = lazy(() => import('@/pages/History'));
const About = lazy(() => import('@/pages/About'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const CookiesPolicy = lazy(() => import('@/pages/CookiesPolicy'));
const Docs = lazy(() => import('@/pages/Docs'));
const Changelog = lazy(() => import('@/pages/Changelog'));
const Feedback = lazy(() => import('@/pages/Feedback'));
const Debug = lazy(() => import('@/pages/Debug'));
const Perpetuals = lazy(() => import('@/pages/Perpetuals'));
const NotFound = lazy(() => import('@/pages/NotFound'));

/**
 * Primary navigation routes (shown in header)
 */
export const primaryRoutes: RouteConfig[] = [
  { path: '/home', element: Home, preload: true, label: 'Home', showInNav: false },
  { path: '/', element: Index, preload: true, label: 'Swap', showInNav: true },
  { path: '/bridge', element: Bridge, preload: true, label: 'Bridge', showInNav: true },
  { path: '/perpetuals', element: Perpetuals, label: 'Perpetuals', showInNav: true },
  { path: '/orders', element: Orders, label: 'Orders', showInNav: true },
  { path: '/portfolio', element: Portfolio, label: 'Portfolio', showInNav: true },
  { path: '/analytics', element: Analytics, label: 'Analytics', showInNav: true },
  { path: '/tools', element: Tools, label: 'Tools', showInNav: true },
];

/**
 * Secondary routes (footer, less prominent)
 */
export const secondaryRoutes: RouteConfig[] = [
  { path: '/history', element: History, label: 'History' },
  { path: '/favorites', element: Favorites, label: 'Favorites' },
  { path: '/compare', element: TokenCompare, label: 'Compare' },
  { path: '/docs', element: Docs, label: 'Docs' },
  { path: '/changelog', element: Changelog, label: 'Changelog' },
  { path: '/feedback', element: Feedback, label: 'Feedback' },
];

/**
 * Legal/info routes
 */
export const legalRoutes: RouteConfig[] = [
  { path: '/about', element: About, label: 'About' },
  { path: '/faq', element: FAQ, label: 'FAQ' },
  { path: '/terms', element: Terms, label: 'Terms' },
  { path: '/privacy', element: Privacy, label: 'Privacy' },
  { path: '/cookies', element: CookiesPolicy, label: 'Cookies' },
];

/**
 * All routes combined
 */
export const allRoutes: RouteConfig[] = [
  ...primaryRoutes,
  ...secondaryRoutes,
  ...legalRoutes,
  { path: '/debug', element: Debug, label: 'Debug' },
  { path: '*', element: NotFound },
];

/**
 * Get routes that should be preloaded
 */
export function getPreloadRoutes(): RouteConfig[] {
  return allRoutes.filter(route => route.preload);
}

/**
 * Get navigation routes for header
 */
export function getNavRoutes(): RouteConfig[] {
  return primaryRoutes.filter(route => route.showInNav);
}
