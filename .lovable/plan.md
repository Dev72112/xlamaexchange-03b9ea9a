

# Performance Optimization Phase 3: Lighthouse Score Improvement Plan

## Current State Analysis (from PageSpeed Insights)

### Current Scores (Mobile)
| Metric | Score | Value |
|--------|-------|-------|
| Performance | 56 | Poor |
| FCP | 9.0s | Very slow |
| LCP | 14.6s | Very slow |
| TBT | 40ms | Good |
| CLS | 0 | Excellent |
| SI | 9.0s | Very slow |

### Key Issues Identified

| Issue | Impact | Estimated Savings |
|-------|--------|-------------------|
| No cache headers on assets | High | 2,112 KiB repeat visits |
| Unused JavaScript | High | 919 KiB |
| xlama-mascot.png (122KB PNG, 500x500 for 84x84 display) | High | 120 KiB |
| Missing preconnects (li.fi, supabase, ton.org) | Medium | 320ms each |
| CSS render-blocking | Medium | 170ms |
| Non-composited animations | Medium | CLS impact |
| vendor-charts loaded on homepage | Medium | 153 KiB |
| vendor-ton loaded eagerly | Medium | 108 KiB |
| TON Connect fetches 30+ wallet icons on load | High | 487 KiB |

### Critical Path Analysis
The **LCP element** is the hero description text with a 3,420ms element render delay. The critical path is blocked by:
1. Initial navigation (378ms)
2. CSS load (721ms) 
3. Main index.js (819ms)
4. Vendor wallet (884ms)
5. okx-dex API calls (5.4s each)

---

## Phase 3A: Critical Resource Optimization (High Impact)

### 3A.1 Optimize Hero Image (xlama-mascot.png)

**Current Problem**: 122KB PNG at 500x500 served for 84x84 display.

**Solution**: 
- Convert to WebP/AVIF with responsive srcset
- Create optimized sizes: 64px, 128px, 256px
- Reduce file size from 122KB to ~5-10KB

**Files to modify**:
- Create optimized image assets in `public/` 
- Update `src/components/HeroSection.tsx` to use `<picture>` with responsive sources
- Add `loading="eager"` and proper dimensions

### 3A.2 Lazy Load TON Connect Provider

**Current Problem**: TON Connect loads immediately and fetches 30+ wallet icons (487 KiB from ton.org).

**Solution**: 
- Defer TON provider initialization until needed
- Load TON only when user clicks "Connect Wallet" and selects TON
- Move `@tonconnect/ui-react` to dynamic import

**Files to modify**:
- `src/app/providers/WalletProviders.tsx` - Conditionally load TON provider
- `src/contexts/MultiWalletContext.tsx` - Lazy initialize TON adapter
- `vite.config.ts` - Ensure vendor-ton is fully tree-shaken from initial load

### 3A.3 Add Missing Preconnects

**Current Problem**: PageSpeed shows "no origins were preconnected" despite having some.

**Solution**: Add preconnects for high-priority third-party origins identified by PageSpeed.

**File to modify**: `index.html`
```html
<!-- Add missing critical preconnects -->
<link rel="preconnect" href="https://mnziekrimlmvnrcwgmbk.supabase.co" crossorigin />
<link rel="preconnect" href="https://config.ton.org" crossorigin />
<link rel="preconnect" href="https://li.fi" crossorigin />
<link rel="preconnect" href="https://api.web3modal.org" crossorigin />
```

---

## Phase 3B: Bundle Optimization (High Impact)

### 3B.1 Tree-Shake Unused Code from Main Bundle

**Current Problem**: 261KB unused in index.js, 247KB unused in vendor-wallet.

**Solution**:
- Audit main bundle imports for dead code
- Move non-critical components to lazy chunks
- Split ExchangeWidget into smaller sub-components

**Files to modify**:
- `src/components/exchange/ExchangeWidget.tsx` - Split into separate files:
  - `ExchangeWidgetCore.tsx` (essential)
  - `ExchangeWidgetDex.tsx` (lazy for DEX mode)
  - `ExchangeWidgetInstant.tsx` (lazy for Instant mode)

### 3B.2 Defer vendor-charts Chunk

**Current Problem**: 153KB vendor-charts loads on homepage even though no charts are visible.

**Solution**:
- Ensure charts are only loaded when collapsible sections open
- Add intersection observer to delay chart bundle until visible

**Files to modify**:
- `src/components/charts/lazy.tsx` - Add `LazyVisibleChart` wrapper
- Verify `TrendingPairs` doesn't pull in chart dependencies

### 3B.3 Code-Split Wallet Adapters by Chain

**Current Problem**: All wallet adapters (EVM, Solana, Sui, TON, Tron) load at once.

**Solution**:
- Create adapter factory with lazy loading per chain type
- Only load Sui/Tron adapters when those chains are selected

**Files to modify**:
- `src/features/wallet/adapters/factory.ts` - Dynamic imports per chain
- `src/contexts/MultiWalletContext.tsx` - Lazy adapter initialization

---

## Phase 3C: Server & Caching (High Impact)

### 3C.1 Configure Cache Headers

**Current Problem**: All assets have "Cache TTL: None" - repeat visits refetch everything.

**Solution**: 
- Add `Cache-Control` headers via Service Worker for assets
- Implement stale-while-revalidate for static assets

**File to modify**: `public/sw.js`
```javascript
// Cache static assets with long TTL
const STATIC_CACHE = 'xlama-static-v9';
const STATIC_ASSETS = [
  '/assets/',
  '/manifest.json',
  '/xlama-mascot.png'
];

// Stale-while-revalidate for JS/CSS bundles
addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const fetching = fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetching;
        })
      )
    );
  }
});
```

### 3C.2 Defer Non-Critical API Calls

**Current Problem**: 9 okx-dex API calls (~3-5s each) block initial render.

**Solution**:
- Defer token list and quote fetching until after first paint
- Use `requestIdleCallback` for initial token prefetch
- Show skeleton UI immediately

**Files to modify**:
- `src/hooks/useDexTokens.ts` - Add `enabled: false` initially, trigger after mount
- `src/lib/tokenPrefetch.ts` - Increase defer timeout

---

## Phase 3D: CSS & Animation Optimization (Medium Impact)

### 3D.1 Remove Non-Composited Animations

**Current Problem**: 99 non-composited animations affecting CLS/performance.

**Solution**:
- Replace `color`, `border-color` transitions with `opacity` where possible
- Use `transform` and `opacity` only for animations
- Add `will-change` only during active animations

**Files to modify**:
- `src/index.css` - Update transition properties
- `tailwind.config.ts` - Simplify color transitions

### 3D.2 Critical CSS Inlining

**Current Problem**: 25KB CSS blocks render for 660ms.

**Solution**:
- Extract above-the-fold critical CSS
- Inline in `<head>` for instant first paint
- Load full CSS async

**File to modify**: `index.html` - Expand inline styles with:
- Header/nav styles
- Exchange widget container styles
- Button/input base styles

---

## Phase 3E: LCP Optimization (High Impact)

### 3E.1 Prioritize LCP Element

**Current Problem**: LCP (hero description text) has 3,420ms render delay.

**Solution**:
- Ensure hero text renders before any JS executes
- Add skeleton placeholder in HTML
- Use `content-visibility: auto` for below-fold

**Files to modify**:
- `src/pages/Index.tsx` - Simplify hero section, remove animation delays
- `src/components/HeroSection.tsx` - Remove `animationDelay` on critical text

### 3E.2 Preload Critical Resources

**Solution**: Add resource hints for critical JS chunks.

**File to modify**: `index.html`
```html
<!-- Preload critical chunks -->
<link rel="modulepreload" href="/src/main.tsx" />
```

---

## Implementation Priority

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| 3A.1 Optimize hero image | Low | High | P0 |
| 3A.2 Lazy load TON provider | Medium | High | P0 |
| 3A.3 Add missing preconnects | Low | Medium | P0 |
| 3C.1 Configure cache headers | Low | High | P0 |
| 3C.2 Defer API calls | Medium | High | P1 |
| 3B.1 Tree-shake main bundle | High | High | P1 |
| 3E.1 Prioritize LCP element | Low | High | P1 |
| 3D.1 Remove non-composited animations | Medium | Medium | P2 |
| 3B.2 Defer vendor-charts | Low | Medium | P2 |
| 3B.3 Code-split wallet adapters | High | Medium | P2 |
| 3D.2 Critical CSS inlining | Medium | Medium | P3 |

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add preconnects for supabase, ton.org, li.fi, web3modal; expand inline critical CSS |
| `public/sw.js` | Upgrade to v9 with stale-while-revalidate for /assets/ |
| `public/xlama-mascot-*.webp` | New optimized image assets (64px, 128px) |
| `src/components/HeroSection.tsx` | Use `<picture>` with WebP, remove animation delay on LCP |
| `src/pages/Index.tsx` | Remove motion wrappers from hero text |
| `src/contexts/MultiWalletContext.tsx` | Lazy load TON/Sui/Tron adapters |
| `src/app/providers/WalletProviders.tsx` | Conditional TON provider |
| `src/hooks/useDexTokens.ts` | Defer initial fetch until after paint |
| `src/index.css` | Fix non-composited animation properties |
| `src/components/charts/lazy.tsx` | Add `LazyVisibleChart` with IntersectionObserver |
| `vite.config.ts` | Ensure TON/Sui fully tree-shaken from main bundle |

---

## Expected Outcomes

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Performance Score | 56 | 75+ | +19 points |
| First Contentful Paint | 9.0s | < 4s | -55% |
| Largest Contentful Paint | 14.6s | < 6s | -60% |
| Speed Index | 9.0s | < 5s | -45% |
| Initial Bundle | ~1.8MB | ~1.2MB | -33% |
| Repeat Visit Load | Full refetch | Cached | Instant |

---

## Changelog Entry for v2.7.0

```tsx
{
  version: "2.7.0",
  date: "2026-02-XX",
  title: "Lighthouse Performance Optimization",
  description: "Major Lighthouse score improvements targeting FCP, LCP, and caching.",
  type: "major",
  changes: [
    { category: "improvement", text: "Optimized hero mascot image (122KB → 10KB WebP)" },
    { category: "improvement", text: "Lazy load TON Connect provider (saves 487KB on initial load)" },
    { category: "improvement", text: "Added preconnects for critical third-party origins" },
    { category: "improvement", text: "Service Worker v9 with asset caching" },
    { category: "improvement", text: "Deferred API calls until after first paint" },
    { category: "improvement", text: "Fixed 99 non-composited animations" },
    { category: "improvement", text: "Removed animation delays from LCP element" },
    { category: "improvement", text: "IntersectionObserver for below-fold charts" },
  ],
}
```

---

## Technical Notes

### Why Lazy Load TON Connect?
- TON wallet list fetches 30+ wallet icons from config.ton.org
- Total 487KB of third-party requests just for wallet icons
- Most users don't use TON - defer until explicitly needed

### Why Preconnects Matter?
- Each preconnect saves 310-320ms of connection setup
- PageSpeed specifically flagged these origins as needing hints
- Critical for mobile where connection latency is higher

### Why Cache Headers?
- Current setup has "Cache TTL: None" on all assets
- Every page load re-downloads 1.8MB of JavaScript
- Service Worker caching gives instant repeat visits

