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

// OKX Universal Provider
import { useOkxWallet } from '@/hooks/useOkxWallet';

// Session Manager integration (new modular architecture)
import { sessionManager, type SessionState } from '@/features/wallet/core';

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
  evmAddress: string | null;
  solanaAddress: string | null;
  tronAddress: string | null;
  suiAddress: string | null;
  tonAddress: string | null;
  activeChainType: ChainType;
  activeAddress: string | null;
  isConnected: boolean;
  hasAnyConnection: boolean;
  anyConnectedAddress: string | null;
  evmChainId: number | null;
  evmChain: Chain | null;
  evmWalletType: WalletType;
  isOkxConnected: boolean;
  isOkxAvailable: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
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
  getEvmProvider: () => Promise<any>;
  getSolanaConnection: () => any;
  getSolanaWallet: () => any;
  getTronWeb: () => any;
  getSuiClient: () => any;
  getTonConnectUI: () => any;
  signAndExecuteSuiTransaction: (transaction: any) => Promise<any>;
  setActiveChain: (chain: Chain) => void;
  activeChain: Chain;
  isConnectedToChain: (chain: Chain) => boolean;
}

const MultiWalletContext = createContext<MultiWalletContextType | undefined>(undefined);

const suiNetworks = { mainnet: { url: getFullnodeUrl('mainnet') } };

interface MultiWalletProviderProps { children: ReactNode; }

function MultiWalletProviderInner({ children }: MultiWalletProviderProps) {
  const okxWallet = useOkxWallet();
  const { open: openAppKit } = useAppKit();
  const { address: appKitAddress, caipAddress, isConnected: appKitConnected, status: appKitStatus } = useAppKitAccount();
  const { caipNetwork, chainId: appKitChainId } = useAppKitNetwork();
  const { disconnect: disconnectAppKit } = useDisconnect();
  const { connection: solanaConnection } = useAppKitConnection();
  const [tronAddressManual, setTronAddressManual] = useState<string | null>(null);
  const tronAddress = okxWallet.tronAddress || tronAddressManual;
  
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
  
  const setActiveChain = useCallback((chain: Chain) => {
    setActiveChainState(chain);
    const chainType = !chain.isEvm 
      ? (chain.name.toLowerCase().includes('solana') ? 'solana' : chain.name.toLowerCase().includes('tron') ? 'tron' : chain.name.toLowerCase().includes('sui') ? 'sui' : chain.name.toLowerCase().includes('ton') ? 'ton' : 'evm')
      : 'evm';
    updateActiveChain(chainType as ChainType, chain.chainIndex);
  }, []);
  
  const suiCurrentWallet = useCurrentWallet();
  const suiWallets = useWallets();
  const suiAccount = useCurrentAccount();
  const suiDisconnect = useDisconnectWallet();
  const suiConnect = useConnectWallet();
  const suiClient = useSuiClient();
  const suiSignAndExecute = useSignAndExecuteTransaction();
  const suiAddress = suiAccount?.address || null;
  
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();
  const tonAddressRaw = useTonAddress();
  const tonAddress = tonAddressRaw || null;

  const evmAddress = useMemo(() => {
    if (okxWallet.evmAddress) return okxWallet.evmAddress;
    if (!caipAddress) return null;
    if (caipAddress.startsWith('eip155:')) return caipAddress.split(':')[2] || null;
    return null;
  }, [okxWallet.evmAddress, caipAddress]);

  const solanaAddress = useMemo(() => {
    if (okxWallet.solanaAddress) return okxWallet.solanaAddress;
    if (!caipAddress) return null;
    if (caipAddress.startsWith('solana:')) return caipAddress.split(':')[2] || null;
    return null;
  }, [okxWallet.solanaAddress, caipAddress]);
  
  const suiAddressFinal = okxWallet.suiAddress || suiAddress;
  const tonAddressFinal = okxWallet.tonAddress || tonAddress;
  const evmChainId = useMemo(() => typeof appKitChainId === 'number' ? appKitChainId : null, [appKitChainId]);
  const evmChain = evmChainId ? getChainByChainId(evmChainId) : null;
  const evmWalletType: WalletType = evmAddress ? 'walletconnect' : null;

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

  const activeAddress = useMemo(() => {
    switch (activeChainType) {
      case 'solana': return solanaAddress;
      case 'tron': return tronAddress;
      case 'sui': return suiAddressFinal;
      case 'ton': return tonAddressFinal;
      default: return evmAddress;
    }
  }, [activeChainType, evmAddress, solanaAddress, tronAddress, suiAddressFinal, tonAddressFinal]);

  const hasAnyConnection = !!(evmAddress || solanaAddress || tronAddress || suiAddressFinal || tonAddressFinal);
  const anyConnectedAddress = evmAddress || solanaAddress || tronAddress || suiAddressFinal || tonAddressFinal || null;
  const isConnected = !!activeAddress;

  useEffect(() => {
    if (hasAnyConnection && !isConnected) {
      if (evmAddress) setActiveChainState(getPrimaryChain());
      else if (solanaAddress) { const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('solana')); if (c) setActiveChainState(c); }
      else if (tronAddress) { const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('tron')); if (c) setActiveChainState(c); }
      else if (suiAddressFinal) { const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('sui')); if (c) setActiveChainState(c); }
      else if (tonAddressFinal) { const c = SUPPORTED_CHAINS.find(c => c.name.toLowerCase().includes('ton')); if (c) setActiveChainState(c); }
    }
  }, [hasAnyConnection, isConnected, evmAddress, solanaAddress, tronAddress, suiAddressFinal, tonAddressFinal]);

  useEffect(() => {
    if (appKitStatus === 'connecting') { setConnectionStatus('connecting'); setIsConnecting(true); }
    else if (appKitConnected && appKitAddress) { setConnectionStatus('connected'); setIsConnecting(false); if (evmAddress) updateChainConnection('evm', true); if (solanaAddress) updateChainConnection('solana', true); }
    else { if (!suiAddressFinal && !tonAddressFinal && !tronAddress) setConnectionStatus('disconnected'); setIsConnecting(false); }
  }, [appKitStatus, appKitConnected, appKitAddress, evmAddress, solanaAddress, suiAddressFinal, tonAddressFinal, tronAddress]);

  useEffect(() => { if (suiAddressFinal) { updateChainConnection('sui', true); setConnectionStatus('connected'); } }, [suiAddressFinal]);
  useEffect(() => { if (tonAddressFinal) { updateChainConnection('ton', true); setConnectionStatus('connected'); } }, [tonAddressFinal]);
  useEffect(() => { if (tronAddress) { updateChainConnection('tron', true); setConnectionStatus('connected'); } }, [tronAddress]);

  const isWalletAvailable = useCallback((walletId: string): boolean => {
    switch (walletId) {
      case 'okx': case 'metamask': return isEvmWalletAvailable(walletId);
      case 'phantom': case 'solflare': return isSolanaWalletAvailable(walletId);
      case 'tronlink': case 'tokenpocket': return isTronWalletAvailable();
      case 'sui-wallet': return suiWallets.length > 0;
      case 'tonkeeper': return true;
      default: return false;
    }
  }, [suiWallets.length]);

  const openInWallet = useCallback((walletId: string) => openWalletDeeplink(walletId), []);
  const isConnectedToChain = useCallback((chain: Chain): boolean => {
    if (chain.isEvm) return !!evmAddress && evmChainId === chain.chainId;
    const name = chain.name.toLowerCase();
    if (name.includes('solana')) return !!solanaAddress;
    if (name.includes('tron')) return !!tronAddress;
    if (name.includes('sui')) return !!suiAddressFinal;
    if (name.includes('ton')) return !!tonAddressFinal;
    return false;
  }, [evmAddress, evmChainId, solanaAddress, tronAddress, suiAddressFinal, tonAddressFinal]);

  const openConnectModal = useCallback(() => openAppKit(), [openAppKit]);
  const getEvmProvider = useCallback(async () => {
    if (!evmChainId) return null;
    try { const wc = await getWalletClient(wagmiConfig, { chainId: evmChainId as any }); return wc ? { request: async (args: any) => wc.transport.request(args) } : null; } catch { return null; }
  }, [evmChainId]);
  const getSolanaConnection = useCallback(() => solanaConnection, [solanaConnection]);
  const getSolanaWallet = useCallback(() => {
    // Priority: OKX injected Solana provider
    if (typeof window !== 'undefined') {
      // OKX Wallet's Solana provider
      const okxSolana = (window as any).okxwallet?.solana;
      if (okxSolana) return okxSolana;
      // Phantom fallback
      const phantom = (window as any).solana;
      if (phantom?.isPhantom) return phantom;
    }
    return null;
  }, []);
  const getTronWeb = useCallback(() => window.tronWeb || null, []);
  const getSuiClient = useCallback(() => suiClient, [suiClient]);
  const getTonConnectUI = useCallback(() => tonConnectUI, [tonConnectUI]);
  const signAndExecuteSuiTransaction = useCallback(async (tx: any) => suiSignAndExecute.mutateAsync({ transaction: tx }), [suiSignAndExecute]);

  const connectTron = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true); setConnectionStatus('connecting'); setError(null);
    try {
      if (isMobileBrowser() && !isInWalletBrowser()) { openWalletDeeplink('tronlink'); setIsConnecting(false); return false; }
      if (!isTronWalletAvailable()) throw new Error('TronLink not installed');
      if (window.tronLink) { const res = await window.tronLink.request({ method: 'tron_requestAccounts' }); if (res.code === 200) { const addr = window.tronLink.tronWeb?.defaultAddress?.base58; if (addr) { setTronAddressManual(addr); setConnectionStatus('connected'); localStorage.setItem('tronWalletConnected', 'true'); return true; } } }
      if (window.tronWeb?.defaultAddress?.base58) { setTronAddressManual(window.tronWeb.defaultAddress.base58); setConnectionStatus('connected'); localStorage.setItem('tronWalletConnected', 'true'); return true; }
      throw new Error('Failed to connect');
    } catch (err: any) { setError(err.message); setConnectionStatus('error'); throw err; } finally { setIsConnecting(false); }
  }, []);

  const connectSui = useCallback(async (preferredWallet?: string): Promise<boolean> => {
    setIsConnecting(true); setConnectionStatus('connecting'); setError(null);
    try {
      if (suiWallets.length > 0) { const target = suiWallets.find(w => w.name.toLowerCase().includes(preferredWallet?.toLowerCase() || '')) || suiWallets[0]; await suiConnect.mutateAsync({ wallet: target }); setConnectionStatus('connected'); return true; }
      throw new Error('No Sui wallet detected');
    } catch (err: any) { setError(err.message); setConnectionStatus('error'); throw err; } finally { setIsConnecting(false); }
  }, [suiConnect, suiWallets]);

  const connectTon = useCallback(async (): Promise<boolean> => false, []);

  useEffect(() => {
    if (!tonConnectUI) return;
    tonConnectUI.setConnectRequestParameters({ state: 'ready', value: { tonProof: crypto.randomUUID() } });
    const unsub = tonConnectUI.onStatusChange((w) => { 
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

  const disconnect = useCallback(() => {
    disconnectAppKit(); setTronAddressManual(null); localStorage.removeItem('tronWalletConnected');
    if (okxWallet.isConnected) okxWallet.disconnect();
    if (suiCurrentWallet.isConnected) suiDisconnect.mutate();
    if (tonWallet) tonConnectUI.disconnect();
    clearWalletSession(); clearAllSessionAuth(); setError(null); setConnectionStatus('disconnected');
  }, [disconnectAppKit, suiCurrentWallet.isConnected, suiDisconnect, tonConnectUI, tonWallet, okxWallet]);

  const switchEvmChain = useCallback(async (id: number) => switchChain(wagmiConfig, { chainId: id as any }), []);
  useEffect(() => { if (localStorage.getItem('tronWalletConnected') === 'true' && window.tronWeb?.defaultAddress?.base58) setTronAddressManual(window.tronWeb.defaultAddress.base58); }, []);
  const connectOkx = useCallback(async () => okxWallet.connect(), [okxWallet]);
  const switchChainByIndex = useCallback(async (idx: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === idx); if (!chain) return false;
    if (okxWallet.isConnected && okxWallet.provider) return okxWallet.switchChain(idx);
    if (chain.isEvm && chain.chainId) { try { await switchEvmChain(chain.chainId); return true; } catch { return false; } }
    return true;
  }, [okxWallet, switchEvmChain]);

  const value: MultiWalletContextType = { evmAddress, solanaAddress, tronAddress, suiAddress: suiAddressFinal, tonAddress: tonAddressFinal, activeChainType, activeAddress, isConnected, hasAnyConnection, anyConnectedAddress, evmChainId, evmChain, evmWalletType, isOkxConnected: okxWallet.isConnected, isOkxAvailable: okxWallet.isOkxAvailable, isConnecting: isConnecting || okxWallet.isConnecting, connectionStatus, error, isWalletAvailable, connectOkx, openConnectModal, connectTron, connectSui, connectTon, disconnect, switchEvmChain, switchChainByIndex, openInWallet, getEvmProvider, getSolanaConnection, getSolanaWallet, getTronWeb, getSuiClient, getTonConnectUI, signAndExecuteSuiTransaction, setActiveChain, activeChain, isConnectedToChain };

  return <MultiWalletContext.Provider value={value}>{children}</MultiWalletContext.Provider>;
}

export function MultiWalletProvider({ children }: MultiWalletProviderProps) {
  return (
    <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
      <SuiWalletProvider autoConnect>
        <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`} actionsConfiguration={{ twaReturnUrl: window.location.origin as `${string}://${string}` }} walletsListConfiguration={{ includeWallets: [{ appName: 'tonkeeper', name: 'Tonkeeper', imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png', aboutUrl: 'https://tonkeeper.com', universalLink: 'https://app.tonkeeper.com/ton-connect', bridgeUrl: 'https://bridge.tonapi.io/bridge', platforms: ['ios', 'android', 'chrome', 'firefox', 'safari'] }] }}>
          <MultiWalletProviderInner>{children}</MultiWalletProviderInner>
        </TonConnectUIProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  );
}

export function useMultiWallet() { const ctx = useContext(MultiWalletContext); if (!ctx) throw new Error('useMultiWallet must be used within MultiWalletProvider'); return ctx; }
