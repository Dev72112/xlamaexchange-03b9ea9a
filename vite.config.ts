import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Bundle analyzer - generates stats.html after build
    mode === "production" && visualizer({
      filename: "stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/app": path.resolve(__dirname, "./src/app"),
      "@/features": path.resolve(__dirname, "./src/features"),
      "@/shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Use Vite's default esbuild minification (faster and more reliable than terser)
    minify: 'esbuild',
    // Generate source maps but don't link to them publicly
    sourcemap: 'hidden',
    // Chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI component libraries
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dropdown-menu',
          ],
          // Wallet connection
          'vendor-wallet': ['@reown/appkit', 'wagmi', 'viem'],
          // Bridge/DEX aggregator
          'vendor-lifi': ['@lifi/sdk'],
          // Charts
          'vendor-charts': ['recharts'],
          // React Query
          'vendor-query': ['@tanstack/react-query'],
          // Forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Solana
          'vendor-solana': ['@solana/web3.js', '@solana/wallet-adapter-base'],
          // Sui - use specific exports to avoid resolution issues
          'vendor-sui': ['@mysten/dapp-kit'],
          // TON
          'vendor-ton': ['@tonconnect/ui-react'],
        },
      },
    },
  },
}));
