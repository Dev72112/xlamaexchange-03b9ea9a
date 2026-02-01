
# Fix: Production White Screen After Deploy

## Problem Summary

The production site shows a white blank screen while preview works. This is caused by:

1. **Service Worker serving stale `/assets/` JS chunks** that don't match the new `index.html`
2. **Aggressive force-reload on SW activation** causing potential loops
3. **Potential race condition** where `wagmiConfig` is undefined if backend fetch fails

---

## Solution: Three-Part Fix

### Part 1: Disable Stale-While-Revalidate for JS/CSS Bundles

The `staleWhileRevalidateAssets` strategy is the primary cause. Hashed bundles (e.g., `index-abc123.js`) are **immutable by design** - if the hash changes, it's a new file. Serving a stale version from cache causes chunk mismatch errors.

**Change**: Use **network-first** for `/assets/` bundles, with cache as fallback only for offline scenarios.

```js
// BEFORE: stale-while-revalidate (causes mismatch)
if (url.pathname.startsWith('/assets/') && ...) {
  event.respondWith(staleWhileRevalidateAssets(request));
}

// AFTER: network-first (always fresh in production)
if (url.pathname.startsWith('/assets/') && ...) {
  event.respondWith(networkFirstAssets(request));
}
```

### Part 2: Remove Aggressive Force-Reload on SW Activation

The `client.navigate(client.url)` in the activate handler can cause reload loops and isn't necessary if we're using network-first for assets.

**Change**: Remove the force-refresh logic from `activate` event. The `controllerchange` listener in `main.tsx` is sufficient.

### Part 3: Add Fallback Rendering if wagmiConfig Fails

If `initializeAppKit()` fails (network error, edge function timeout), the app should still render with a basic error state rather than showing nothing.

**Change**: Add error boundary and fallback UI in `main.tsx`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `public/sw.js` | 1. Change `/assets/` strategy from stale-while-revalidate to network-first<br>2. Remove force-reload logic in activate<br>3. Bump version to v11 |
| `src/main.tsx` | Add fallback rendering if wagmiConfig initialization fails |

---

## Detailed Changes

### public/sw.js

```js
// Version bump
const CACHE_VERSION = 'v11';

// In fetch handler, change assets strategy:
if (url.pathname.startsWith('/assets/') && ...) {
  // Network-first for hashed bundles - prevents stale chunk errors
  event.respondWith(networkFirstAssets(request));
  return;
}

// New function (replaces staleWhileRevalidateAssets):
async function networkFirstAssets(request) {
  const cache = await caches.open(ASSET_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache for offline use
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Only use cache when offline
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

// In activate handler - REMOVE the force-reload logic:
// DELETE lines 79-96 (the client.navigate loop)
```

### src/main.tsx

```tsx
// Add error handling for when AppKit fails
const renderFallbackError = (error: Error) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;
  
  rootElement.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;background:#0a0a0a;color:#fff;">
      <h1 style="margin-bottom:16px;">Failed to Load</h1>
      <p style="color:#888;margin-bottom:24px;">Please try refreshing the page or clearing your browser cache.</p>
      <button onclick="localStorage.clear();location.reload();" style="padding:12px 24px;background:#22c55e;color:#000;border:none;border-radius:8px;cursor:pointer;">
        Clear Cache & Reload
      </button>
    </div>
  `;
};

// Modify initialization:
initializeAppKit()
  .then(() => {
    if (!wagmiConfig) {
      throw new Error('wagmiConfig not initialized');
    }
    renderApp();
    registerServiceWorker();
  })
  .catch((error) => {
    console.error('[Main] AppKit init failed:', error);
    // Show user-friendly error instead of white screen
    renderFallbackError(error);
  });
```

---

## Why This Fixes the Issue

1. **Network-first for assets** ensures fresh JS/CSS on every page load - no stale chunk mismatch
2. **Removing force-reload** prevents infinite reload loops
3. **Fallback UI** ensures users never see a blank white screen
4. **Cache still works offline** - assets are cached but only served when network fails

---

## Testing Checklist

After implementation:
- [ ] Publish the changes
- [ ] Open production site in incognito window
- [ ] Verify no white screen
- [ ] Check DevTools Console for errors
- [ ] Test with "Offline" mode in DevTools Network tab
- [ ] Test TON wallet connection (verify lazy loading still works)
- [ ] Test EVM wallet connection

---

## Expected Outcome

| Before | After |
|--------|-------|
| White screen on production after deploy | App loads correctly |
| Stale JS chunks cause ChunkLoadError | Fresh JS always served |
| No user feedback on init failure | Clear error with "Clear Cache" button |
| Potential reload loops | Clean SW update handling |
