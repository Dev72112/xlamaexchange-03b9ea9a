import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeProjectId } from "./config/appkit";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

// Initialize WalletConnect project ID from edge function
initializeProjectId().then(() => {
  createRoot(document.getElementById("root")!).render(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  );
});
