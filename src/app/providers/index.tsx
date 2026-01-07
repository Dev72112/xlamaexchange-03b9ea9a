/**
 * Combined App Providers - Single wrapper for all context providers
 * This reduces nesting and makes the provider hierarchy clearer
 */
import React, { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WalletProviders } from './WalletProviders';
import { DataProviders } from './DataProviders';
import { ExchangeProviders } from './ExchangeProviders';
import { UIProviders } from './UIProviders';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders wraps all context providers in the correct order:
 * 1. HelmetProvider - SEO/meta tags
 * 2. ThemeProvider - Dark/light mode
 * 3. ErrorBoundary - Global error handling
 * 4. WalletProviders - Wallet connection state
 * 5. DataProviders - Price oracle, transactions
 * 6. ExchangeProviders - Exchange mode, trade prefill
 * 7. UIProviders - Tooltips, toasts
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark">
        <ErrorBoundary>
          <WalletProviders>
            <DataProviders>
              <ExchangeProviders>
                <UIProviders>
                  {children}
                </UIProviders>
              </ExchangeProviders>
            </DataProviders>
          </WalletProviders>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  );
}

// Re-export individual providers for granular use
export { WalletProviders } from './WalletProviders';
export { DataProviders } from './DataProviders';
export { ExchangeProviders } from './ExchangeProviders';
export { UIProviders } from './UIProviders';
