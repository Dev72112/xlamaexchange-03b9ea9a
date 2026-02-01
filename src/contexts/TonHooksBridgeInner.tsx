/**
 * TON Hooks Bridge Inner Component
 * 
 * This component is ONLY loaded dynamically after TonConnectUIProvider is mounted.
 * It uses the actual TON hooks and provides values via shared context.
 */
import React, { ReactNode } from 'react';
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';
import { TonHooksContext } from './TonHooksContext';

interface TonHooksBridgeInnerProps {
  children: ReactNode;
}

export function TonHooksBridgeInner({ children }: TonHooksBridgeInnerProps) {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddressRaw = useTonAddress();
  const tonAddress = tonAddressRaw || null;

  return (
    <TonHooksContext.Provider value={{ tonConnectUI, tonWallet, tonAddress }}>
      {children}
    </TonHooksContext.Provider>
  );
}
