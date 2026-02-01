/**
 * Lazy TON Connect Provider with Hooks Bridge
 * 
 * TON Connect eagerly fetches 30+ wallet icons from config.ton.org (~487KB)
 * This wrapper defers loading until the user explicitly requests TON connection.
 * 
 * The TonHooksBridge pattern provides null stubs when TON isn't loaded,
 * avoiding React "Rules of Hooks" violations in consuming components.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, Suspense, lazy, useEffect, useRef } from 'react';

// Helper to safely get origin (SSR-safe)
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

// ============= Bridged Hooks Context =============
// Provides TON hook values when loaded, or null stubs when not

interface TonHooksContextType {
  tonConnectUI: any | null;
  tonWallet: any | null;
  tonAddress: string | null;
}

const TonHooksContext = createContext<TonHooksContextType>({
  tonConnectUI: null,
  tonWallet: null,
  tonAddress: null,
});

/**
 * Hook to consume TON state from the bridge
 * Returns null values when TON provider isn't loaded yet
 */
export function useTonHooksBridged() {
  return useContext(TonHooksContext);
}

// ============= Lazy Provider Component =============

const LazyTonConnectUIProvider = lazy(() => 
  import('@tonconnect/ui-react').then(m => ({ 
    default: m.TonConnectUIProvider 
  }))
);

// ============= Inner Provider that uses actual TON hooks =============

/**
 * TonHooksProvider - Only rendered when TON is loaded
 * Uses real TON hooks and provides values via context
 */
function TonHooksProviderInner({ children }: { children: ReactNode }) {
  // Dynamic import of hooks - only called when this component renders
  const [tonConnectUI, setTonConnectUI] = useState<any>(null);
  const [tonWallet, setTonWallet] = useState<any>(null);
  const [tonAddress, setTonAddress] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Dynamic import of the hooks module
    import('@tonconnect/ui-react').then((tonModule) => {
      // Create a small component to extract hook values
      // This is a workaround since we can't call hooks directly in useEffect
      const TonHooksExtractor = () => {
        const [ui] = tonModule.useTonConnectUI();
        const wallet = tonModule.useTonWallet();
        const address = tonModule.useTonAddress();
        
        useEffect(() => {
          setTonConnectUI(ui);
          setTonWallet(wallet);
          setTonAddress(address || null);
        }, [ui, wallet, address]);
        
        return null;
      };
      
      // We need to render this extractor - but we're already inside the provider
      // So the hooks should work. Let's use a different approach.
    });
  }, []);

  return (
    <TonHooksContext.Provider value={{ tonConnectUI, tonWallet, tonAddress }}>
      {children}
    </TonHooksContext.Provider>
  );
}

/**
 * TonHooksProvider - Wrapper that uses actual TON hooks
 * Must be rendered inside TonConnectUIProvider
 */
function TonHooksProvider({ children }: { children: ReactNode }) {
  // We need to dynamically use the hooks, but hooks can't be conditionally called
  // So we create a component that always renders inside the provider
  return (
    <TonHooksBridge>
      {children}
    </TonHooksBridge>
  );
}

/**
 * TonHooksBridge - Actually uses the TON hooks
 * This component is only rendered when TonConnectUIProvider is active
 */
function TonHooksBridge({ children }: { children: ReactNode }) {
  // These hooks are safe to call because we're inside TonConnectUIProvider
  const { useTonConnectUI, useTonWallet, useTonAddress } = require('@tonconnect/ui-react');
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

// ============= Main Lazy Provider =============

interface TonProviderLazyProps {
  children: ReactNode;
}

/**
 * TonProviderLazy - Defers TON Connect loading until explicitly requested
 * 
 * By default, children are rendered without TON Connect overhead.
 * When loadTonProvider() is called (e.g., user clicks Connect TON),
 * the full TON Connect provider is dynamically loaded.
 */
export function TonProviderLazy({ children }: TonProviderLazyProps) {
  const [isTonLoaded, setIsTonLoaded] = useState(false);
  
  const loadTonProvider = useCallback(() => {
    if (!isTonLoaded) {
      console.log('[TonProviderLazy] Loading TON Connect provider...');
      setIsTonLoaded(true);
    }
  }, [isTonLoaded]);

  const contextValue = { isTonLoaded, loadTonProvider };

  if (isTonLoaded) {
    // Once loaded, wrap with actual TON provider and hooks bridge
    return (
      <TonLazyContext.Provider value={contextValue}>
        <Suspense fallback={
          <TonHooksContext.Provider value={{ tonConnectUI: null, tonWallet: null, tonAddress: null }}>
            {children}
          </TonHooksContext.Provider>
        }>
          <LazyTonConnectUIProvider 
            manifestUrl={`${getOrigin()}/tonconnect-manifest.json`}
            actionsConfiguration={{ 
              twaReturnUrl: getOrigin() as `${string}://${string}` 
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
            <TonHooksBridge>
              {children}
            </TonHooksBridge>
          </LazyTonConnectUIProvider>
        </Suspense>
      </TonLazyContext.Provider>
    );
  }

  // Before loading: render children with null stubs for TON hooks
  return (
    <TonLazyContext.Provider value={contextValue}>
      <TonHooksContext.Provider value={{ tonConnectUI: null, tonWallet: null, tonAddress: null }}>
        {children}
      </TonHooksContext.Provider>
    </TonLazyContext.Provider>
  );
}
