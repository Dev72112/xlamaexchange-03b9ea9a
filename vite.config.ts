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
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    // Exclude heavy dependencies that are code-split
    exclude: ['@lifi/sdk'],
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
    // CSS code splitting
    cssCodeSplit: true,
    // Reduce inline limit for smaller main bundle
    assetsInlineLimit: 2048,
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
          // Animation library
          'vendor-motion': ['framer-motion'],
          // Wallet connection
          'vendor-wallet': ['@reown/appkit', 'wagmi', 'viem'],
          // Bridge/DEX aggregator - lazy loaded
          'vendor-lifi': ['@lifi/sdk'],
          // Charts
          'vendor-charts': ['recharts', 'lightweight-charts'],
          // React Query
          'vendor-query': ['@tanstack/react-query'],
          // Forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Solana (always loaded with AppKit)
          'vendor-solana': ['@solana/web3.js', '@solana/wallet-adapter-base'],
          // Sui - lazy loaded, separate chunk for dynamic import
          'vendor-sui': ['@mysten/dapp-kit'],
          // TON - lazy loaded, separate chunk for dynamic import
          'vendor-ton': ['@tonconnect/ui-react'],
          // Date utilities
          'vendor-date': ['date-fns'],
        },
      },
    },
  },
}));
