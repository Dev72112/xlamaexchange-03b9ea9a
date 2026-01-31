
# Performance Optimization Plan: Lighthouse & PageSpeed Improvements

## Current State Analysis

Based on codebase exploration, here are the key performance areas identified:

### Strengths Already in Place
- Lazy loading for all page routes via `React.lazy()`
- Code splitting with manual chunks in Vite config
- Web Vitals tracking via `src/lib/performance.ts`
- Token prefetching system for DEX chains
- Route prefetching for critical navigation paths
- Optimized React Query caching (30s stale, 5min GC)
- CSS code splitting enabled
- Font preloading with `display=swap`
- Preconnect/DNS-prefetch for API partners
- Skeleton loaders throughout the app

### Performance Issues Identified

| Issue | Impact | Lighthouse Metric Affected |
|-------|--------|---------------------------|
| Framer Motion imported in 28+ components | Large bundle, render blocking | LCP, FCP, TBT |
| Recharts imported synchronously in charts | Heavy bundle (~200KB) | LCP, TBT |
| AppKit initialization blocks first render | Main thread blocking | FCP, TBT |
| No image dimension hints in HTML | Layout shifts | CLS |
| Unused CSS animations defined globally | CSS bloat | FCP |
| No resource hints for dynamic imports | Slower route transitions | LCP |
| `will-change` overuse in CSS | Memory overhead | INP |
| Service worker not caching app shell | Repeat visit performance | TTFB |

---

## Phase 1: Critical Path Optimization (High Impact)

### 1.1 Defer AppKit Initialization

**Current Problem**: AppKit initializes before first render, blocking the main thread.

**Solution**: Render the app immediately, initialize AppKit in parallel.

**File: `src/main.tsx`**
```tsx
// BEFORE: Blocking initialization
initializeAppKit().then(() => renderApp());

// AFTER: Non-blocking with Promise.race pattern
renderApp(); // Render immediately with skeleton states
initializeAppKit().catch(console.error); // Initialize in background
```

### 1.2 Lazy Load Framer Motion

**Current Problem**: `framer-motion` (~100KB gzipped) is imported in 28 components and loaded on first page.

**Solution**: Create lazy motion wrapper and use CSS animations for simple effects.

**File: `src/lib/motion.tsx` (new)**
```tsx
// Re-export motion components with lazy loading
import { lazy } from 'react';

export const LazyMotion = lazy(() => 
  import('framer-motion').then(m => ({ 
    default: ({ children }) => <m.LazyMotion features={m.domAnimation}>{children}</m.LazyMotion> 
  }))
);

// For components that need motion, wrap in Suspense
export const motion = {
  div: lazy(() => import('framer-motion').then(m => ({ default: m.motion.div }))),
  // ... etc
};
```

**Alternative Quick Win**: Move motion imports to only components that need complex animations, use CSS for simple fade-ins.

### 1.3 Lazy Load Recharts

**Current Problem**: Chart components import Recharts synchronously.

**Solution**: Lazy load chart components that use Recharts.

**File: `src/components/portfolio/PortfolioAllocationChart.tsx`**
```tsx
// Wrap entire component in lazy load
const PortfolioAllocationChart = lazy(() => import('./PortfolioAllocationChartImpl'));
```

---

## Phase 2: Resource Loading Optimization

### 2.1 Add Modulepreload Hints for Critical Chunks

**File: `index.html`**
```html
<!-- Preload critical vendor chunks -->
<link rel="modulepreload" href="/assets/vendor-react-[hash].js" />
<link rel="modulepreload" href="/assets/vendor-ui-[hash].js" />
```

**Note**: This requires a build-time plugin or manual update after each build. Consider adding a Vite plugin.

### 2.2 Optimize Font Loading

**Current**: Font loaded via Google Fonts with preload.

**Improvement**: Consider self-hosting Inter font subset for faster TTFB.

**File: `index.html`**
```html
<!-- Add font-display: swap explicitly if self-hosting -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

### 2.3 Add Critical CSS Inline

The current inline splash CSS is good. Extend with minimal above-the-fold styles.

**File: `index.html`** - Add skeleton styles inline:
```html
<style>
  /* Existing splash styles... */
  
  /* Critical skeleton styles for instant feedback */
  .skeleton-inline {
    background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }
</style>
```

---

## Phase 3: Image & Asset Optimization

### 3.1 Add Explicit Dimensions to Images

**Problem**: Images without dimensions cause layout shifts (CLS).

**Solution**: Update OptimizedImage component and token images.

**File: `src/components/ui/optimized-image.tsx`**
```tsx
// Add width/height props to prevent layout shift
<img
  src={currentSrc}
  alt={alt}
  width={props.width || 'auto'}
  height={props.height || 'auto'}
  loading={priority ? 'eager' : 'lazy'}
  decoding="async"
  // ... rest
/>
```

### 3.2 Use AVIF/WebP with Fallbacks

Update image loading to prefer modern formats:

**File: `src/components/ui/token-image.tsx`**
```tsx
// Add srcset for modern formats
<picture>
  <source srcSet={src.replace('.png', '.avif')} type="image/avif" />
  <source srcSet={src.replace('.png', '.webp')} type="image/webp" />
  <img src={src} alt={symbol} loading="lazy" />
</picture>
```

---

## Phase 4: CSS Performance

### 4.1 Remove Excessive `will-change` Usage

**Problem**: Current CSS has `will-change` in multiple places which increases GPU memory.

**File: `src/index.css`**
```css
/* Remove or limit will-change usage */
/* BEFORE */
.skeleton-shimmer {
  will-change: background-position; /* Remove */
}

.page-transition {
  will-change: opacity, transform; /* Keep only for actual animations */
}
```

### 4.2 Use CSS `content-visibility` for Off-Screen Content

**File: `src/index.css`**
```css
/* Add for list items and cards */
.card-offscreen {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px; /* Estimated height */
}
```

### 4.3 Reduce Animation Complexity

Slow down or simplify animations for better INP:

**File: `tailwind.config.ts`**
```ts
animation: {
  // Reduce shimmer complexity
  "shimmer": "shimmer 2.5s linear infinite", // Was 2s
  // Simplify gradient shift
  "gradient-shift": "gradient-shift 120s ease infinite", // Was 8s
}
```

---

## Phase 5: JavaScript Optimization

### 5.1 Defer Non-Critical Initialization

**File: `src/main.tsx`**
```tsx
const renderApp = () => {
  // ... render logic
  
  // Defer non-critical tasks
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      startTokenPrefetch();
      prefetchCriticalRoutes();
    }, { timeout: 3000 });
  } else {
    setTimeout(() => {
      startTokenPrefetch();
      prefetchCriticalRoutes();
    }, 1000);
  }
};
```

### 5.2 Reduce React Re-renders

Add missing `useMemo` and `useCallback` in heavy components:

**File: `src/components/exchange/ExchangeWidget.tsx`** (~1400 lines)
- Memoize computed values that trigger re-renders
- Split into smaller sub-components with `React.memo`

### 5.3 Use `startTransition` for Non-Urgent Updates

**File: Various components with mode switches**
```tsx
import { startTransition } from 'react';

const handleModeChange = (newMode) => {
  startTransition(() => {
    setExchangeMode(newMode);
  });
};
```

---

## Phase 6: Service Worker & Caching

### 6.1 Implement App Shell Caching

**File: `public/sw.js`** - Enhance existing SW:
```javascript
const CACHE_NAME = 'xlama-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/vendor-react-*.js',
  '/assets/vendor-ui-*.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate for app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        });
        return cached || networkFetch;
      })
    );
  }
});
```

---

## Phase 7: Build Configuration Improvements

### 7.1 Enable Terser for Better Minification

**File: `vite.config.ts`**
```ts
build: {
  // Switch to terser for better compression (slightly slower build)
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Remove console.logs in production
      drop_debugger: true,
    },
  },
}
```

### 7.2 Add Compression Plugin

**File: `vite.config.ts`**
```ts
import compression from 'vite-plugin-compression';

plugins: [
  // ... existing plugins
  compression({ algorithm: 'gzip' }),
  compression({ algorithm: 'brotliCompress', ext: '.br' }),
]
```

---

## Implementation Priority

| Phase | Task | Effort | Impact | Priority |
|-------|------|--------|--------|----------|
| 1.1 | Defer AppKit init | Low | High | P0 |
| 1.2 | Lazy load Framer Motion | Medium | High | P0 |
| 5.1 | Defer token prefetch | Low | Medium | P1 |
| 4.3 | Reduce animation complexity | Low | Medium | P1 |
| 1.3 | Lazy load Recharts | Low | Medium | P1 |
| 3.1 | Add image dimensions | Medium | Medium | P2 |
| 4.1 | Remove excess will-change | Low | Low | P2 |
| 6.1 | App shell caching | Medium | High | P2 |
| 7.1 | Enable Terser | Low | Medium | P3 |
| 7.2 | Add compression | Low | Medium | P3 |

---

## Expected Lighthouse Score Improvements

| Metric | Current (Est.) | Target |
|--------|---------------|--------|
| Performance | 60-70 | 85+ |
| First Contentful Paint | 2.5s | < 1.8s |
| Largest Contentful Paint | 4.0s | < 2.5s |
| Total Blocking Time | 800ms | < 300ms |
| Cumulative Layout Shift | 0.15 | < 0.1 |
| Time to Interactive | 5.0s | < 3.5s |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main.tsx` | Defer AppKit, use requestIdleCallback for prefetch |
| `src/lib/motion.tsx` | New file for lazy motion components |
| `vite.config.ts` | Enable terser, add compression plugin |
| `src/index.css` | Remove will-change, add content-visibility, slow animations |
| `tailwind.config.ts` | Slow animation durations |
| `index.html` | Add modulepreload hints, inline critical skeleton CSS |
| `public/sw.js` | Implement app shell caching |
| `src/components/ui/optimized-image.tsx` | Add width/height props |
| `src/components/portfolio/PortfolioAllocationChart.tsx` | Lazy load Recharts |
| `src/pages/*.tsx` | Replace motion imports with CSS or lazy motion |

---

## Technical Notes

### Why Lazy Load Framer Motion?
- Framer Motion is ~100KB gzipped
- Most animations in the app are simple fades/scales that CSS can handle
- Complex animations (success celebration, drawers) can lazy load the full library

### Why Defer AppKit?
- AppKit fetches WalletConnect config from backend
- This network request blocks initial render
- Users see content before needing wallet functionality

### Why Service Worker Caching?
- Repeat visits currently refetch all assets
- App shell caching gives instant load on return visits
- Critical for mobile users on flaky connections
