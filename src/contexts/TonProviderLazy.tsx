/**
 * Lazy TON Connect Provider
 * 
 * TON Connect eagerly fetches 30+ wallet icons from config.ton.org (~487KB)
 * This wrapper defers loading until the user explicitly requests TON connection
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, Suspense, lazy, useRef } from 'react';

// Context to control lazy TON provider loading
interface TonLazyContextType {
  isTonLoaded: boolean;
  loadTonProvider: () => void;
  tonConnectUI: any | null;
  tonWallet: any | null;
  tonAddress: string | null;
}

const TonLazyContext = createContext<TonLazyContextType>({
  isTonLoaded: false,
  loadTonProvider: () => {},
  tonConnectUI: null,
  tonWallet: null,
  tonAddress: null,
});

export function useTonLazy() {
  return useContext(TonLazyContext);
}

// Lazy load the actual TON provider
const LazyTonConnectUIProvider = lazy(() => 
  import('@tonconnect/ui-react').then(m => ({ 
    default: m.TonConnectUIProvider 
  }))
);

interface TonProviderLazyProps {
  children: ReactNode;
}

// Inner component that uses TON hooks once provider is loaded
function TonHooksProvider({ children, onHooksReady }: { children: ReactNode; onHooksReady: (hooks: { tonConnectUI: any; tonWallet: any; tonAddress: string | null }) => void }) {
  // Dynamically import and use hooks
  const [hooks, setHooks] = useState<{ useTonConnectUI: any; useTonWallet: any; useTonAddress: any } | null>(null);
  
  useEffect(() => {
    import('@tonconnect/ui-react').then(m => {
      setHooks({
        useTonConnectUI: m.useTonConnectUI,
        useTonWallet: m.useTonWallet,
        useTonAddress: m.useTonAddress,
      });
    });
  }, []);
  
  // Use hooks when available
  const tonConnectUIResult = hooks?.useTonConnectUI?.();
  const tonWallet = hooks?.useTonWallet?.();
  const tonAddress = hooks?.useTonAddress?.();
  
  const tonConnectUI = tonConnectUIResult?.[0] ?? null;
  
  // Report hooks to parent
  useEffect(() => {
    if (hooks) {
      onHooksReady({
        tonConnectUI,
        tonWallet: tonWallet ?? null,
        tonAddress: tonAddress ?? null,
      });
    }
  }, [hooks, tonConnectUI, tonWallet, tonAddress, onHooksReady]);
  
  return <>{children}</>;
}

/**
 * TonProviderLazy - Wraps children and only loads TON Connect when requested
 * 
 * By default, children are rendered without TON Connect overhead.
 * When loadTonProvider() is called (e.g., user clicks Connect TON),
 * the full TON Connect provider is dynamically loaded.
 */
export function TonProviderLazy({ children }: TonProviderLazyProps) {
  const [isTonLoaded, setIsTonLoaded] = useState(false);
  const [tonHooks, setTonHooks] = useState<{ tonConnectUI: any; tonWallet: any; tonAddress: string | null }>({
    tonConnectUI: null,
    tonWallet: null,
    tonAddress: null,
  });
  
  const loadTonProvider = useCallback(() => {
    if (!isTonLoaded) {
      console.log('[TonProviderLazy] Loading TON Connect provider...');
      setIsTonLoaded(true);
    }
  }, [isTonLoaded]);

  const handleHooksReady = useCallback((hooks: { tonConnectUI: any; tonWallet: any; tonAddress: string | null }) => {
    setTonHooks(hooks);
  }, []);

  const contextValue: TonLazyContextType = {
    isTonLoaded,
    loadTonProvider,
    tonConnectUI: tonHooks.tonConnectUI,
    tonWallet: tonHooks.tonWallet,
    tonAddress: tonHooks.tonAddress,
  };

  if (isTonLoaded) {
    // Once loaded, wrap with actual TON provider
    return (
      <TonLazyContext.Provider value={contextValue}>
        <Suspense fallback={children}>
          <LazyTonConnectUIProvider 
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
            <TonHooksProvider onHooksReady={handleHooksReady}>
              {children}
            </TonHooksProvider>
          </LazyTonConnectUIProvider>
        </Suspense>
      </TonLazyContext.Provider>
    );
  }

  // Before loading: render children without TON overhead
  return (
    <TonLazyContext.Provider value={contextValue}>
      {children}
    </TonLazyContext.Provider>
  );
}
