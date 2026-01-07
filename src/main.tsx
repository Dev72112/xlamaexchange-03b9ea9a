import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, initializeAppKit } from "./config/appkit";
import { startTokenPrefetch } from "./lib/tokenPrefetch";
import { queryClient } from "./lib/queryClient";
import { initWebVitals } from "./lib/performance";
import App from "./App.tsx";
import "./index.css";

// Import Sui dapp-kit styles
import '@mysten/dapp-kit/dist/index.css';

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  initWebVitals();
}

// Splash screen with progress steps
const steps = [
  { id: 'config', label: 'Loading configuration', icon: '⚙️' },
  { id: 'wallet', label: 'Setting up wallets', icon: '🦙' },
  { id: 'network', label: 'Connecting networks', icon: '🌐' },
  { id: 'ready', label: 'Almost there...', icon: '✨' },
];

let currentStep = 0;

const updateStep = (stepIndex: number) => {
  currentStep = stepIndex;
  const stepElements = document.querySelectorAll('.init-step');
  const progressBar = document.getElementById('progress-bar');
  
  stepElements.forEach((el, i) => {
    if (i < stepIndex) {
      el.classList.add('completed');
      el.classList.remove('active');
    } else if (i === stepIndex) {
      el.classList.add('active');
      el.classList.remove('completed');
    } else {
      el.classList.remove('active', 'completed');
    }
  });
  
  if (progressBar) {
    progressBar.style.width = `${((stepIndex + 1) / steps.length) * 100}%`;
  }
};

const showSplash = () => {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div class="splash-container">
        <div class="splash-content">
          <!-- Llama mascot -->
          <div class="llama-container">
            <img src="/xlama-mascot.png" alt="xLama Mascot" class="llama-mascot" />
            <div class="llama-glow"></div>
          </div>
          
          <h1 class="splash-title">xLama<span class="accent">Swap</span></h1>
          <p class="splash-subtitle">Cross-chain made simple</p>
          
          <!-- Progress bar -->
          <div class="progress-container">
            <div class="progress-track">
              <div id="progress-bar" class="progress-fill"></div>
            </div>
          </div>
          
          <!-- Steps -->
          <div class="steps-container">
            ${steps.map((step, i) => `
              <div class="init-step ${i === 0 ? 'active' : ''}" data-step="${step.id}">
                <span class="step-icon">${step.icon}</span>
                <span class="step-label">${step.label}</span>
                <span class="step-check">✓</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <style>
        .splash-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, hsl(222 47% 4%) 0%, hsl(222 47% 8%) 100%);
          color: hsl(210 40% 98%);
          font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
          overflow: hidden;
          position: relative;
        }
        
        .splash-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(0, 255, 0, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .llama-container {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .llama-mascot {
          width: 120px;
          height: 120px;
          object-fit: contain;
          animation: llamaFloat 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 24px rgba(138, 43, 226, 0.4));
        }
        
        @keyframes llamaFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.02); }
        }
        
        .llama-glow {
          position: absolute;
          inset: -30px;
          background: radial-gradient(circle, rgba(138, 43, 226, 0.25) 0%, rgba(0, 255, 0, 0.1) 40%, transparent 70%);
          animation: pulse 2.5s ease-in-out infinite;
          z-index: -1;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        .splash-title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        
        .splash-title .accent {
          color: #00ff00;
        }
        
        .splash-subtitle {
          font-size: 0.875rem;
          opacity: 0.6;
          margin: -0.5rem 0 0.5rem;
        }
        
        .progress-container {
          width: 240px;
        }
        
        .progress-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          width: 25%;
          background: linear-gradient(90deg, #00ff00, #00cc00);
          border-radius: 2px;
          transition: width 0.4s ease-out;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }
        
        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 240px;
        }
        
        .init-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          opacity: 0.4;
          transition: all 0.3s ease;
          background: transparent;
        }
        
        .init-step.active {
          opacity: 1;
          background: rgba(0, 255, 0, 0.08);
          border: 1px solid rgba(0, 255, 0, 0.2);
        }
        
        .init-step.completed {
          opacity: 0.7;
        }
        
        .init-step.completed .step-check {
          display: inline;
          color: #00ff00;
        }
        
        .init-step.completed .step-icon {
          display: none;
        }
        
        .step-icon {
          font-size: 1rem;
          width: 1.25rem;
          text-align: center;
        }
        
        .step-label {
          flex: 1;
        }
        
        .step-check {
          display: none;
          font-size: 0.875rem;
        }
        
        .init-step.active .step-icon {
          animation: bounce 0.6s ease-in-out infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      </style>
    `;
    
    // Start with first step active
    updateStep(0);
  }
};

showSplash();

// Simulate progress through steps
const progressInterval = setInterval(() => {
  if (currentStep < steps.length - 1) {
    updateStep(currentStep + 1);
  }
}, 400);

// Initialize AppKit (loads WalletConnect project ID) before rendering
initializeAppKit().then(() => {
  clearInterval(progressInterval);
  updateStep(steps.length - 1); // Mark all complete
  
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
  
  // Small delay to show completion state
  setTimeout(() => {
    createRoot(rootElement).render(
      <React.StrictMode>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </WagmiProvider>
      </React.StrictMode>
    );
  }, 300);
  
  // Start prefetching token lists for common chains (non-blocking)
  startTokenPrefetch();
}).catch((error) => {
  clearInterval(progressInterval);
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
