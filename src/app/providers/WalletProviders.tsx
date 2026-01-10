/**
 * Wallet-related providers: MultiWallet context + Initial Snapshot + Presence tracking
 */
import React, { ReactNode, useEffect, useRef } from 'react';
import { MultiWalletProvider, useMultiWallet } from '@/contexts/MultiWalletContext';
import { useWalletSnapshot } from '@/hooks/useWalletSnapshot';
import { useWalletPresence } from '@/hooks/useWalletPresence';

interface WalletProvidersProps {
  children: ReactNode;
}

// Inner component to trigger initial snapshot and presence tracking on wallet connect
function WalletSnapshotTrigger({ children }: { children: ReactNode }) {
  const { anyConnectedAddress } = useMultiWallet();
  const { captureInitialSnapshotIfNeeded } = useWalletSnapshot();
  const { updatePresence } = useWalletPresence();
  const lastAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (anyConnectedAddress && anyConnectedAddress !== lastAddressRef.current) {
      lastAddressRef.current = anyConnectedAddress;
      
      // Capture initial snapshot on first wallet connection
      captureInitialSnapshotIfNeeded(anyConnectedAddress);
      
      // Update presence for daily snapshot scheduling
      updatePresence(anyConnectedAddress);
    }
  }, [anyConnectedAddress, captureInitialSnapshotIfNeeded, updatePresence]);

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
