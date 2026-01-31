
# Performance Optimization Phase 2: Advanced Bundle & Runtime Optimizations

## Current State Assessment

### Completed Optimizations (v2.5.0)
- Deferred AppKit initialization with fallback rendering
- Service Worker v8 with app shell caching
- Terser minification with console removal
- `content-visibility: auto` for off-screen elements
- Explicit image dimensions on TokenImage/OptimizedImage
- Deferred prefetching via `requestIdleCallback`
- Reduced animation durations (shimmer 2.5s, gradient-shift 60s)
- Inline critical skeleton CSS in index.html
- Manual chunk splitting for all major vendors

### Remaining Opportunities Identified

| Area | Issue | Impact |
|------|-------|--------|
| Framer Motion | Imported in 12+ components, loaded on first paint | High - ~100KB gzipped |
| Recharts | Imported synchronously in 12 chart components | High - ~200KB gzipped |
| Motion on Index page | `motion` wrapper on main layout elements | Medium - blocks FCP |
| Chart components | Not lazy loaded, pulled into main bundle | Medium |
| React re-renders | ExchangeWidget (1400 lines) lacks memoization | Medium - INP |
| AnimatedRoutes | Full framer-motion AnimatePresence on every route | Medium |
| Background animations | gradient-shift still running at 60s | Low |

---

## Phase 2A: Lazy Load Heavy Libraries (High Impact)

### 2A.1 Create Lazy Motion Wrapper

Create a lightweight motion shim that lazy loads framer-motion only when needed.

**New File: `src/lib/lazyMotion.tsx`**
```tsx
import { lazy, Suspense, ComponentProps, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// CSS-based animations for simple cases
export function FadeIn({ children, className, delay = 0 }: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <div 
      className={cn("animate-fade-in", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Lazy load full framer-motion for complex animations
const FramerMotion = lazy(() => import('framer-motion'));

export const LazyMotionDiv = forwardRef<HTMLDivElement, any>((props, ref) => (
  <Suspense fallback={<div ref={ref} {...props} />}>
    <FramerMotion>
      {({ motion }) => <motion.div ref={ref} {...props} />}
    </FramerMotion>
  </Suspense>
));
```

### 2A.2 Migrate Simple Animations to CSS

Many components use framer-motion for simple fade-in effects that CSS can handle.

**Components to migrate (use CSS `animate-fade-in` instead):**
- `src/components/portfolio/AccountSummaryCard.tsx` - simple fade
- `src/components/portfolio/PortfolioSummaryCard.tsx` - simple fade
- `src/components/ui/enhanced-stat-card.tsx` - simple fade
- `src/components/ui/empty-state.tsx` - simple fade
- `src/components/ui/glow-bar.tsx` - simple animation

**Implementation pattern:**
```tsx
// BEFORE
import { motion } from 'framer-motion';
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

// AFTER
<div className="animate-fade-in">
```

### 2A.3 Lazy Load Chart Components

Wrap all Recharts-dependent components with React.lazy at the import site.

**Files to create wrapper components:**

| Component | Wrapper Pattern |
|-----------|-----------------|
| `PortfolioAllocationChart` | Already a component, wrap with lazy |
| `TokenPnLChart` | Create lazy wrapper |
| `PortfolioPnLChart` | Create lazy wrapper |
| `DCAHistoryChart` | Create lazy wrapper |
| `FundingRateChart` | Create lazy wrapper |
| `GasBreakdown` | Create lazy wrapper |

**New File: `src/components/charts/lazy.tsx`**
```tsx
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <Skeleton className="w-full rounded-lg" style={{ height }} />
);

// Lazy chart exports
export const LazyPortfolioAllocationChart = lazy(() => 
  import('@/components/portfolio/PortfolioAllocationChart')
    .then(m => ({ default: m.PortfolioAllocationChart }))
);

export const LazyTokenPnLChart = lazy(() => 
  import('@/components/analytics/TokenPnLChart')
    .then(m => ({ default: m.TokenPnLChart }))
);

// Wrapper with fallback
export function LazyChart({ 
  component: Component, 
  height = 200,
  ...props 
}: { component: React.ComponentType<any>; height?: number; [key: string]: any }) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      <Component {...props} />
    </Suspense>
  );
}
```

---

## Phase 2B: Simplify Route Animations (Medium Impact)

### 2B.1 Replace AnimatedRoutes with CSS Transitions

The current `AnimatedRoutes` uses full framer-motion AnimatePresence which loads ~100KB.

**File: `src/components/AnimatedRoutes.tsx`**

Replace with lightweight CSS-based page transitions:
```tsx
// Use the existing PageTransition component with CSS animations
// instead of framer-motion AnimatePresence

export function AnimatedRoutes({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
}
```

**Add to `src/index.css`:**
```css
.page-enter {
  animation: page-enter 0.2s ease-out;
}

@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Phase 2C: React Performance Optimizations (Medium Impact)

### 2C.1 Memoize Heavy Components

**File: `src/components/exchange/ExchangeWidget.tsx`**

Add memoization to prevent unnecessary re-renders:
```tsx
// Add useMemo for computed values
const computedQuoteInfo = useMemo(() => ({
  rate: quote?.toAmount / quote?.fromAmount,
  priceImpact: quote?.priceImpact,
  // ... other derived values
}), [quote?.toAmount, quote?.fromAmount, quote?.priceImpact]);

// Add useCallback for handlers
const handleSwapTokens = useCallback(() => {
  // swap logic
}, [fromToken, toToken]);

// Wrap sub-components with React.memo
const TokenInputSection = memo(function TokenInputSection({ ... }) { ... });
```

### 2C.2 Add startTransition for Mode Switches

When switching between Instant/DEX modes, use startTransition:
```tsx
import { startTransition } from 'react';

const handleModeChange = (newMode: ExchangeMode) => {
  startTransition(() => {
    setExchangeMode(newMode);
  });
};
```

---

## Phase 2D: Build & Loading Optimizations (Medium Impact)

### 2D.1 Add Dynamic Import for framer-motion in Vite Config

**File: `vite.config.ts`**

Move framer-motion out of optimizeDeps.include and into a separate lazy chunk:
```ts
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    '@tanstack/react-query',
    // REMOVE 'framer-motion' from here
    'lucide-react',
    // ...
  ],
},
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Keep motion as separate chunk for lazy loading
        'vendor-motion': ['framer-motion'],
        // Add recharts to separate chunk
        'vendor-charts': ['recharts', 'lightweight-charts'],
      }
    }
  }
}
```

### 2D.2 Add Resource Hints for Common Navigation

**File: `index.html`**

Add prefetch hints for likely navigation targets:
```html
<!-- Prefetch likely navigation chunks -->
<link rel="prefetch" href="/assets/vendor-charts-[hash].js" as="script" />
```

**Better approach - Build-time plugin:**

Create a Vite plugin to auto-inject modulepreload hints after build.

---

## Phase 2E: Runtime Performance (Low-Medium Impact)

### 2E.1 Reduce Background Animation Load

**File: `src/index.css`**

Use `@media (prefers-reduced-motion)` more aggressively:
```css
@media (prefers-reduced-motion: reduce), (max-width: 768px) {
  .animate-gradient-shift {
    animation: none;
    background-position: 0% 50%;
  }
}
```

### 2E.2 Add Intersection Observer for Off-Screen Charts

Charts that are below the fold should not render until visible:
```tsx
function LazyVisibleChart({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsVisible(true),
      { rootMargin: '100px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? children : <ChartSkeleton />}
    </div>
  );
}
```

---

## Implementation Priority

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| 2A.2 Migrate simple motion to CSS | Low | High | P0 |
| 2B.1 Replace AnimatedRoutes with CSS | Low | High | P0 |
| 2A.3 Lazy load chart components | Medium | High | P0 |
| 2D.1 Separate framer-motion chunk | Low | Medium | P1 |
| 2C.1 Memoize ExchangeWidget | Medium | Medium | P1 |
| 2A.1 Create lazy motion wrapper | Medium | Medium | P1 |
| 2C.2 Add startTransition | Low | Low | P2 |
| 2E.1 Reduce mobile animations | Low | Low | P2 |
| 2E.2 Intersection observer charts | Medium | Medium | P2 |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AnimatedRoutes.tsx` | Replace framer-motion with CSS transitions |
| `src/components/portfolio/AccountSummaryCard.tsx` | Remove motion, use CSS animate-fade-in |
| `src/components/portfolio/PortfolioSummaryCard.tsx` | Remove motion, use CSS animate-fade-in |
| `src/components/ui/enhanced-stat-card.tsx` | Remove motion, use CSS animate-fade-in |
| `src/components/ui/empty-state.tsx` | Remove motion, use CSS animate-fade-in |
| `src/components/ui/glow-bar.tsx` | Remove motion, use CSS animations |
| `src/pages/Index.tsx` | Remove motion wrapper, use CSS |
| `src/pages/Analytics.tsx` | Lazy load chart components |
| `src/pages/Portfolio.tsx` | Lazy load PortfolioAllocationChart |
| `src/lib/lazyMotion.tsx` | New - lazy motion wrapper utilities |
| `src/components/charts/lazy.tsx` | New - lazy chart component wrappers |
| `vite.config.ts` | Remove framer-motion from optimizeDeps.include |
| `src/index.css` | Add page-enter animation, reduce mobile animations |

---

## Expected Outcomes

| Metric | Current (Est.) | After Phase 2 |
|--------|---------------|---------------|
| Initial JS Bundle | ~450KB | ~300KB (-33%) |
| Time to Interactive | 3.5s | < 2.5s |
| First Contentful Paint | 1.8s | < 1.4s |
| Largest Contentful Paint | 2.5s | < 2.0s |
| Lighthouse Performance | 75-80 | 90+ |

---

## Changelog Entry for v2.6.0

```tsx
{
  version: "2.6.0",
  date: "2026-02-XX",
  title: "Bundle Optimization & Runtime Performance",
  description: "Major bundle size reduction through lazy loading and CSS animation migration.",
  type: "major",
  changes: [
    { category: "improvement", text: "Lazy load framer-motion - removed from initial bundle" },
    { category: "improvement", text: "Lazy load Recharts - charts load on demand" },
    { category: "improvement", text: "CSS-based page transitions replacing AnimatePresence" },
    { category: "improvement", text: "Simple fade animations migrated to CSS (6 components)" },
    { category: "improvement", text: "Memoized ExchangeWidget computed values" },
    { category: "improvement", text: "startTransition for mode switches" },
    { category: "improvement", text: "Reduced mobile background animations" },
    { category: "improvement", text: "Intersection observer for below-fold charts" },
  ],
}
```

