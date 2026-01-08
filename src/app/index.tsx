/**
 * Main App Entry Point
 * Composes providers and app shell into the final application
 */
import React, { useEffect } from 'react';
import { AppProviders } from './providers';
import { AppShell } from './AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Extend Window interface for boot watchdog
declare global {
  interface Window {
    __APP_MOUNTED__?: boolean;
    __CANCEL_BOOT_WATCHDOG__?: () => void;
  }
}

function App() {
  // Signal successful mount to boot watchdog
  useEffect(() => {
    window.__APP_MOUNTED__ = true;
    if (typeof window.__CANCEL_BOOT_WATCHDOG__ === 'function') {
      window.__CANCEL_BOOT_WATCHDOG__();
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
