/**
 * Wallet-related providers: MultiWallet context with lazy TON loading
 * 
 * TonProviderLazy wraps everything to enable deferred TON Connect loading.
 * This saves ~500KB on initial load by only loading TON when requested.
 */
import React, { ReactNode } from 'react';
import { MultiWalletProvider } from '@/contexts/MultiWalletContext';
import { TonProviderLazy } from '@/contexts/TonProviderLazy';

interface WalletProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <TonProviderLazy>
      <MultiWalletProvider>
        {children}
      </MultiWalletProvider>
    </TonProviderLazy>
  );
}
