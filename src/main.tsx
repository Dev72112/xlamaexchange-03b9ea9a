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

// Initialize AppKit first (required for wagmiConfig), then render
initializeAppKit()
  .then(() => {
    renderApp();
    // Register SW after app renders (non-blocking)
    registerServiceWorker();
  })
  .catch((error) => {
    console.error('[Main] AppKit init failed:', error);
    // Still try to render - wagmiConfig might be available
    renderApp();
    registerServiceWorker();
  });
