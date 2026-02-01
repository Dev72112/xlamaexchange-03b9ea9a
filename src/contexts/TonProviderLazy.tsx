/**
 * Lazy TON Connect Provider
 * 
 * Defers loading of @tonconnect/ui-react (~500KB) until user requests TON connection.
 * Uses dynamic imports to ensure the TON vendor chunk is not in the initial bundle.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode, Suspense, lazy } from 'react';
import { TonHooksContext, TonHooksContextType } from './TonHooksContext';

// SSR-safe origin helper
function getOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://xlamaexchange.lovable.app';
}

// ============= Lazy Loading Control Context =============
interface TonLazyContextType {
  isTonLoaded: boolean;
  loadTonProvider: () => void;
}

const TonLazyContext = createContext<TonLazyContextType>({
  isTonLoaded: false,
  loadTonProvider: () => {},
});

export function useTonLazy() {
  return useContext(TonLazyContext);
}

// Hook for consuming bridged TON values (null when not loaded)
export function useTonHooksBridged(): TonHooksContextType {
  return useContext(TonHooksContext);
}

// ============= Lazy Components =============
// Both provider and bridge are lazy-loaded together
const LazyTonConnectUIProvider = lazy(() =>
  import('@tonconnect/ui-react').then(m => ({
    default: m.TonConnectUIProvider,
  }))
);

// Lazy load the hooks bridge (ensures @tonconnect/ui-react isn't in main bundle)
const LazyTonHooksBridge = lazy(() =>
  import('./TonHooksBridgeInner').then(m => ({
    default: m.TonHooksBridgeInner,
  }))
);

// ============= Main Lazy Provider =============
interface TonProviderLazyProps {
  children: ReactNode;
}

export function TonProviderLazy({ children }: TonProviderLazyProps) {
  const [isTonLoaded, setIsTonLoaded] = useState(false);

  const loadTonProvider = useCallback(() => {
    if (!isTonLoaded) {
      console.log('[TonProviderLazy] Loading TON Connect provider...');
      setIsTonLoaded(true);
    }
  }, [isTonLoaded]);

  const contextValue = { isTonLoaded, loadTonProvider };

  // Null stubs for when TON isn't loaded
  const nullStubs: TonHooksContextType = {
    tonConnectUI: null,
    tonWallet: null,
    tonAddress: null,
  };

  // Fallback renders children with null stubs while loading
  const fallback = (
    <TonHooksContext.Provider value={nullStubs}>
      {children}
    </TonHooksContext.Provider>
  );

  if (isTonLoaded) {
    return (
      <TonLazyContext.Provider value={contextValue}>
        <Suspense fallback={fallback}>
          <LazyTonConnectUIProvider
            manifestUrl={`${getOrigin()}/tonconnect-manifest.json`}
            actionsConfiguration={{
              twaReturnUrl: getOrigin() as `${string}://${string}`,
            }}
            walletsListConfiguration={{
              includeWallets: [
                {
                  appName: 'tonkeeper',
                  name: 'Tonkeeper',
                  imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
                  aboutUrl: 'https://tonkeeper.com',
                  universalLink: 'https://app.tonkeeper.com/ton-connect',
                  bridgeUrl: 'https://bridge.tonapi.io/bridge',
                  platforms: ['ios', 'android', 'chrome', 'firefox', 'safari'],
                },
              ],
            }}
          >
            <LazyTonHooksBridge>
              {children}
            </LazyTonHooksBridge>
          </LazyTonConnectUIProvider>
        </Suspense>
      </TonLazyContext.Provider>
    );
  }

  // Before loading: render with null stubs
  return (
    <TonLazyContext.Provider value={contextValue}>
      <TonHooksContext.Provider value={nullStubs}>
        {children}
      </TonHooksContext.Provider>
    </TonLazyContext.Provider>
  );
}
