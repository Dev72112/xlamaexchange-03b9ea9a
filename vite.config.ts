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
      // Removed 'framer-motion' - lazy loaded for smaller initial bundle
      'lucide-react',
      'clsx',
      'tailwind-merge',
      // Fix ESM/CJS interop issues for wallet libraries
      'eventemitter3',
      'bech32',
      // These pull in CJS deps that must be pre-bundled to avoid `require is not defined`
      'bitcoinjs-lib',
      '@bitcoinerlab/secp256k1',
    ],
    // Exclude heavy dependencies that are code-split
    exclude: ['@lifi/sdk'],
    // Force ESM conversion for CJS modules
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Use terser for better compression in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific function calls
      },
      mangle: {
        safari10: true, // Work around Safari 10 bugs
      },
      format: {
        comments: false, // Remove comments
      },
    },
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
          // Animation library - separate chunk for lazy loading
          'vendor-motion': ['framer-motion'],
          // Wallet connection
          'vendor-wallet': ['@reown/appkit', 'wagmi', 'viem'],
          // Bridge/DEX aggregator - lazy loaded
          'vendor-lifi': ['@lifi/sdk'],
          // Charts - lazy loaded
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
