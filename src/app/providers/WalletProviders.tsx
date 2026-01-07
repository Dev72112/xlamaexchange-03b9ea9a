/**
 * Wallet-related providers: MultiWallet context
 */
import React, { ReactNode } from 'react';
import { MultiWalletProvider } from '@/contexts/MultiWalletContext';

interface WalletProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <MultiWalletProvider>
      {children}
    </MultiWalletProvider>
  );
}
