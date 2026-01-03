import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeAppKit } from "./config/appkit";
import { startTokenPrefetch } from "./lib/tokenPrefetch";
import App from "./App.tsx";
import "./index.css";

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
  createRoot(document.getElementById("root")!).render(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  );
  
  // Start prefetching token lists for common chains (non-blocking)
  startTokenPrefetch();
});

