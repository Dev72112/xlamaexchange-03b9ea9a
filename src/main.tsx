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

// Register service worker for asset caching (P1 - fixes Cache TTL: None issue)
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    // If a new SW takes control, refresh once to ensure we load the latest HTML/chunks.
    // This prevents rare "white screen after publish" cases caused by stale cached assets.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('[Main] SW registered:', registration.scope);

          // If there's already an updated worker waiting, activate it now.
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                // When a new SW is installed while an older one is controlling the page,
                // tell it to skip waiting so it can take over immediately.
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }

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
};

// Initialize AppKit first (required for wagmiConfig), then render
initializeAppKit()
  .then(() => {
    renderApp();
    registerServiceWorker();
  })
  .catch((error) => {
    console.error('[Main] AppKit init failed:', error);
    // Still try to render - wagmiConfig might be available
    renderApp();
    registerServiceWorker();
  });
