/**
 * Shared TON Hooks Context
 * 
 * This context is shared between TonProviderLazy and TonHooksBridgeInner
 * to ensure consistent state whether TON is loaded or not.
 */
import { createContext } from 'react';

export interface TonHooksContextType {
  tonConnectUI: any | null;
  tonWallet: any | null;
  tonAddress: string | null;
}

export const TonHooksContext = createContext<TonHooksContextType>({
  tonConnectUI: null,
  tonWallet: null,
  tonAddress: null,
});
