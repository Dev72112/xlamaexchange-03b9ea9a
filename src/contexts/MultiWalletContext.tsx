import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Chain, getChainByChainId, getPrimaryChain, SUPPORTED_CHAINS } from '@/data/chains';

// AppKit hooks
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import { wagmiConfig } from '@/config/appkit';
import { switchChain, getWalletClient } from '@wagmi/core';

// Sui
import { SuiClientProvider, WalletProvider as SuiWalletProvider, useCurrentWallet, useCurrentAccount, useDisconnectWallet, useConnectWallet, useSuiClient, useWallets, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// TON
import { TonConnectUIProvider, useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

// Utilities
import { 
  isMobileBrowser, 
  isInWalletBrowser, 
  isEvmWalletAvailable, 
  isSolanaWalletAvailable,
  isTronWalletAvailable,
  openWalletDeeplink 
} from '@/lib/wallet-deeplinks';

// Session management
import { 
  saveWalletSession, 
  getWalletSession, 
  clearWalletSession, 
  isSessionValid,
  updateActiveChain,
  updateChainConnection 
} from '@/lib/walletSession';
import { clearAllSessionAuth } from '@/lib/sessionAuth';

// Types
export type ChainType = 'evm' | 'solana' | 'tron' | 'sui' | 'ton';
export type WalletType = 'okx' | 'metamask' | 'walletconnect' | 'phantom' | 'solflare' | 'tronlink' | 'sui-wallet' | 'suiet' | 'tonkeeper' | null;
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MultiWalletContextType {
  // Connection state per chain type
  evmAddress: string | null;
  solanaAddress: string | null;
  tronAddress: string | null;
  suiAddress: string | null;
  tonAddress: string | null;
  
  // Current active chain/address
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
  
  // Methods - AppKit handles EVM/Solana
  openConnectModal: () => void;
  connectTron: (preferredWallet?: 'tronlink') => Promise<boolean>;
  connectSui: (preferredWallet?: string) => Promise<boolean>;
  connectTon: () => Promise<boolean>;
  disconnect: () => void;
  switchEvmChain: (chainId: number) => Promise<void>;
  
  // Deep-link for mobile
  openInWallet: (walletId: string) => void;
  
  // Chain-specific providers
  getEvmProvider: () => Promise<any>;
  getSolanaConnection: () => any;
  getSolanaWallet: () => any;
  getTronWeb: () => any;
  getSuiClient: () => any;
  getTonConnectUI: () => any;
  signAndExecuteSuiTransaction: (transaction: any) => Promise<any>;
  
  // Active chain selection
  setActiveChain: (chain: Chain) => void;
  activeChain: Chain;
  
  // Check if connected to specific chain
  isConnectedToChain: (chain: Chain) => boolean;
}

const MultiWalletContext = createContext<MultiWalletContextType | undefined>(undefined);

// Window type declarations
declare global {
  interface Window {
    okxwallet?: any;
    tronWeb?: any;
    tronLink?: any;
  }
}

// Sui configuration  
const suiNetworks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
};

interface MultiWalletProviderProps {
  children: ReactNode;
}

// Inner provider that has access to all wallet hooks
function MultiWalletProviderInner({ children }: MultiWalletProviderProps) {
  // AppKit hooks for EVM + Solana
  const { open: openAppKit } = useAppKit();
  const { address: appKitAddress, caipAddress, isConnected: appKitConnected, status: appKitStatus } = useAppKitAccount();
  const { caipNetwork, chainId: appKitChainId } = useAppKitNetwork();
  const { disconnect: disconnectAppKit } = useDisconnect();
  
  // Solana-specific from AppKit
  const { connection: solanaConnection } = useAppKitConnection();
  
  // Tron state (manual - not supported by AppKit)
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  
  // Common state - restore active chain from session
  const [activeChain, setActiveChainState] = useState<Chain>(() => {
    const session = getWalletSession();
    if (session && isSessionValid() && session.activeChainIndex) {
      const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === session.activeChainIndex);
      if (chain) return chain;
    }
    return getPrimaryChain();
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  // Wrapper to persist chain changes to session
  const setActiveChain = useCallback((chain: Chain) => {
    setActiveChainState(chain);
    const chainType = !chain.isEvm 
      ? (chain.name.toLowerCase().includes('solana') ? 'solana'
        : chain.name.toLowerCase().includes('tron') ? 'tron'
        : chain.name.toLowerCase().includes('sui') ? 'sui'
        : chain.name.toLowerCase().includes('ton') ? 'ton'
        : 'evm')
      : 'evm';
    updateActiveChain(chainType as ChainType, chain.chainIndex);
  }, []);
  
  // Sui wallet hooks  
  const suiCurrentWallet = useCurrentWallet();
  const suiWallets = useWallets();
  const suiAccount = useCurrentAccount();
  const suiDisconnect = useDisconnectWallet();
  const suiConnect = useConnectWallet();
  const suiClient = useSuiClient();
  const suiSignAndExecute = useSignAndExecuteTransaction();
  const suiAddress = suiAccount?.address || null;
  
  // TON wallet hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddressRaw = useTonAddress();
  const tonAddress = tonAddressRaw || null;

  // Derive addresses from AppKit's caipAddress
  const evmAddress = useMemo(() => {
    if (!caipAddress) return null;
    // caipAddress format: "eip155:1:0x..."
    if (caipAddress.startsWith('eip155:')) {
      return caipAddress.split(':')[2] || null;
    }
    return null;
  }, [caipAddress]);

  const solanaAddress = useMemo(() => {
    if (!caipAddress) return null;
    // caipAddress format: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:..."
    if (caipAddress.startsWith('solana:')) {
      const parts = caipAddress.split(':');
      return parts[2] || null;
    }
    return null;
  }, [caipAddress]);

  // Get EVM chain ID from AppKit
  const evmChainId = useMemo(() => {
    if (!caipNetwork) return null;
    // caipNetwork.id is the numeric chain ID
    return typeof appKitChainId === 'number' ? appKitChainId : null;
  }, [caipNetwork, appKitChainId]);

  const evmChain = evmChainId ? getChainByChainId(evmChainId) : null;
  
  // Determine wallet type from connection
  const evmWalletType: WalletType = useMemo(() => {
    if (!evmAddress) return null;
    return 'walletconnect'; // AppKit uses WalletConnect protocol
  }, [evmAddress]);

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

  // Update connection status and persist to session
  useEffect(() => {
    if (appKitStatus === 'connecting') {
      setConnectionStatus('connecting');
      setIsConnecting(true);
    } else if (appKitConnected && appKitAddress) {
      setConnectionStatus('connected');
      setIsConnecting(false);
      // Persist EVM/Solana connection to session
      if (evmAddress) updateChainConnection('evm', true);
      if (solanaAddress) updateChainConnection('solana', true);
    } else {
      // Only set disconnected if we're not connected to any chain
      if (!suiAddress && !tonAddress && !tronAddress) {
        setConnectionStatus('disconnected');
      }
      setIsConnecting(false);
    }
  }, [appKitStatus, appKitConnected, appKitAddress, evmAddress, solanaAddress, suiAddress, tonAddress, tronAddress]);

  // Track Sui connection
  useEffect(() => {
    if (suiAddress) {
      updateChainConnection('sui', true);
      setConnectionStatus('connected');
    }
  }, [suiAddress]);

  // Track TON connection
  useEffect(() => {
    if (tonAddress) {
      updateChainConnection('ton', true);
      setConnectionStatus('connected');
    }
  }, [tonAddress]);

  // Track Tron connection
  useEffect(() => {
    if (tronAddress) {
      updateChainConnection('tron', true);
      setConnectionStatus('connected');
    }
  }, [tronAddress]);

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
        return true;
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

  // Open AppKit modal (for EVM/Solana)
  const openConnectModal = useCallback(() => {
    openAppKit();
  }, [openAppKit]);

  // Get EVM provider from wagmi
  const getEvmProvider = useCallback(async () => {
    if (!evmChainId) return null;
    try {
      const walletClient = await getWalletClient(wagmiConfig, { chainId: evmChainId as any });
      if (walletClient) {
        return {
          request: async (args: { method: string; params?: any[] }) => {
            return walletClient.transport.request(args as any);
          },
        };
      }
    } catch (e) {
      console.warn('EVM provider unavailable:', e);
    }
    return null;
  }, [evmChainId]);

  // Solana connection - AppKit handles wallet provider internally
  const getSolanaConnection = useCallback(() => solanaConnection, [solanaConnection]);
  const getSolanaWallet = useCallback(() => null, []); // AppKit manages Solana signing

  // Tron provider
  const getTronWeb = useCallback(() => window.tronWeb || null, []);

  // Sui client
  const getSuiClient = useCallback(() => suiClient, [suiClient]);
  
  // TON Connect UI for transactions
  const getTonConnectUI = useCallback(() => tonConnectUI, [tonConnectUI]);
  
  // Sui signAndExecuteTransaction wrapper
  const signAndExecuteSuiTransaction = useCallback(async (transaction: any) => {
    return suiSignAndExecute.mutateAsync({ transaction });
  }, [suiSignAndExecute]);

  // Connect Tron (manual - not supported by AppKit)
  const connectTron = useCallback(async (preferredWallet?: 'tronlink'): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      if (isMobileBrowser() && !isInWalletBrowser()) {
        openWalletDeeplink('tronlink');
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        return false;
      }

      if (!isTronWalletAvailable()) {
        throw new Error('TronLink is not installed. Please install from tronlink.org');
      }

      if (window.tronLink) {
        const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (res.code === 200) {
          const address = window.tronLink.tronWeb?.defaultAddress?.base58;
          if (address) {
            setTronAddress(address);
            setConnectionStatus('connected');
            localStorage.setItem('tronWalletConnected', 'true');
            return true;
          }
        } else if (res.code === 4001) {
          throw new Error('TronLink connection rejected by user');
        } else {
          throw new Error(`TronLink connection failed: ${res.message || 'Unknown error'}`);
        }
      }
      
      if (window.tronWeb?.defaultAddress?.base58) {
        setTronAddress(window.tronWeb.defaultAddress.base58);
        setConnectionStatus('connected');
        localStorage.setItem('tronWalletConnected', 'true');
        return true;
      }
      
      throw new Error('Failed to connect to TronLink. Please unlock your wallet.');
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect Sui
  const connectSui = useCallback(async (preferredWallet?: string): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);
    
    try {
      if (suiWallets.length > 0) {
        const normalizedPref = preferredWallet?.replace('-wallet', '').replace('-', '').toLowerCase();
        
        let targetWallet = preferredWallet
          ? suiWallets.find((w) => {
              const wName = w.name.toLowerCase().replace(/\s+/g, '');
              return wName.includes(normalizedPref || '') || normalizedPref?.includes(wName);
            })
          : null;
        
        if (!targetWallet) {
          targetWallet = suiWallets[0];
        }
        
        await suiConnect.mutateAsync({ wallet: targetWallet });
        setConnectionStatus('connected');
        return true;
      } else {
        if (isMobileBrowser()) {
          throw new Error('No Sui wallet detected. Please open this site in the Sui Wallet app browser.');
        }
        throw new Error('No Sui wallet detected. Please install Sui Wallet or Suiet extension.');
      }
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [suiConnect, suiWallets]);

  // Connect TON - signals to open TonWalletPicker
  const connectTon = useCallback(async (): Promise<boolean> => {
    return false; // TonWalletPicker handles the actual connection
  }, []);

  // Watch for TON connection and capture tonProof
  useEffect(() => {
    if (!tonConnectUI) return;
    
    // Request tonProof during connection for secure signed operations
    const payload = crypto.randomUUID();
    tonConnectUI.setConnectRequestParameters({
      state: 'ready',
      value: { tonProof: payload },
    });
    
    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        setConnectionStatus('connected');
        
        // Capture tonProof if available for signed operations
        if (wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
          const proof = wallet.connectItems.tonProof.proof;
          // Store the proof globally for use in signing operations
          import('@/hooks/useTonProof').then(({ setGlobalTonProof }) => {
            setGlobalTonProof({
              timestamp: proof.timestamp,
              domainLengthBytes: proof.domain.lengthBytes,
              domainValue: proof.domain.value,
              signature: proof.signature,
              payload: proof.payload,
              stateInit: wallet.account.walletStateInit || '',
              publicKey: wallet.account.publicKey || '',
            });
            console.log('[MultiWallet] Captured TON proof for signed operations');
          });
        }
      } else if (!evmAddress && !solanaAddress && !suiAddress && !tronAddress) {
        setConnectionStatus('disconnected');
        // Clear stored proof when disconnected
        import('@/hooks/useTonProof').then(({ setGlobalTonProof }) => {
          setGlobalTonProof(null);
        });
      }
    });
    return () => unsubscribe();
  }, [tonConnectUI, evmAddress, solanaAddress, suiAddress, tronAddress]);

  // Disconnect all and clear session data
  const disconnect = useCallback(() => {
    // AppKit (EVM + Solana)
    disconnectAppKit();

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

    // Clear session data
    clearWalletSession();
    clearAllSessionAuth();

    // NOTE: Transaction history is intentionally preserved on disconnect
    console.log('[MultiWallet] Wallet disconnected - session cleared');

    setError(null);
    setConnectionStatus('disconnected');
  }, [disconnectAppKit, suiCurrentWallet.isConnected, suiDisconnect, tonConnectUI, tonWallet]);

  // Switch EVM chain via wagmi
  const switchEvmChain = useCallback(async (targetChainId: number) => {
    await switchChain(wagmiConfig, { chainId: targetChainId as any });
  }, []);

  // Auto-reconnect Tron
  useEffect(() => {
    const wasConnected = localStorage.getItem('tronWalletConnected') === 'true';
    if (wasConnected && window.tronWeb?.defaultAddress?.base58) {
      setTronAddress(window.tronWeb.defaultAddress.base58);
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
    openConnectModal,
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
    getTonConnectUI,
    signAndExecuteSuiTransaction,
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

// Outer provider wrapping Sui/TON SDKs (AppKit providers are in main.tsx)
export function MultiWalletProvider({ children }: MultiWalletProviderProps) {
  return (
    <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
      <SuiWalletProvider autoConnect>
        <TonConnectUIProvider 
          manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
          actionsConfiguration={{
            // Request tonProof during connection for secure operations
            twaReturnUrl: window.location.origin as `${string}://${string}`,
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
          <MultiWalletProviderInner>
            {children}
          </MultiWalletProviderInner>
        </TonConnectUIProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  );
}

export function useMultiWallet() {
  const context = useContext(MultiWalletContext);
  if (context === undefined) {
    throw new Error('useMultiWallet must be used within a MultiWalletProvider');
  }
  return context;
}
