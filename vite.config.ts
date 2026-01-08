import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
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
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        // Additional tree-shaking optimizations
        passes: 2,
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // Generate source maps but don't link to them publicly
    sourcemap: 'hidden',
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
    // Tree-shaking configuration
    modulePreload: {
      polyfill: false, // Modern browsers don't need polyfill
    },
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
          
          // Wallet SDKs - defer loading (separate chunks for each ecosystem)
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
          
          // Supabase - used for data persistence
          if (id.includes('@supabase/')) {
            return 'vendor-supabase';
          }
          
          // Animation libraries
          if (id.includes('framer-motion')) {
            return 'vendor-animation';
          }
          
          // Icons - only lucide icons used
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          // Vendor chunks get contenthash for long-term caching
          if (chunkInfo.name?.startsWith('vendor-')) {
            return 'assets/[name]-[hash].js';
          }
          // Route chunks
          return 'assets/[name]-[hash].js';
        },
        // Entry point naming
        entryFileNames: 'assets/[name]-[hash].js',
        // Asset naming with hash
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Tree-shaking: mark these as having no side effects
      treeshake: {
        moduleSideEffects: (id) => {
          // CSS files have side effects
          if (id.endsWith('.css')) return true;
          // Entry points have side effects
          if (id.includes('main.tsx') || id.includes('index.html')) return true;
          // Everything else is pure
          return false;
        },
        preset: 'recommended',
      },
    },
  },
}));
