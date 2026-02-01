
# Performance Optimization Phase 4: Critical FCP/LCP Improvements

## Current State (v2.7.0)

Phase 3 successfully implemented:
- Service Worker v9 with stale-while-revalidate for `/assets/`
- Preconnects for Supabase, Web3Modal, LiFi
- Removed animation delays from LCP elements
- Deferred API calls via `requestIdleCallback`
- `LazyVisibleChart` with IntersectionObserver
- **Created** `TonProviderLazy` (but NOT integrated)

### What Was NOT Completed
The `TonProviderLazy` component exists but is NOT wired into `MultiWalletProvider`. TON Connect still loads eagerly in `MultiWalletContext.tsx` (lines 757-782), fetching 30+ wallet icons (~487KB) on every page load.

---

## Phase 4 Goals

Focus on **safe, incremental improvements** that don't break wallet functionality:

| Priority | Task | Risk | Impact |
|----------|------|------|--------|
| P0 | Integrate TonProviderLazy safely | Medium | High - saves ~500KB |
| P0 | Add Service Worker update handling | Low | Medium - ensures fresh deploys |
| P1 | Consolidate micro-chunks | Low | Medium - fewer network requests |
| P1 | Add preconnect for li.quest | Low | Low - faster bridge API |
| P2 | Optimize hero image format | Low | Medium - faster LCP |

---

## Phase 4A: Safe TON Provider Lazy Loading

### The Challenge
The current `MultiWalletProvider` wraps everything in `TonConnectUIProvider` at the top level. The hooks `useTonConnectUI`, `useTonWallet`, and `useTonAddress` are called unconditionally inside `MultiWalletProviderInner`.

Simply removing the provider breaks these hooks (React Rules of Hooks violation).

### Safe Solution: Conditional Hooks Bridge

Create a bridge component that provides TON hook values **only when TON is loaded**, with safe defaults otherwise.

**New Pattern:**
```
MultiWalletProvider
  └── TonProviderLazy (controls loading)
        └── TonHooksBridge (provides hook values or stubs)
              └── MultiWalletProviderInner (uses bridged values)
```

**Files to modify:**
1. `src/contexts/TonProviderLazy.tsx` - Add `TonHooksBridge` component
2. `src/contexts/MultiWalletContext.tsx` - Use bridged TON hooks instead of direct imports
3. `src/app/providers/WalletProviders.tsx` - Wrap with `TonProviderLazy`

### Implementation Details

**TonProviderLazy.tsx additions:**
```tsx
// Context to pass TON hook values (or null stubs)
interface TonHooksContextType {
  tonConnectUI: TonConnectUI | null;
  tonWallet: Wallet | null;
  tonAddress: string | null;
}

const TonHooksContext = createContext<TonHooksContextType>({
  tonConnectUI: null,
  tonWallet: null,
  tonAddress: null,
});

// Inner component that actually uses TON hooks (only rendered when loaded)
function TonHooksProvider({ children }: { children: ReactNode }) {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddress = useTonAddress();
  
  return (
    <TonHooksContext.Provider value={{ tonConnectUI, tonWallet, tonAddress }}>
      {children}
    </TonHooksContext.Provider>
  );
}

// Export hook for consuming bridged values
export function useTonHooksBridged() {
  return useContext(TonHooksContext);
}
```

**MultiWalletContext.tsx changes:**
```tsx
// BEFORE (eager TON)
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
const [tonConnectUI] = useTonConnectUI();
const tonWallet = useTonWallet();
const tonAddressRaw = useTonAddress();

// AFTER (lazy via bridge)
import { useTonHooksBridged, useTonLazy } from '@/contexts/TonProviderLazy';
const { tonConnectUI, tonWallet, tonAddress: tonAddressRaw } = useTonHooksBridged();
const { loadTonProvider } = useTonLazy();

// In connectTon function - trigger lazy load
const connectTon = useCallback(async (): Promise<boolean> => {
  loadTonProvider(); // Trigger lazy load
  // ... rest of connection logic
}, [loadTonProvider]);
```

---

## Phase 4B: Service Worker Update Handling

### Problem
Users may see stale cached versions after deployments. Need to handle SW updates properly.

### Solution
Add SW registration and update handling in `main.tsx`:

```tsx
// Register service worker with update handling
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // New version available - could show a toast
          console.log('[SW] New version available');
        }
      });
    });
  });
  
  // Handle controller change (new SW took over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
```

---

## Phase 4C: Bundle Micro-Chunk Consolidation

### Problem
Vite can create many tiny chunks that increase connection overhead on mobile.

### Solution
Add `experimentalMinChunkSize` to Vite config:

```ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      experimentalMinChunkSize: 10000, // 10KB minimum
      manualChunks: { ... }
    }
  }
}
```

---

## Phase 4D: Additional Preconnects

Add missing preconnects identified by PageSpeed:

```html
<!-- index.html -->
<link rel="preconnect" href="https://li.quest" crossorigin />
<link rel="dns-prefetch" href="https://li.quest" />
```

Note: `li.quest` is already added in v2.7.0, verify it's working.

---

## Implementation Order (Risk-Managed)

1. **Phase 4B first** - SW update handling (low risk, prevents stale cache issues)
2. **Phase 4C** - Vite micro-chunk consolidation (low risk, build-time only)
3. **Phase 4A** - TON lazy loading (medium risk, test thoroughly)
   - Step 1: Add `TonHooksBridge` to `TonProviderLazy`
   - Step 2: Update `MultiWalletContext` to use bridged hooks
   - Step 3: Wire `TonProviderLazy` into provider tree
   - **Test**: Verify TON connection still works

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main.tsx` | Add Service Worker registration with update handling |
| `vite.config.ts` | Add `experimentalMinChunkSize: 10000` |
| `src/contexts/TonProviderLazy.tsx` | Add `TonHooksBridge`, `TonHooksContext`, `useTonHooksBridged` |
| `src/contexts/MultiWalletContext.tsx` | Replace direct TON imports with bridged hooks |
| `src/app/providers/WalletProviders.tsx` | Wrap with `TonProviderLazy` |
| `src/pages/Changelog.tsx` | Add v2.8.0 entry |

---

## Risk Mitigation

### TON Lazy Loading Risks
1. **Rules of Hooks violation** - Mitigated by bridge pattern
2. **Existing TON users can't connect** - Test manually after implementation
3. **State sync issues** - Bridge provides consistent defaults

### Rollback Plan
If TON lazy loading causes issues:
1. Revert `MultiWalletContext` to use direct imports
2. Remove `TonProviderLazy` from provider tree
3. Keep SW improvements (safe)

---

## Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial JS (mobile) | ~1.8MB | ~1.3MB | -28% |
| TON vendor chunk | Eager load | On-demand | -487KB initial |
| FCP | 9.0s | ~6s | -33% |
| LCP | 14.6s | ~9s | -38% |
| Network requests | Many micro-chunks | Consolidated | Fewer connections |

---

## Changelog Entry for v2.8.0

```tsx
{
  version: "2.8.0",
  date: "2026-02-01",
  title: "Critical FCP/LCP Optimization",
  description: "Deferred TON wallet loading and build optimizations for faster mobile performance.",
  type: "major",
  changes: [
    { category: "improvement", text: "Lazy load TON Connect provider - saves ~500KB on initial load" },
    { category: "improvement", text: "TON wallet icons load only when user requests TON connection" },
    { category: "improvement", text: "Service Worker update handling for fresh deployments" },
    { category: "improvement", text: "Consolidated micro-chunks for fewer network requests" },
    { category: "improvement", text: "TonHooksBridge pattern for safe conditional hook usage" },
  ],
}
```

---

## Testing Checklist

After implementation, verify:
- [ ] Site loads without white screen
- [ ] EVM wallet connection works
- [ ] Solana wallet connection works
- [ ] TON wallet connection works (triggers lazy load)
- [ ] TON icons appear after clicking Connect TON
- [ ] No console errors about hooks
- [ ] Service Worker updates properly after deploy
