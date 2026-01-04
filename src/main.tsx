import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeAppKit } from "./config/appkit";
import { startTokenPrefetch } from "./lib/tokenPrefetch";
import App from "./App.tsx";
import "./index.css";

// Import Sui dapp-kit styles
import '@mysten/dapp-kit/dist/index.css';

// Optimized QueryClient with garbage collection and stale time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Show loading splash while initializing
const showSplash = () => {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: hsl(222 47% 6%);
        color: hsl(210 40% 98%);
        font-family: system-ui, -apple-system, sans-serif;
        gap: 1.5rem;
      ">
        <div style="
          width: 48px;
          height: 48px;
          border: 3px solid hsl(210 40% 20%);
          border-top-color: hsl(217 91% 60%);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <p style="font-size: 0.875rem; opacity: 0.7;">Initializing...</p>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
};

showSplash();

// Initialize AppKit (loads WalletConnect project ID) before rendering
initializeAppKit().then(() => {
  // Only render when wagmiConfig is ready
  if (!wagmiConfig) {
    console.error('[Main] WagmiConfig not initialized');
    return;
  }
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('[Main] Root element not found');
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
  
  // Start prefetching token lists for common chains (non-blocking)
  startTokenPrefetch();
}).catch((error) => {
  console.error('[Main] Failed to initialize AppKit:', error);
  
  // Render without wallet functionality as fallback
  const rootElement = document.getElementById("root");
  if (rootElement && wagmiConfig) {
    createRoot(rootElement).render(
      <React.StrictMode>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </WagmiProvider>
      </React.StrictMode>
    );
  }
});
