import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeAppKit } from "./config/appkit";
import { startTokenPrefetch } from "./lib/tokenPrefetch";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

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

