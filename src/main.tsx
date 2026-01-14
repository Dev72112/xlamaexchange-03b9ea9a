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

// Initialize monitoring
if (typeof window !== 'undefined') {
  initWebVitals();
  initErrorTracking();
}

// Show minimal splash screen (CSS is in index.html for instant display)
const showSplash = () => {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div class="splash-container">
        <div class="splash-content">
          <img src="/xlama-mascot.png" alt="xLama" class="llama-mascot" width="100" height="100" />
          <h1 class="splash-title">xLama<span class="accent">Swap</span></h1>
          <p class="splash-subtitle">Cross-chain made simple</p>
          <div class="splash-loader"></div>
        </div>
      </div>
    `;
  }
};

showSplash();

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
  
  // Start prefetching (non-blocking)
  startTokenPrefetch();
  prefetchCriticalRoutes();
};

// Initialize AppKit then render
initializeAppKit()
  .then(() => {
    renderApp();
  })
  .catch((error) => {
    console.error('[Main] AppKit init failed:', error);
    renderApp(); // Still try to render as fallback
  });

// Watchdog: force render after 15s if stuck
setTimeout(() => {
  const root = document.getElementById("root");
  if (root?.querySelector('.splash-container')) {
    console.warn('[Main] Watchdog triggered - forcing render');
    renderApp();
  }
}, 15000);
