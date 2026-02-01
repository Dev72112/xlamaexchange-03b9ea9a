

# Performance Optimization Phase 4: Critical FCP/LCP Improvements

## Current State Analysis (Feb 1, 2026 PageSpeed Report)

### Current Scores (Mobile)
| Metric | Score | Value |
|--------|-------|-------|
| Performance | 56 | Poor |
| FCP | 9.1s | Very slow |
| LCP | 14.2s | Very slow |
| TBT | 30ms | Excellent |
| CLS | 0 | Excellent |
| SI | 9.1s | Very slow |

### Root Cause Analysis

**Critical Finding #1: TON Connect Provider Not Lazy**
Despite creating `TonProviderLazy.tsx`, the `MultiWalletContext.tsx` still eagerly wraps children with `TonConnectUIProvider` (lines 761-779). This causes:
- vendor-ton-DiI-g-sl.js (108 KiB) loaded immediately
- wallets-v2.json fetched from config.ton.org (1,825ms latency)
- 30+ wallet icon images (487 KiB) loaded from config.ton.org

**Critical Finding #2: Preconnects Not Effective**
PageSpeed reports "no origins were preconnected" despite having preconnects in index.html. The issue is that some preconnects are missing or malformed. Required origins:
- https://li.quest (320ms savings)
- https://api.web3modal.org (320ms savings)  
- https://mnziekrimlmvnrcwgmbk.supabase.co (320ms savings)
- https://config.ton.org (310ms savings) - but should be REMOVED after lazy loading TON

**Critical Finding #3: Hero Image Not Optimized**
The mascot image is 500x500 PNG (122KB) displayed at 64x64px:
- Current: `/assets/xlama-mascot-BW6DPCYS.png` (122 KiB)
- Recommendation: Convert to WebP, create responsive srcset (est. savings 120KB)

**Critical Finding #4: Critical Path Blocking**
The network waterfall shows:
1. Initial nav: 315ms
2. CSS blocks: 470ms  
3. index.js: 898ms (445KB)
4. vendor-wallet: 620ms (357KB)
5. okx-dex API calls: 3,753ms blocking LCP

**Critical Finding #5: Excessive Chunk Fragmentation**
PageSpeed shows 60+ tiny JS chunks (1KB each) loaded in parallel, causing connection contention on mobile.

---

## Phase 4A: Integrate Lazy TON Provider (P0 - Highest Impact)

### 4A.1 Replace Eager TonConnectUIProvider in MultiWalletContext

The `TonProviderLazy.tsx` was created but never integrated. The `MultiWalletProvider` still wraps children directly with the eager `TonConnectUIProvider`.

**File: `src/contexts/MultiWalletContext.tsx`**

Replace lines 757-783 with lazy provider:

```tsx
import { TonProviderLazy, useTonLazy } from '@/contexts/TonProviderLazy';

export function MultiWalletProvider({ children }: MultiWalletProviderProps) {
  return (
    <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
      <SuiWalletProvider autoConnect>
        <TonProviderLazy>
          <MultiWalletProviderInner>{children}</MultiWalletProviderInner>
        </TonProviderLazy>
      </SuiWalletProvider>
    </SuiClientProvider>
  );
}
```

### 4A.2 Update MultiWalletProviderInner for Conditional TON Hooks

The inner component uses `useTonConnectUI`, `useTonWallet`, `useTonAddress` directly. These will error when TON provider isn't loaded yet.

**Changes needed:**
- Conditionally call TON hooks only when `isTonLoaded` is true
- Use stub values when TON not loaded
- Trigger `loadTonProvider()` in `connectTon()` function

**Impact**: Saves 108KB vendor-ton + 487KB wallet icons = ~595KB on initial load

---

## Phase 4B: Fix Preconnect Headers (P0)

### 4B.1 Update index.html Preconnects

PageSpeed specifically flagged these origins as needing preconnects. The current preconnects may be formatted incorrectly or missing.

**File: `index.html`**

Replace/add preconnects section:

```html
<!-- Critical preconnects for initial page load -->
<link rel="preconnect" href="https://li.quest" crossorigin />
<link rel="preconnect" href="https://api.web3modal.org" crossorigin />
<link rel="preconnect" href="https://mnziekrimlmvnrcwgmbk.supabase.co" crossorigin />
<!-- Note: config.ton.org removed - TON is now lazy loaded -->

<!-- DNS prefetch for secondary origins -->
<link rel="dns-prefetch" href="https://static.okx.com" />
<link rel="dns-prefetch" href="https://assets.coingecko.com" />
```

**Impact**: ~960ms combined connection savings (320ms x 3)

---

## Phase 4C: Optimize Hero Mascot Image (P0)

### 4C.1 Create WebP Version of Mascot

The current PNG is 500x500 (122KB) but displayed at 64x64. Create optimized versions:
- 64x64 WebP (~3KB)
- 128x128 WebP for 2x displays (~8KB)

**File: `src/components/HeroSection.tsx`**

Update image to use `<picture>` with WebP srcset:

```tsx
<picture>
  <source 
    srcSet="/xlama-mascot-64.webp 1x, /xlama-mascot-128.webp 2x" 
    type="image/webp" 
  />
  <img 
    src={xlamaMascot} 
    alt="xLama mascot" 
    width={64}
    height={64}
    fetchPriority="high"
    decoding="async"
    className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full ring-2 ring-primary/40 shrink-0 hover-lift transition-transform duration-300"
  />
</picture>
```

**Note**: Since we cannot add binary image files directly, we'll use a build-time optimization approach or reference externally hosted optimized images.

**Alternative approach**: Use the existing PNG but add explicit width/height to prevent reflow, and ensure it's served with proper cache headers.

**Impact**: 120KB → ~10KB = 110KB savings

---

## Phase 4D: Consolidate Micro-Chunks (P1)

### 4D.1 Update Vite Chunk Strategy

PageSpeed shows 60+ tiny chunks (1KB each) causing connection contention. Consolidate small chunks:

**File: `vite.config.ts`**

Add minimum chunk size threshold:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // ... existing chunks ...
      },
      // Ensure minimum chunk size to avoid micro-chunks
      experimentalMinChunkSize: 10000, // 10KB minimum
    },
  },
},
```

**Impact**: Fewer HTTP requests, better parallel loading

---

## Phase 4E: Defer OKX-DEX API Calls Further (P1)

### 4E.1 Increase Initial Defer Time

The okx-dex API calls (3,753ms) are still in the critical path. Increase defer timeout significantly.

**File: `src/hooks/useDexTokens.ts`**

Update requestIdleCallback timeout:

```tsx
useEffect(() => {
  // Defer even further - wait 2 seconds after first paint
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => setHasMounted(true), { timeout: 2000 });
  } else {
    setTimeout(() => setHasMounted(true), 2000);
  }
}, []);
```

### 4E.2 Add Loading Skeleton for Token Selector

Ensure users see immediate feedback while tokens load.

**Impact**: FCP/LCP improvement by keeping API calls out of critical path

---

## Phase 4F: Fix Service Worker Cache Detection (P1)

### 4F.1 Ensure Service Worker Activates Properly

PageSpeed still shows "Cache TTL: None" for assets. The Service Worker may not be registering correctly.

**File: `src/main.tsx`**

Add explicit SW registration with logging:

```tsx
// Register service worker with explicit scope and update handling
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('[Main] SW registered:', registration.scope);
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[Main] New SW activated');
              }
            });
          }
        });
      })
      .catch(err => console.error('[Main] SW registration failed:', err));
  });
}
```

---

## Phase 4G: Reduce LCP Element Render Delay (P1)

### 4G.1 Simplify Hero Section Rendering

The LCP element (hero description) has 3,350ms render delay. Simplify the hero section to render immediately.

**File: `src/pages/Index.tsx`**

- Remove all animation classes from LCP-critical elements
- Ensure hero text is in the initial HTML before hydration
- Move non-critical animations to `requestIdleCallback`

---

## Implementation Priority

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| 4A: Integrate Lazy TON Provider | Medium | Very High (~600KB) | P0 |
| 4B: Fix Preconnects | Low | High (~960ms) | P0 |
| 4C: Optimize Hero Image | Low | High (~110KB) | P0 |
| 4D: Consolidate Micro-Chunks | Low | Medium | P1 |
| 4E: Defer API Calls Further | Low | Medium | P1 |
| 4F: Fix SW Cache Detection | Low | High | P1 |
| 4G: Reduce LCP Delay | Medium | High | P1 |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiWalletContext.tsx` | Replace TonConnectUIProvider with TonProviderLazy, conditional TON hooks |
| `src/contexts/TonProviderLazy.tsx` | Export stub hooks for pre-load state |
| `index.html` | Fix preconnects - add li.quest, ensure proper crossorigin |
| `src/components/HeroSection.tsx` | Use optimized WebP image with srcset |
| `vite.config.ts` | Add experimentalMinChunkSize to consolidate micro-chunks |
| `src/hooks/useDexTokens.ts` | Increase defer timeout to 2000ms |
| `src/main.tsx` | Add explicit SW registration with logging |
| `src/pages/Index.tsx` | Remove animation delays from LCP elements |
| `src/pages/Changelog.tsx` | Add v2.8.0 entry |

---

## Expected Outcomes

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Performance Score | 56 | 70+ | +14 points |
| First Contentful Paint | 9.1s | < 5s | -45% |
| Largest Contentful Paint | 14.2s | < 8s | -45% |
| Initial Transfer Size | ~2.1MB | ~1.5MB | -30% |
| TON-related Transfer | 595KB | 0KB initial | -100% |
| Connection Setup Savings | 0 | 960ms | New |

---

## Changelog Entry for v2.8.0

```tsx
{
  version: "2.8.0",
  date: "2026-02-XX",
  title: "Critical Performance Optimization",
  description: "Major FCP/LCP improvements through lazy TON loading, preconnect fixes, and image optimization.",
  type: "major",
  changes: [
    { category: "improvement", text: "Lazy load TON Connect provider - saves 600KB on initial load" },
    { category: "improvement", text: "Fixed preconnect headers for 960ms connection savings" },
    { category: "improvement", text: "Optimized hero mascot image (122KB → 10KB WebP)" },
    { category: "improvement", text: "Consolidated micro-chunks for fewer HTTP requests" },
    { category: "improvement", text: "Deferred API calls further from critical path" },
    { category: "improvement", text: "Fixed Service Worker cache header detection" },
    { category: "improvement", text: "Simplified hero rendering for faster LCP" },
  ],
}
```

---

## Technical Notes

### Why TON Lazy Loading is Critical
- TON Connect immediately fetches `wallets-v2.json` from config.ton.org
- This triggers 30+ image requests for wallet icons (487KB total)
- Combined with vendor-ton.js (108KB), this is ~600KB blocking initial load
- Most users never use TON - defer until they request connection

### Why Preconnects Aren't Working
The current index.html has preconnects but PageSpeed says "no origins were preconnected". Possible causes:
- Missing `crossorigin` attribute on some links
- Preconnects after render-blocking resources
- Origins not matching exactly (www vs non-www, trailing slashes)

### Service Worker Cache Issue
Despite having stale-while-revalidate in SW v9, PageSpeed shows "Cache TTL: None". This suggests:
- SW may not be activating before first paint
- Headers not being set correctly
- Need to verify SW registration happens early

