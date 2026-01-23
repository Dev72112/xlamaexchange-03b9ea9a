/**
 * MultiWalletContext - Thin wrapper around SessionManager
 * 
 * Provides backwards-compatible API while delegating state to the modular
 * wallet architecture (SessionManager + Adapters).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Chain, getChainByChainId, getPrimaryChain, SUPPORTED_CHAINS } from '@/data/chains';

// AppKit hooks (for Reown integration)
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import { wagmiConfig } from '@/config/appkit';
import { switchChain, getWalletClient } from '@wagmi/core';

// Sui
import { 
  SuiClientProvider, 
  WalletProvider as SuiWalletProvider, 
  useCurrentWallet, 
  useCurrentAccount, 
  useDisconnectWallet, 
  useConnectWallet, 
  useSuiClient, 
  useWallets, 
  useSignAndExecuteTransaction 
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// TON
import { TonConnectUIProvider, useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

// OKX Universal Provider
import { useOkxWallet } from '@/hooks/useOkxWallet';

// Session Manager integration (modular architecture core)
import { sessionManager, type SessionState, type Ecosystem } from '@/features/wallet/core';

// Utilities
import { 
  isMobileBrowser, 
  isInWalletBrowser, 
  isEvmWalletAvailable, 
  isSolanaWalletAvailable,
  isTronWalletAvailable,
  openWalletDeeplink,
} from '@/lib/wallet-deeplinks';

// Session management
import { 
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
  // Addresses per ecosystem
  evmAddress: string | null;
  solanaAddress: string | null;
  tronAddress: string | null;
  suiAddress: string | null;
  tonAddress: string | null;
  
  // Active chain info
  activeChainType: ChainType;
  activeAddress: string | null;
  activeChain: Chain;
  
  // Connection state
  isConnected: boolean;
  hasAnyConnection: boolean;
  anyConnectedAddress: string | null;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  
  // EVM-specific
  evmChainId: number | null;
  evmChain: Chain | null;
  evmWalletType: WalletType;
  
  // OKX-specific
  isOkxConnected: boolean;
  isOkxAvailable: boolean;
  
  // Actions
  isWalletAvailable: (walletId: string) => boolean;
  connectOkx: () => Promise<boolean>;
  openConnectModal: () => void;
  connectTron: (preferredWallet?: 'tronlink') => Promise<boolean>;
  connectSui: (preferredWallet?: string) => Promise<boolean>;
  connectTon: () => Promise<boolean>;
  disconnect: () => void;
  switchEvmChain: (chainId: number) => Promise<void>;
  switchChainByIndex: (chainIndex: string) => Promise<boolean>;
  openInWallet: (walletId: string) => void;
  setActiveChain: (chain: Chain) => void;
  
  // Provider getters
  getEvmProvider: () => Promise<any>;
  getSolanaConnection: () => any;
  getSolanaWallet: () => any;
  getTronWeb: () => any;
  getSuiClient: () => any;
  getTonConnectUI: () => any;
  signAndExecuteSuiTransaction: (transaction: any) => Promise<any>;
  
  // Chain helpers
  isConnectedToChain: (chain: Chain) => boolean;
  
  // SessionManager state (new modular architecture)
  sessionState: SessionState;
}

const MultiWalletContext = createContext<MultiWalletContextType | undefined>(undefined);

const suiNetworks = { mainnet: { url: getFullnodeUrl('mainnet') } };

interface MultiWalletProviderProps { children: ReactNode; }

/**
 * Inner provider component that uses all wallet hooks
 * Syncs state between legacy hooks and SessionManager
 */
function MultiWalletProviderInner({ children }: MultiWalletProviderProps) {
  // SessionManager subscription for modular architecture
  const [sessionState, setSessionState] = useState<SessionState>(() => sessionManager.getState());
  
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe(setSessionState);
    return unsubscribe;
  }, []);

  // Legacy wallet hooks - kept for backwards compatibility
  const okxWallet = useOkxWallet();
  const { open: openAppKit } = useAppKit();
  const { address: appKitAddress, caipAddress, isConnected: appKitConnected, status: appKitStatus } = useAppKitAccount();
  const { caipNetwork, chainId: appKitChainId } = useAppKitNetwork();
  const { disconnect: disconnectAppKit } = useDisconnect();
  const { connection: solanaConnection } = useAppKitConnection();
  
  // Tron manual state
  const [tronAddressManual, setTronAddressManual] = useState<string | null>(null);
  const tronAddress = okxWallet.tronAddress || tronAddressManual;
  
  // Active chain state
  const [activeChain, setActiveChainState] = useState<Chain>(() => {
    const session = getWalletSession();
    if (session && isSessionValid() && session.activeChainIndex) {
      const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === session.activeChainIndex);
      if (chain) return chain;
    }
    return getPrimaryChain();
  });
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  // Sui hooks
  const suiCurrentWallet = useCurrentWallet();
  const suiWallets = useWallets();
  const suiAccount = useCurrentAccount();
  const suiDisconnect = useDisconnectWallet();
  const suiConnect = useConnectWallet();
  const suiClient = useSuiClient();
  const suiSignAndExecute = useSignAndExecuteTransaction();
  const suiAddress = suiAccount?.address || null;
  
  // TON hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddressRaw = useTonAddress();
  const tonAddress = tonAddressRaw || null;

  // Derive addresses from multiple sources
  const evmAddress = useMemo(() => {
    // Priority: SessionManager > OKX > AppKit
    if (sessionState.ecosystem === 'evm' && sessionState.address) {
      return sessionState.address;
    }
    if (okxWallet.evmAddress) return okxWallet.evmAddress;
    if (!caipAddress) return null;
    if (caipAddress.startsWith('eip155:')) return caipAddress.split(':')[2] || null;
    return null;
  }, [sessionState.ecosystem, sessionState.address, okxWallet.evmAddress, caipAddress]);

  const solanaAddress = useMemo(() => {
    if (sessionState.ecosystem === 'solana' && sessionState.address) {
      return sessionState.address;
    }
    if (okxWallet.solanaAddress) return okxWallet.solanaAddress;
    if (!caipAddress) return null;
    if (caipAddress.startsWith('solana:')) return caipAddress.split(':')[2] || null;
    return null;
  }, [sessionState.ecosystem, sessionState.address, okxWallet.solanaAddress, caipAddress]);
  
  const suiAddressFinal = sessionState.ecosystem === 'sui' ? sessionState.address : (okxWallet.suiAddress || suiAddress);
  const tonAddressFinal = sessionState.ecosystem === 'ton' ? sessionState.address : (okxWallet.tonAddress || tonAddress);
  const tronAddressFinal = sessionState.ecosystem === 'tron' ? sessionState.address : tronAddress;
  
  // EVM chain info
  const evmChainId = useMemo(() => {
    if (sessionState.ecosystem === 'evm' && typeof sessionState.chainId === 'number') {
      return sessionState.chainId;
    }
    return typeof appKitChainId === 'number' ? appKitChainId : null;
  }, [sessionState.ecosystem, sessionState.chainId, appKitChainId]);
  
  const evmChain = evmChainId ? getChainByChainId(evmChainId) : null;
  const evmWalletType: WalletType = evmAddress ? 'walletconnect' : null;

  // Derive active chain type
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

  // Derive active address based on chain type
  const activeAddress = useMemo(() => {
    switch (activeChainType) {
      case 'solana': return solanaAddress;
      case 'tron': return tronAddressFinal;
      case 'sui': return suiAddressFinal;
      case 'ton': return tonAddressFinal;
      default: return evmAddress;
    }
  }, [activeChainType, evmAddress, solanaAddress, tronAddressFinal, suiAddressFinal, tonAddressFinal]);

  // Connection flags
  const hasAnyConnection = !!(evmAddress || solanaAddress || tronAddressFinal || suiAddressFinal || tonAddressFinal);
  const anyConnectedAddress = evmAddress || solanaAddress || tronAddressFinal || suiAddressFinal || tonAddressFinal || null;
  const isConnected = !!activeAddress;

  // Set active chain action
  const setActiveChain = useCallback((chain: Chain) => {
    setActiveChainState(chain);
    const chainType: ChainType = !chain.isEvm 
      ? (chain.name.toLowerCase().includes('solana') ? 'solana' 
        : chain.name.toLowerCase().includes('tron') ? 'tron' 
        : chain.name.toLowerCase().includes('sui') ? 'sui' 
        : chain.name.toLowerCase().includes('ton') ? 'ton' 
        : 'evm')
      : 'evm';
    updateActiveChain(chainType, chain.chainIndex);
  }, []);

  // Auto-switch active chain when connection changes
  useEffect(() => {
    if (hasAnyConnection && !isConnected) {
      if (evmAddress) setActiveChainState(getPrimaryChain());
      else if (solanaAddress) { 
        const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('solana')); 
        if (c) setActiveChainState(c); 
      }
      else if (tronAddressFinal) { 
        const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('tron')); 
        if (c) setActiveChainState(c); 
      }
      else if (suiAddressFinal) { 
        const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('sui')); 
        if (c) setActiveChainState(c); 
      }
      else if (tonAddressFinal) { 
        const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('ton')); 
        if (c) setActiveChainState(c); 
      }
    }
  }, [hasAnyConnection, isConnected, evmAddress, solanaAddress, tronAddressFinal, suiAddressFinal, tonAddressFinal]);

  // Sync connection status with AppKit
  useEffect(() => {
    if (appKitStatus === 'connecting' || sessionState.isConnecting) { 
      setConnectionStatus('connecting'); 
      setIsConnecting(true); 
    } else if ((appKitConnected && appKitAddress) || sessionState.isConnected) { 
      setConnectionStatus('connected'); 
      setIsConnecting(false); 
      if (evmAddress) updateChainConnection('evm', true); 
      if (solanaAddress) updateChainConnection('solana', true); 
    } else { 
      if (!suiAddressFinal && !tonAddressFinal && !tronAddressFinal) {
        setConnectionStatus('disconnected'); 
      }
      setIsConnecting(false); 
    }
  }, [appKitStatus, appKitConnected, appKitAddress, evmAddress, solanaAddress, suiAddressFinal, tonAddressFinal, tronAddressFinal, sessionState.isConnecting, sessionState.isConnected]);

  // Sync error from SessionManager
  useEffect(() => {
    if (sessionState.error) {
      setError(sessionState.error);
      setConnectionStatus('error');
    }
  }, [sessionState.error]);

  // Update chain connections for non-EVM
  useEffect(() => { 
    if (suiAddressFinal) { 
      updateChainConnection('sui', true); 
      setConnectionStatus('connected'); 
    } 
  }, [suiAddressFinal]);
  
  useEffect(() => { 
    if (tonAddressFinal) { 
      updateChainConnection('ton', true); 
      setConnectionStatus('connected'); 
    } 
  }, [tonAddressFinal]);
  
  useEffect(() => { 
    if (tronAddressFinal) { 
      updateChainConnection('tron', true); 
      setConnectionStatus('connected'); 
    } 
  }, [tronAddressFinal]);

  // Wallet availability check
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

  // Open wallet deeplink
  const openInWallet = useCallback((walletId: string) => openWalletDeeplink(walletId), []);
  
  // Check if connected to specific chain
  const isConnectedToChain = useCallback((chain: Chain): boolean => {
    if (chain.isEvm) return !!evmAddress && evmChainId === chain.chainId;
    const name = chain.name.toLowerCase();
    if (name.includes('solana')) return !!solanaAddress;
    if (name.includes('tron')) return !!tronAddressFinal;
    if (name.includes('sui')) return !!suiAddressFinal;
    if (name.includes('ton')) return !!tonAddressFinal;
    return false;
  }, [evmAddress, evmChainId, solanaAddress, tronAddressFinal, suiAddressFinal, tonAddressFinal]);

  // Open AppKit modal
  const openConnectModal = useCallback(() => openAppKit(), [openAppKit]);
  
  // Provider getters
  const getEvmProvider = useCallback(async () => {
    // First try SessionManager
    const provider = sessionManager.getProvider();
    if (provider) return provider;
    
    // Fallback to wagmi
    if (!evmChainId) return null;
    try { 
      const wc = await getWalletClient(wagmiConfig, { chainId: evmChainId as any }); 
      return wc ? { request: async (args: any) => wc.transport.request(args) } : null; 
    } catch { 
      return null; 
    }
  }, [evmChainId]);
  
  const getSolanaConnection = useCallback(() => solanaConnection, [solanaConnection]);
  
  const getSolanaWallet = useCallback(() => {
    // First try SessionManager for Solana signer
    if (sessionState.ecosystem === 'solana') {
      const signer = sessionManager.getSigner();
      if (signer) return signer;
    }
    
    // Fallback to injected providers
    if (typeof window !== 'undefined') {
      const okxSolana = (window as any).okxwallet?.solana;
      if (okxSolana) return okxSolana;
      const phantom = (window as any).solana;
      if (phantom?.isPhantom) return phantom;
    }
    return null;
  }, [sessionState.ecosystem]);
  
  const getTronWeb = useCallback(() => {
    // First try SessionManager
    if (sessionState.ecosystem === 'tron') {
      const provider = sessionManager.getProvider();
      if (provider) return provider;
    }
    return (window as any).tronWeb || null;
  }, [sessionState.ecosystem]);
  
  const getSuiClient = useCallback(() => suiClient, [suiClient]);
  const getTonConnectUI = useCallback(() => tonConnectUI, [tonConnectUI]);
  
  const signAndExecuteSuiTransaction = useCallback(async (tx: any) => 
    suiSignAndExecute.mutateAsync({ transaction: tx }), 
  [suiSignAndExecute]);

  // Connect Tron wallet
  const connectTron = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true); 
    setConnectionStatus('connecting'); 
    setError(null);
    try {
      if (isMobileBrowser() && !isInWalletBrowser()) { 
        openWalletDeeplink('tronlink'); 
        setIsConnecting(false); 
        return false; 
      }
      if (!isTronWalletAvailable()) throw new Error('TronLink not installed');
      
      if ((window as any).tronLink) { 
        const res = await (window as any).tronLink.request({ method: 'tron_requestAccounts' }); 
        if (res.code === 200) { 
          const addr = (window as any).tronLink.tronWeb?.defaultAddress?.base58; 
          if (addr) { 
            setTronAddressManual(addr); 
            setConnectionStatus('connected'); 
            localStorage.setItem('tronWalletConnected', 'true'); 
            return true; 
          } 
        } 
      }
      if ((window as any).tronWeb?.defaultAddress?.base58) { 
        setTronAddressManual((window as any).tronWeb.defaultAddress.base58); 
        setConnectionStatus('connected'); 
        localStorage.setItem('tronWalletConnected', 'true'); 
        return true; 
      }
      throw new Error('Failed to connect');
    } catch (err: any) { 
      setError(err.message); 
      setConnectionStatus('error'); 
      throw err; 
    } finally { 
      setIsConnecting(false); 
    }
  }, []);

  // Connect Sui wallet
  const connectSui = useCallback(async (preferredWallet?: string): Promise<boolean> => {
    setIsConnecting(true); 
    setConnectionStatus('connecting'); 
    setError(null);
    try {
      if (suiWallets.length > 0) { 
        const target = suiWallets.find(w => 
          w.name.toLowerCase().includes(preferredWallet?.toLowerCase() || '')
        ) || suiWallets[0]; 
        await suiConnect.mutateAsync({ wallet: target }); 
        setConnectionStatus('connected'); 
        return true; 
      }
      throw new Error('No Sui wallet detected');
    } catch (err: any) { 
      setError(err.message); 
      setConnectionStatus('error'); 
      throw err; 
    } finally { 
      setIsConnecting(false); 
    }
  }, [suiConnect, suiWallets]);

  // Connect TON wallet
  const connectTon = useCallback(async (): Promise<boolean> => {
    if (tonConnectUI) {
      try {
        await tonConnectUI.openModal();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [tonConnectUI]);

  // TON proof handling
  useEffect(() => {
    if (!tonConnectUI) return;
    tonConnectUI.setConnectRequestParameters({ 
      state: 'ready', 
      value: { tonProof: crypto.randomUUID() } 
    });
    const unsub = tonConnectUI.onStatusChange((w: any) => { 
      const tonProof = w?.connectItems?.tonProof;
      if (tonProof && 'proof' in tonProof) { 
        const proof = tonProof.proof;
        import('@/hooks/useTonProof').then(({ setGlobalTonProof }) => setGlobalTonProof({ 
          timestamp: proof.timestamp, 
          domainLengthBytes: proof.domain.lengthBytes, 
          domainValue: proof.domain.value, 
          signature: proof.signature, 
          payload: proof.payload, 
          stateInit: w.account.walletStateInit || '', 
          publicKey: w.account.publicKey || '' 
        })); 
      } 
    });
    return () => unsub();
  }, [tonConnectUI]);

  // Disconnect all wallets
  const disconnect = useCallback(() => {
    // Disconnect SessionManager first
    sessionManager.disconnect();
    
    // Then legacy disconnects
    disconnectAppKit(); 
    setTronAddressManual(null); 
    localStorage.removeItem('tronWalletConnected');
    if (okxWallet.isConnected) okxWallet.disconnect();
    if (suiCurrentWallet.isConnected) suiDisconnect.mutate();
    if (tonWallet) tonConnectUI.disconnect();
    clearWalletSession(); 
    clearAllSessionAuth(); 
    setError(null); 
    setConnectionStatus('disconnected');
  }, [disconnectAppKit, suiCurrentWallet.isConnected, suiDisconnect, tonConnectUI, tonWallet, okxWallet]);

  // Switch EVM chain
  const switchEvmChain = useCallback(async (id: number) => {
    // Try SessionManager first
    if (sessionState.ecosystem === 'evm' && sessionState.isConnected) {
      await sessionManager.switchChain(id);
      return;
    }
    // Fallback to wagmi
    await switchChain(wagmiConfig, { chainId: id as any });
  }, [sessionState.ecosystem, sessionState.isConnected]);
  
  // Restore Tron connection on mount
  useEffect(() => { 
    if (localStorage.getItem('tronWalletConnected') === 'true' && (window as any).tronWeb?.defaultAddress?.base58) {
      setTronAddressManual((window as any).tronWeb.defaultAddress.base58); 
    }
  }, []);
  
  // Connect OKX wallet
  const connectOkx = useCallback(async () => okxWallet.connect(), [okxWallet]);
  
  // Switch chain by index - with proper EVM chain switching
  const switchChainByIndex = useCallback(async (idx: string): Promise<boolean> => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === idx); 
    if (!chain) return false;
    
    console.log('[MultiWallet] switchChainByIndex called:', { idx, chainName: chain.name, isEvm: chain.isEvm });
    
    // For EVM chains, we need to actually switch the wallet network
    if (chain.isEvm && chain.chainId) {
      // Try injected OKX provider first (for in-app browser or extension)
      const okxInjected = (window as any).okxwallet;
      if (okxInjected && evmAddress) {
        try {
          const chainIdHex = `0x${chain.chainId.toString(16)}`;
          await okxInjected.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
          console.log('[MultiWallet] Switched via OKX injected provider');
          return true;
        } catch (err: any) {
          if (err?.code === 4902) {
            console.log('[MultiWallet] Chain not added to wallet');
          }
          console.warn('[MultiWallet] OKX injected switch failed:', err);
          // Fall through to other methods
        }
      }
      
      // Try SessionManager
      if (sessionState.ecosystem === 'evm' && sessionState.isConnected) {
        try {
          await sessionManager.switchChain(chain.chainId);
          console.log('[MultiWallet] Switched via SessionManager');
          return true;
        } catch (err) {
          console.warn('[MultiWallet] SessionManager switch failed:', err);
        }
      }
      
      // Try wagmi
      try { 
        await switchEvmChain(chain.chainId); 
        console.log('[MultiWallet] Switched via wagmi');
        return true; 
      } catch (err) { 
        console.warn('[MultiWallet] Wagmi switch failed:', err);
        return false; 
      } 
    }
    
    // For Solana chain, check if we have a Solana wallet connected
    if (idx === '501') {
      setActiveChain(chain);
      // Check for actual Solana wallet connection
      const hasSolanaWallet = !!solanaAddress || !!(window as any).okxwallet?.solana?.publicKey;
      if (!hasSolanaWallet) {
        console.log('[MultiWallet] Solana chain selected but no Solana wallet connected');
        return false; // Signal that wallet connection is needed
      }
      console.log('[MultiWallet] Solana wallet already connected:', solanaAddress?.slice(0, 8));
      return true;
    }
    
    // For other non-EVM chains, update active chain state (UI-only switch)
    setActiveChain(chain);
    return true;
  }, [evmAddress, sessionState.ecosystem, sessionState.isConnected, switchEvmChain, setActiveChain, solanaAddress]);

  // Build context value
  const value: MultiWalletContextType = useMemo(() => ({ 
    evmAddress, 
    solanaAddress, 
    tronAddress: tronAddressFinal, 
    suiAddress: suiAddressFinal, 
    tonAddress: tonAddressFinal, 
    activeChainType, 
    activeAddress, 
    isConnected, 
    hasAnyConnection, 
    anyConnectedAddress, 
    evmChainId, 
    evmChain, 
    evmWalletType, 
    isOkxConnected: okxWallet.isConnected, 
    isOkxAvailable: okxWallet.isOkxAvailable, 
    isConnecting: isConnecting || okxWallet.isConnecting || sessionState.isConnecting, 
    connectionStatus, 
    error: error || sessionState.error, 
    isWalletAvailable, 
    connectOkx, 
    openConnectModal, 
    connectTron, 
    connectSui, 
    connectTon, 
    disconnect, 
    switchEvmChain, 
    switchChainByIndex, 
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
    sessionState,
  }), [
    evmAddress, solanaAddress, tronAddressFinal, suiAddressFinal, tonAddressFinal,
    activeChainType, activeAddress, isConnected, hasAnyConnection, anyConnectedAddress,
    evmChainId, evmChain, evmWalletType, okxWallet.isConnected, okxWallet.isOkxAvailable,
    isConnecting, okxWallet.isConnecting, sessionState, connectionStatus, error,
    isWalletAvailable, connectOkx, openConnectModal, connectTron, connectSui, connectTon,
    disconnect, switchEvmChain, switchChainByIndex, openInWallet, getEvmProvider,
    getSolanaConnection, getSolanaWallet, getTronWeb, getSuiClient, getTonConnectUI,
    signAndExecuteSuiTransaction, setActiveChain, activeChain, isConnectedToChain,
  ]);

  return <MultiWalletContext.Provider value={value}>{children}</MultiWalletContext.Provider>;
}

/**
 * MultiWalletProvider - Wraps children with all wallet SDK providers
 */
export function MultiWalletProvider({ children }: MultiWalletProviderProps) {
  return (
    <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
      <SuiWalletProvider autoConnect>
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
          <MultiWalletProviderInner>{children}</MultiWalletProviderInner>
        </TonConnectUIProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  );
}

/**
 * useMultiWallet - Hook to access wallet context
 */
export function useMultiWallet() { 
  const ctx = useContext(MultiWalletContext); 
  if (!ctx) throw new Error('useMultiWallet must be used within MultiWalletProvider'); 
  return ctx; 
}
