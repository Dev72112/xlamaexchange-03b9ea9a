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

// Initialize monitoring in idle time
if (typeof window !== 'undefined') {
  // Defer non-critical monitoring to idle callback
  const initMonitoring = () => {
    initWebVitals();
    initErrorTracking();
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initMonitoring, { timeout: 2000 });
  } else {
    setTimeout(initMonitoring, 100);
  }
}

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

// Render app immediately, don't block on AppKit
renderApp();

// Initialize AppKit in background (non-blocking)
initializeAppKit().catch((error) => {
  console.error('[Main] AppKit init failed:', error);
});
