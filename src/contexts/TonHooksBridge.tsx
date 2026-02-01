/**
 * TonHooksBridge - Separate file for TON hooks to enable proper code splitting
 * 
 * This component is lazy-loaded only when TON connection is requested.
 * It wraps children with TonConnectUIProvider and forwards hook values up.
 */

import React, { useEffect, ReactNode } from 'react';
import { TonConnectUIProvider, useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

interface TonHooksBridgeProps {
  children: ReactNode;
  onHooksReady: (hooks: { tonConnectUI: any; tonWallet: any; tonAddress: string | null }) => void;
}

// Inner component that uses TON hooks (must be inside TonConnectUIProvider)
function TonHooksForwarder({ children, onHooksReady }: TonHooksBridgeProps) {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddress = useTonAddress();
  
  // Forward hook values to parent context
  useEffect(() => {
    onHooksReady({
      tonConnectUI,
      tonWallet,
      tonAddress: tonAddress || null,
    });
  }, [tonConnectUI, tonWallet, tonAddress, onHooksReady]);
  
  return <>{children}</>;
}

// Main bridge component that provides TON context
export default function TonHooksBridge({ children, onHooksReady }: TonHooksBridgeProps) {
  return (
    <TonConnectUIProvider 
      manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
      actionsConfiguration={{ 
        twaReturnUrl: window.location.origin as `${string}://${string}` 
      }}
      walletsListConfiguration={{ 
        includeWallets: [{ 
          appName: 'tonkeeper', 
          name: 'Tonkeeper', 
          imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png', 
          aboutUrl: 'https://tonkeeper.com', 
          universalLink: 'https://app.tonkeeper.com/ton-connect', 
          bridgeUrl: 'https://bridge.tonapi.io/bridge', 
          platforms: ['ios', 'android', 'chrome', 'firefox', 'safari'] 
        }] 
      }}
    >
      <TonHooksForwarder onHooksReady={onHooksReady}>
        {children}
      </TonHooksForwarder>
    </TonConnectUIProvider>
  );
}
