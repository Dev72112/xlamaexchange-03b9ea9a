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
    // Enable minification with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
    // Generate source maps but don't link to them publicly
    sourcemap: 'hidden',
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching and smaller initial bundle
        manualChunks: (id) => {
          // Core React - loads immediately
          if (id.includes('react-dom') || id.includes('react/')) {
            return 'vendor-react';
          }
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          
          // UI components - split by usage frequency
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-tooltip') ||
              id.includes('@radix-ui/react-popover')) {
            return 'vendor-ui-core';
          }
          if (id.includes('@radix-ui/')) {
            return 'vendor-ui-extended';
          }
          
          // Wallet SDKs - defer loading
          if (id.includes('@reown/appkit') || id.includes('wagmi') || id.includes('viem')) {
            return 'vendor-wallet-evm';
          }
          if (id.includes('@solana/')) {
            return 'vendor-wallet-solana';
          }
          if (id.includes('@mysten/')) {
            return 'vendor-wallet-sui';
          }
          if (id.includes('@tonconnect/')) {
            return 'vendor-wallet-ton';
          }
          if (id.includes('@okxconnect/')) {
            return 'vendor-wallet-okx';
          }
          
          // Bridge/DEX - only load when needed
          if (id.includes('@lifi/')) {
            return 'vendor-lifi';
          }
          
          // Charts - only load on pages with charts
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          
          // Query/Forms - commonly used
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform/')) {
            return 'vendor-forms';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }
        },
      },
    },
  },
}));
