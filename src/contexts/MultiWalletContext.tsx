import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Chain, getChainByChainId, getPrimaryChain } from '@/data/chains';

// Solana
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletName, type Adapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile';
import { Connection } from '@solana/web3.js';

// Sui
import { SuiClientProvider, WalletProvider as SuiWalletProvider, useCurrentWallet, useCurrentAccount, useDisconnectWallet, useConnectWallet, useSuiClient, useWallets } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// TON
import { TonConnectUIProvider, useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

// WalletConnect / Wagmi
import { connect as wagmiConnect, disconnect as wagmiDisconnect, getAccount, watchAccount, switchChain } from '@wagmi/core';
import { walletConnect } from '@wagmi/connectors';
import { wagmiConfig, WALLETCONNECT_PROJECT_ID } from '@/config/walletconnect';
import { supabase } from '@/integrations/supabase/client';

// Utilities
import { 
  isMobileBrowser, 
  isInWalletBrowser, 
  isEvmWalletAvailable, 
  isSolanaWalletAvailable,
  isTronWalletAvailable,
  openWalletDeeplink 
} from '@/lib/wallet-deeplinks';

// Types
export type ChainType = 'evm' | 'solana' | 'tron' | 'sui' | 'ton';
export type WalletType = 'okx' | 'metamask' | 'walletconnect' | 'phantom' | 'solflare' | 'tronlink' | 'tokenpocket' | 'sui-wallet' | 'tonkeeper' | null;

// Connection status for UI feedback
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MultiWalletContextType {
  // Connection state per chain type
  evmAddress: string | null;
  solanaAddress: string | null;
  tronAddress: string | null;
  suiAddress: string | null;
  tonAddress: string | null;
  
  // Current active chain/address (based on selected chain)
  activeChainType: ChainType;
  activeAddress: string | null;
  isConnected: boolean;
  
  // EVM-specific
  evmChainId: number | null;
  evmChain: Chain | null;
  evmWalletType: WalletType;
  
  // Connection status
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  
  // Wallet availability
  isWalletAvailable: (walletId: string) => boolean;
  
  // Methods
  connectEvm: (preferredWallet?: WalletType, useWalletConnect?: boolean) => Promise<boolean>;
  connectSolana: (preferredWallet?: 'phantom' | 'solflare') => Promise<boolean>;
  connectTron: (preferredWallet?: 'tronlink' | 'tokenpocket') => Promise<boolean>;
  connectSui: () => Promise<boolean>;
  connectTon: () => Promise<boolean>;
  disconnect: () => void;
  switchEvmChain: (chainId: number) => Promise<void>;
  
  // Deep-link for mobile
  openInWallet: (walletId: string) => void;
  
  // Chain-specific providers
  getEvmProvider: () => any;
  getSolanaConnection: () => Connection | null;
  getSolanaWallet: () => any;
  getTronWeb: () => any;
  getSuiClient: () => any;
  
  // Active chain selection
  setActiveChain: (chain: Chain) => void;
  activeChain: Chain;
  
  // Check if connected to specific chain
  isConnectedToChain: (chain: Chain) => boolean;
}

const MultiWalletContext = createContext<MultiWalletContextType | undefined>(undefined);

declare global {
  interface Window {
    okxwallet?: any;
    ethereum?: any;
    tronWeb?: any;
    tronLink?: any;
  }
}

// Solana configuration
const solanaNetwork = WalletAdapterNetwork.Mainnet;
const solanaEndpoint = 'https://api.mainnet-beta.solana.com';

// Sui configuration  
const suiNetworks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
};

interface MultiWalletProviderProps {
  children: ReactNode;
}

// Inner provider that has access to all wallet hooks
function MultiWalletProviderInner({ children }: MultiWalletProviderProps) {
  // EVM state
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [evmChainId, setEvmChainId] = useState<number | null>(null);
  const [evmWalletType, setEvmWalletType] = useState<WalletType>(null);
  const [useWagmi, setUseWagmi] = useState(false);
  
  // Tron state (manual)
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  
  // Common state
  const [activeChain, setActiveChain] = useState<Chain>(getPrimaryChain());
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Keep a stable WalletConnect connector instance to avoid modal / session issues.
  const wcConnectorRef = useRef<ReturnType<typeof walletConnect> | null>(null);
  const wcProjectIdRef = useRef<string>('');
  
  // Track TON connection state separately
  const tonConnectionStarted = useRef(false);
  
  // Solana wallet hooks
  const solanaWallet = useSolanaWallet();
  const solanaAddress = solanaWallet.publicKey?.toBase58() || null;
  
  // Sui wallet hooks  
  const suiCurrentWallet = useCurrentWallet();
  const suiWallets = useWallets();
  const suiAccount = useCurrentAccount();
  const suiDisconnect = useDisconnectWallet();
  const suiConnect = useConnectWallet();
  const suiClient = useSuiClient();
  const suiAddress = suiAccount?.address || null;
  
  // TON wallet hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddressRaw = useTonAddress();
  const tonAddress = tonAddressRaw || null;

  const evmChain = evmChainId ? getChainByChainId(evmChainId) : null;

  // Determine active chain type
  const activeChainType: ChainType = useMemo(() => {
    if (!activeChain.isEvm) {
      const name = activeChain.name.toLowerCase();
      if (name.includes('solana')) return 'solana';
      if (name.includes('tron')) return 'tron';
      if (name.includes('sui')) return 'sui';
      if (name.includes('ton')) return 'ton';
    }
    return 'evm';
  }, [activeChain]);

  // Get active address based on chain type
  const activeAddress = useMemo(() => {
    switch (activeChainType) {
      case 'solana': return solanaAddress;
      case 'tron': return tronAddress;
      case 'sui': return suiAddress;
      case 'ton': return tonAddress;
      default: return evmAddress;
    }
  }, [activeChainType, evmAddress, solanaAddress, tronAddress, suiAddress, tonAddress]);

  const isConnected = !!activeAddress;

  // Check wallet availability
  const isWalletAvailable = useCallback((walletId: string): boolean => {
    switch (walletId) {
      case 'okx':
      case 'metamask':
        return isEvmWalletAvailable(walletId);
      case 'phantom':
      case 'solflare':
        return isSolanaWalletAvailable(walletId);
      case 'tronlink':
      case 'tokenpocket':
        return isTronWalletAvailable();
      case 'sui-wallet':
        return suiWallets.length > 0;
      case 'tonkeeper':
        return true; // TON uses QR/deeplink, always "available"
      default:
        return false;
    }
  }, [suiWallets.length]);

  // Open wallet deep-link
  const openInWallet = useCallback((walletId: string) => {
    openWalletDeeplink(walletId);
  }, []);

  // Check if connected to a specific chain
  const isConnectedToChain = useCallback((chain: Chain): boolean => {
    if (chain.isEvm) {
      return !!evmAddress && evmChainId === chain.chainId;
    }
    const name = chain.name.toLowerCase();
    if (name.includes('solana')) return !!solanaAddress;
    if (name.includes('tron')) return !!tronAddress;
    if (name.includes('sui')) return !!suiAddress;
    if (name.includes('ton')) return !!tonAddress;
    return false;
  }, [evmAddress, evmChainId, solanaAddress, tronAddress, suiAddress, tonAddress]);

  // EVM provider
  const getEvmProvider = useCallback(() => {
    if (evmWalletType === 'okx' && window.okxwallet) return window.okxwallet;
    if (evmWalletType === 'metamask' && window.ethereum) return window.ethereum;
    return window.ethereum || null;
  }, [evmWalletType]);

  // Solana connection
  const solanaConnection = useMemo(() => new Connection(solanaEndpoint), []);
  const getSolanaConnection = useCallback(() => solanaConnection, [solanaConnection]);
  const getSolanaWallet = useCallback(() => solanaWallet, [solanaWallet]);

  // Tron provider
  const getTronWeb = useCallback(() => window.tronWeb || null, []);

  // Sui client
  const getSuiClient = useCallback(() => suiClient, [suiClient]);

  // EVM handlers
  const handleEvmAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setEvmAddress(null);
      setEvmWalletType(null);
      setConnectionStatus('disconnected');
      localStorage.removeItem('evmWalletConnected');
      localStorage.removeItem('evmWalletType');
    } else {
      setEvmAddress(accounts[0]);
      setConnectionStatus('connected');
    }
  }, []);

  const handleEvmChainChanged = useCallback((chainIdHex: string) => {
    setEvmChainId(parseInt(chainIdHex, 16));
  }, []);

  // Connect EVM with improved detection
  const connectEvm = useCallback(async (preferredWallet?: WalletType, useWalletConnectModal?: boolean): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Option 1: Use WalletConnect when explicitly requested
      if (useWalletConnectModal) {
        // NOTE: In Lovable preview, Vite env vars may not hot-reload reliably.
        // If the build-time value is empty, we fetch it from the backend (safe: projectId is public).
        let projectId = WALLETCONNECT_PROJECT_ID || '';

        if (!projectId) {
          projectId = localStorage.getItem('walletconnectProjectId') || '';
        }

        if (!projectId) {
          const { data, error } = await supabase.functions.invoke('walletconnect-config');
          const fetched = (data as any)?.projectId as string | undefined;
          if (!error && fetched) {
            projectId = fetched;
            localStorage.setItem('walletconnectProjectId', fetched);
          }
        }

        if (!projectId) {
          throw new Error('WalletConnect is not configured. Please set up your project ID.');
        }

        if (!wcConnectorRef.current || wcProjectIdRef.current !== projectId) {
          wcConnectorRef.current = walletConnect({
            projectId,
            showQrModal: true,
            metadata: {
              name: 'XLama Exchange',
              description: 'Multi-chain DEX Aggregator',
              url: typeof window !== 'undefined' ? window.location.origin : 'https://xlama.exchange',
              icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : ''],
            },
          });
          wcProjectIdRef.current = projectId;
        }

        const result = await wagmiConnect(wagmiConfig, {
          connector: wcConnectorRef.current!,
        });

        if (result.accounts?.[0]) {
          setEvmAddress(result.accounts[0]);
          setEvmChainId(result.chainId);
          setEvmWalletType('walletconnect');
          setUseWagmi(true);
          setConnectionStatus('connected');
          localStorage.setItem('evmWalletConnected', 'true');
          localStorage.setItem('evmWalletType', 'walletconnect');
          return true;
        }
        throw new Error('WalletConnect connection failed. Please try again.');
      }

      // Option 2: Use injected provider
      let provider: any = null;
      let selectedWalletType: WalletType = null;

      if (preferredWallet === 'okx') {
        if (window.okxwallet) {
          provider = window.okxwallet;
          selectedWalletType = 'okx';
        } else if (isMobileBrowser()) {
          // Open OKX deep-link on mobile
          openWalletDeeplink('okx');
          setIsConnecting(false);
          setConnectionStatus('disconnected');
          return false;
        } else {
          throw new Error('OKX Wallet is not installed. Please install from okx.com/web3');
        }
      } else if (preferredWallet === 'metamask') {
        if (window.ethereum && (window.ethereum as any).isMetaMask) {
          provider = window.ethereum;
          selectedWalletType = 'metamask';
        } else if (isMobileBrowser()) {
          // Open MetaMask deep-link on mobile
          openWalletDeeplink('metamask');
          setIsConnecting(false);
          setConnectionStatus('disconnected');
          return false;
        } else {
          throw new Error('MetaMask is not installed. Please install from metamask.io');
        }
      } else {
        // Try OKX first, then MetaMask, then any ethereum provider
        if (window.okxwallet) {
          provider = window.okxwallet;
          selectedWalletType = 'okx';
        } else if (window.ethereum) {
          provider = window.ethereum;
          selectedWalletType = (window.ethereum as any).isMetaMask ? 'metamask' : 'metamask';
        }
      }

      if (!provider) {
        if (isMobileBrowser()) {
          // On mobile without provider, suggest WalletConnect
          throw new Error('No wallet detected. Use WalletConnect or open this site in your wallet app.');
        }
        throw new Error('No EVM wallet detected. Please install OKX Wallet or MetaMask.');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      setEvmAddress(accounts[0]);
      setEvmChainId(currentChainId);
      setEvmWalletType(selectedWalletType);
      setUseWagmi(false);
      setConnectionStatus('connected');

      provider.on('accountsChanged', handleEvmAccountsChanged);
      provider.on('chainChanged', handleEvmChainChanged);

      localStorage.setItem('evmWalletConnected', 'true');
      localStorage.setItem('evmWalletType', selectedWalletType || '');
      
      return true;
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [handleEvmAccountsChanged, handleEvmChainChanged]);

  // Connect Solana with specific wallet selection
  const connectSolana = useCallback(async (preferredWallet?: 'phantom' | 'solflare'): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      const isMobileExternalBrowser = isMobileBrowser() && !isInWalletBrowser();

      // If user taps Phantom on a mobile browser (not inside a wallet), use Solana Mobile Wallet Adapter (MWA)
      // so Phantom can connect via the wallet app without requiring the in-wallet browser.
      let targetWallet =
        preferredWallet === 'phantom' && isMobileExternalBrowser
          ? solanaWallet.wallets.find((w) => w.adapter.name.toLowerCase().includes('mobile'))
          : undefined;

      // Otherwise, find the preferred wallet adapter
      if (!targetWallet) {
        targetWallet = solanaWallet.wallets.find((w) => {
          const name = w.adapter.name.toLowerCase();
          if (preferredWallet === 'phantom') return name.includes('phantom');
          if (preferredWallet === 'solflare') return name.includes('solflare');
          return false;
        });
      }

      // If preferred wallet not found
      if (preferredWallet && !targetWallet) {
        // Check if wallet is available as injected
        if (!isSolanaWalletAvailable(preferredWallet)) {
          if (isMobileBrowser()) {
            // Open deep-link on mobile
            openWalletDeeplink(preferredWallet);
            setIsConnecting(false);
            setConnectionStatus('disconnected');
            return false;
          } else {
            const walletName = preferredWallet === 'phantom' ? 'Phantom' : 'Solflare';
            throw new Error(`${walletName} is not installed. Please install from ${preferredWallet}.app`);
          }
        }
      }

      // Use target wallet or first available
      if (targetWallet) {
        await solanaWallet.select(targetWallet.adapter.name as WalletName);
      } else if (solanaWallet.wallets.length > 0) {
        await solanaWallet.select(solanaWallet.wallets[0].adapter.name as WalletName);
      } else {
        throw new Error('No Solana wallet detected. Please install Phantom or Solflare.');
      }
      
      await solanaWallet.connect();
      setConnectionStatus('connected');
      return true;
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [solanaWallet]);

  // Connect Tron with improved detection
  const connectTron = useCallback(async (preferredWallet?: 'tronlink' | 'tokenpocket'): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      if (!isTronWalletAvailable()) {
        if (isMobileBrowser()) {
          // Open deep-link on mobile
          openWalletDeeplink(preferredWallet || 'tronlink');
          setIsConnecting(false);
          setConnectionStatus('disconnected');
          return false;
        }
        throw new Error('No Tron wallet detected. Please install TronLink.');
      }

      if (window.tronLink) {
        const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (res.code === 200) {
          setTronAddress(window.tronLink.tronWeb.defaultAddress.base58);
          setConnectionStatus('connected');
          localStorage.setItem('tronWalletConnected', 'true');
          return true;
        } else {
          throw new Error('TronLink connection rejected');
        }
      } else if (window.tronWeb?.defaultAddress?.base58) {
        setTronAddress(window.tronWeb.defaultAddress.base58);
        setConnectionStatus('connected');
        localStorage.setItem('tronWalletConnected', 'true');
        return true;
      }
      
      throw new Error('Failed to connect to Tron wallet');
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect Sui with improved detection
  const connectSui = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      if (suiWallets.length > 0) {
        await suiConnect.mutateAsync({ wallet: suiWallets[0] });
        setConnectionStatus('connected');
        return true;
      } else {
        if (isMobileBrowser()) {
          throw new Error('No Sui wallet detected. Please open this site in the Sui Wallet app browser.');
        }
        throw new Error('No Sui wallet detected. Please install the Sui Wallet extension.');
      }
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [suiConnect, suiWallets]);

  // Connect TON - now just returns, actual connection handled by TonWalletPicker
  const connectTon = useCallback(async (): Promise<boolean> => {
    // Don't set connecting here - let TonWalletPicker handle it
    // This just signals that TON connection flow should start
    tonConnectionStarted.current = true;
    return false; // Return false because connection isn't complete yet
  }, []);

  // Watch for TON connection success
  useEffect(() => {
    if (!tonConnectUI) return;

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet && tonConnectionStarted.current) {
        tonConnectionStarted.current = false;
        setConnectionStatus('connected');
      } else if (!wallet) {
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  // Disconnect all
  const disconnect = useCallback(() => {
    // EVM - legacy provider
    const evmProvider = getEvmProvider();
    if (evmProvider && !useWagmi) {
      evmProvider.removeListener('accountsChanged', handleEvmAccountsChanged);
      evmProvider.removeListener('chainChanged', handleEvmChainChanged);
    }
    
    // EVM - wagmi
    if (useWagmi) {
      wagmiDisconnect(wagmiConfig);
    }
    
    setEvmAddress(null);
    setEvmChainId(null);
    setEvmWalletType(null);
    setUseWagmi(false);
    localStorage.removeItem('evmWalletConnected');
    localStorage.removeItem('evmWalletType');

    // Solana
    if (solanaWallet.connected) {
      solanaWallet.disconnect();
    }

    // Tron
    setTronAddress(null);
    localStorage.removeItem('tronWalletConnected');

    // Sui
    if (suiCurrentWallet.isConnected) {
      suiDisconnect.mutate();
    }

    // TON
    if (tonWallet) {
      tonConnectUI.disconnect();
    }

    setError(null);
    setConnectionStatus('disconnected');
  }, [getEvmProvider, useWagmi, handleEvmAccountsChanged, handleEvmChainChanged, solanaWallet, suiCurrentWallet.isConnected, suiDisconnect, tonConnectUI, tonWallet]);

  // Switch EVM chain
  const switchEvmChain = useCallback(async (targetChainId: number) => {
    if (useWagmi) {
      // Use wagmi for chain switching
      await switchChain(wagmiConfig, { chainId: targetChainId as any });
      return;
    }

    const provider = getEvmProvider();
    if (!provider) throw new Error('No wallet connected');

    const targetChain = getChainByChainId(targetChainId);
    if (!targetChain) throw new Error('Unsupported chain');
    if (!targetChain.isEvm) throw new Error('Not an EVM chain');

    const chainIdHex = `0x${targetChainId.toString(16)}`;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: targetChain.name,
            nativeCurrency: targetChain.nativeCurrency,
            rpcUrls: [targetChain.rpcUrl],
            blockExplorerUrls: [targetChain.blockExplorer],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, [getEvmProvider, useWagmi]);

  // Auto-reconnect EVM
  useEffect(() => {
    const wasConnected = localStorage.getItem('evmWalletConnected') === 'true';
    const savedWalletType = localStorage.getItem('evmWalletType') as WalletType;

    if (wasConnected && savedWalletType) {
      const timeout = setTimeout(() => {
        if (savedWalletType === 'walletconnect') {
          // Re-check wagmi account for WalletConnect
          const account = getAccount(wagmiConfig);
          if (account.address) {
            setEvmAddress(account.address);
            setEvmChainId(account.chainId ?? null);
            setEvmWalletType('walletconnect');
            setUseWagmi(true);
            setConnectionStatus('connected');
          }
        } else {
          connectEvm(savedWalletType).catch(() => {
            localStorage.removeItem('evmWalletConnected');
            localStorage.removeItem('evmWalletType');
          });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Watch wagmi account changes
  useEffect(() => {
    if (!useWagmi) return;
    
    const unwatch = watchAccount(wagmiConfig, {
      onChange: (account) => {
        if (account.address) {
          setEvmAddress(account.address);
          setEvmChainId(account.chainId ?? null);
        } else {
          setEvmAddress(null);
          setEvmChainId(null);
          setEvmWalletType(null);
          setUseWagmi(false);
        }
      },
    });

    return () => unwatch();
  }, [useWagmi]);

  // Auto-reconnect Tron
  useEffect(() => {
    const wasConnected = localStorage.getItem('tronWalletConnected') === 'true';
    if (wasConnected && window.tronWeb?.defaultAddress?.base58) {
      setTronAddress(window.tronWeb.defaultAddress.base58);
      setConnectionStatus('connected');
    }
  }, []);

  const value: MultiWalletContextType = {
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress,
    activeChainType,
    activeAddress,
    isConnected,
    evmChainId,
    evmChain,
    evmWalletType,
    isConnecting,
    connectionStatus,
    error,
    isWalletAvailable,
    connectEvm,
    connectSolana,
    connectTron,
    connectSui,
    connectTon,
    disconnect,
    switchEvmChain,
    openInWallet,
    getEvmProvider,
    getSolanaConnection,
    getSolanaWallet,
    getTronWeb,
    getSuiClient,
    setActiveChain,
    activeChain,
    isConnectedToChain,
  };

  return (
    <MultiWalletContext.Provider value={value}>
      {children}
    </MultiWalletContext.Provider>
  );
}

// Outer provider wrapping all wallet SDKs
export function MultiWalletProvider({ children }: MultiWalletProviderProps) {
  // Solana wallets
  const solanaWallets = useMemo(() => {
    const wallets: Adapter[] = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

    // Enable Solana Mobile Wallet Adapter (MWA) for mobile browsers (external), to support Phantom mobile connect.
    if (isMobileBrowser() && !isInWalletBrowser()) {
      wallets.unshift(
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
          cluster: solanaNetwork,
          appIdentity: {
            name: 'XLama Exchange',
            uri: window.location.origin,
            icon: `${window.location.origin}/favicon.ico`,
          },
        }) as unknown as Adapter
      );
    }

    return wallets;
  }, []);

  return (
    <ConnectionProvider endpoint={solanaEndpoint}>
      <SolanaWalletProvider wallets={solanaWallets} autoConnect>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
          <SuiWalletProvider autoConnect>
            <TonConnectUIProvider 
              manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
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
              <MultiWalletProviderInner>
                {children}
              </MultiWalletProviderInner>
            </TonConnectUIProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export function useMultiWallet() {
  const context = useContext(MultiWalletContext);
  if (context === undefined) {
    throw new Error('useMultiWallet must be used within a MultiWalletProvider');
  }
  return context;
}
