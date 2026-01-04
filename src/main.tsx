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
