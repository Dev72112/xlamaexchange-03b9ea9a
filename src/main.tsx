import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeAppKit } from "./config/appkit";
import { startTokenPrefetch } from "./lib/tokenPrefetch";
import { prefetchCriticalRoutes } from "./lib/routePrefetch";
import { queryClient } from "./lib/queryClient";
import { initWebVitals } from "./lib/performance";
import { initErrorTracking } from "./lib/errorTracking";
import App from "./App.tsx";
import "./index.css";

// Import Sui dapp-kit styles
import '@mysten/dapp-kit/dist/index.css';

// Initialize monitoring in idle time (after render)
const initMonitoringDeferred = () => {
  const initMonitoring = () => {
    initWebVitals();
    initErrorTracking();
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initMonitoring, { timeout: 2000 });
  } else {
    setTimeout(initMonitoring, 100);
  }
};

const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement || !wagmiConfig) {
    console.error('[Main] Cannot render: missing root or wagmiConfig');
    return;
  }
  
  createRoot(rootElement).render(
    <React.StrictMode>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  );
  
  // Initialize monitoring after first render
  if (typeof window !== 'undefined') {
    initMonitoringDeferred();
  }
  
  // Defer prefetching to idle callback for better FCP/LCP
  const startPrefetching = () => {
    startTokenPrefetch();
    prefetchCriticalRoutes();
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(startPrefetching, { timeout: 3000 });
  } else {
    setTimeout(startPrefetching, 1000);
  }
};

// Register Service Worker with update handling
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[SW] New version available');
          }
        });
      });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
    
    // Handle controller change (new SW took over) - reload for fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
};

// Fallback UI when app fails to initialize (prevents white screen)
const renderFallbackError = (error: Error) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;
  
  console.error('[Main] Rendering fallback error UI:', error);
  rootElement.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;">
      <h1 style="margin-bottom:16px;font-size:1.5rem;">Failed to Load</h1>
      <p style="color:#888;margin-bottom:24px;max-width:400px;">Please try refreshing the page or clearing your browser cache.</p>
      <button onclick="localStorage.clear();sessionStorage.clear();caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).finally(()=>location.reload());" style="padding:12px 24px;background:#22c55e;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
        Clear Cache & Reload
      </button>
    </div>
  `;
};

// Initialize AppKit first (required for wagmiConfig), then render
initializeAppKit()
  .then(() => {
    if (!wagmiConfig) {
      throw new Error('wagmiConfig not initialized');
    }
    renderApp();
    // Register SW after app renders (non-blocking)
    registerServiceWorker();
  })
  .catch((error) => {
    console.error('[Main] AppKit init failed:', error);
    // Show user-friendly error instead of white screen
    renderFallbackError(error);
  });
