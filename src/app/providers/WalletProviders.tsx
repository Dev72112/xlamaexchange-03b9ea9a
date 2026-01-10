/**
 * Wallet-related providers: MultiWallet context + Initial Snapshot
 */
import React, { ReactNode, useEffect, useRef } from 'react';
import { MultiWalletProvider, useMultiWallet } from '@/contexts/MultiWalletContext';
import { useWalletSnapshot } from '@/hooks/useWalletSnapshot';

interface WalletProvidersProps {
  children: ReactNode;
}

// Inner component to trigger initial snapshot on wallet connect
function WalletSnapshotTrigger({ children }: { children: ReactNode }) {
  const { anyConnectedAddress } = useMultiWallet();
  const { captureInitialSnapshotIfNeeded } = useWalletSnapshot();
  const lastAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (anyConnectedAddress && anyConnectedAddress !== lastAddressRef.current) {
      lastAddressRef.current = anyConnectedAddress;
      // Capture initial snapshot on first wallet connection
      captureInitialSnapshotIfNeeded(anyConnectedAddress);
    }
  }, [anyConnectedAddress, captureInitialSnapshotIfNeeded]);

  return <>{children}</>;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <MultiWalletProvider>
      <WalletSnapshotTrigger>
        {children}
      </WalletSnapshotTrigger>
    </MultiWalletProvider>
  );
}
