import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Chain, getChainByChainId, getChainByIndex, getPrimaryChain, SUPPORTED_CHAINS } from '@/data/chains';

// Solana
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

// Sui
import { SuiClientProvider, WalletProvider as SuiWalletProvider, useCurrentWallet, useCurrentAccount, useDisconnectWallet, useConnectWallet, useSuiClient, useWallets } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// TON
import { TonConnectUIProvider, useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react';

// Types
export type ChainType = 'evm' | 'solana' | 'tron' | 'sui' | 'ton';
export type WalletType = 'okx' | 'metamask' | 'phantom' | 'solflare' | 'tronlink' | 'sui-wallet' | 'tonkeeper' | null;

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
  
  // EVM-specific (existing)
  evmChainId: number | null;
  evmChain: Chain | null;
  evmWalletType: WalletType;
  
  // Connection status
  isConnecting: boolean;
  error: string | null;
  
  // Methods
  connectEvm: (preferredWallet?: WalletType) => Promise<void>;
  connectSolana: () => Promise<void>;
  connectTron: () => Promise<void>;
  connectSui: () => Promise<void>;
  connectTon: () => Promise<void>;
  disconnect: () => void;
  switchEvmChain: (chainId: number) => Promise<void>;
  
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
  
  // Tron state (manual)
  const [tronAddress, setTronAddress] = useState<string | null>(null);
  
  // Common state
  const [activeChain, setActiveChain] = useState<Chain>(getPrimaryChain());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Solana wallet hooks
  const solanaWallet = useSolanaWallet();
  const solanaAddress = solanaWallet.publicKey?.toBase58() || null;
  
  // Sui wallet hooks  
  const suiCurrentWallet = useCurrentWallet();
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
    return null;
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
      localStorage.removeItem('evmWalletConnected');
      localStorage.removeItem('evmWalletType');
    } else {
      setEvmAddress(accounts[0]);
    }
  }, []);

  const handleEvmChainChanged = useCallback((chainIdHex: string) => {
    setEvmChainId(parseInt(chainIdHex, 16));
  }, []);

  // Connect EVM
  const connectEvm = useCallback(async (preferredWallet?: WalletType) => {
    setIsConnecting(true);
    setError(null);

    try {
      let provider: any = null;
      let selectedWalletType: WalletType = null;

      if (preferredWallet === 'okx' || (!preferredWallet && window.okxwallet)) {
        if (window.okxwallet) {
          provider = window.okxwallet;
          selectedWalletType = 'okx';
        } else if (!preferredWallet && window.ethereum) {
          provider = window.ethereum;
          selectedWalletType = 'metamask';
        } else {
          throw new Error('OKX Wallet is not installed');
        }
      } else if (preferredWallet === 'metamask' || window.ethereum) {
        if (window.ethereum) {
          provider = window.ethereum;
          selectedWalletType = 'metamask';
        } else {
          throw new Error('MetaMask is not installed');
        }
      }

      if (!provider) throw new Error('No EVM wallet detected');

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) throw new Error('No accounts found');

      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      setEvmAddress(accounts[0]);
      setEvmChainId(currentChainId);
      setEvmWalletType(selectedWalletType);

      provider.on('accountsChanged', handleEvmAccountsChanged);
      provider.on('chainChanged', handleEvmChainChanged);

      localStorage.setItem('evmWalletConnected', 'true');
      localStorage.setItem('evmWalletType', selectedWalletType || '');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [handleEvmAccountsChanged, handleEvmChainChanged]);

  // Connect Solana
  const connectSolana = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!solanaWallet.wallet) {
        // Select first available wallet
        if (solanaWallet.wallets.length > 0) {
          await solanaWallet.select(solanaWallet.wallets[0].adapter.name);
        }
      }
      await solanaWallet.connect();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [solanaWallet]);

  // Connect Tron
  const connectTron = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (!window.tronLink && !window.tronWeb) {
        throw new Error('TronLink is not installed');
      }

      if (window.tronLink) {
        const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (res.code === 200) {
          setTronAddress(window.tronLink.tronWeb.defaultAddress.base58);
          localStorage.setItem('tronWalletConnected', 'true');
        } else {
          throw new Error('TronLink connection rejected');
        }
      } else if (window.tronWeb?.defaultAddress?.base58) {
        setTronAddress(window.tronWeb.defaultAddress.base58);
        localStorage.setItem('tronWalletConnected', 'true');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Connect Sui
  const connectSui = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (suiCurrentWallet.wallets.length > 0) {
        await suiConnect.mutateAsync({ wallet: suiCurrentWallet.wallets[0] });
      } else {
        throw new Error('No Sui wallet detected');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [suiConnect, suiCurrentWallet.wallets]);

  // Connect TON
  const connectTon = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await tonConnectUI.openModal();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [tonConnectUI]);

  // Disconnect all
  const disconnect = useCallback(() => {
    // EVM
    const evmProvider = getEvmProvider();
    if (evmProvider) {
      evmProvider.removeListener('accountsChanged', handleEvmAccountsChanged);
      evmProvider.removeListener('chainChanged', handleEvmChainChanged);
    }
    setEvmAddress(null);
    setEvmChainId(null);
    setEvmWalletType(null);
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
  }, [getEvmProvider, handleEvmAccountsChanged, handleEvmChainChanged, solanaWallet, suiCurrentWallet.isConnected, suiDisconnect, tonConnectUI, tonWallet]);

  // Switch EVM chain
  const switchEvmChain = useCallback(async (targetChainId: number) => {
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
  }, [getEvmProvider]);

  // Auto-reconnect EVM
  useEffect(() => {
    const wasConnected = localStorage.getItem('evmWalletConnected') === 'true';
    const savedWalletType = localStorage.getItem('evmWalletType') as WalletType;

    if (wasConnected && savedWalletType) {
      const timeout = setTimeout(() => {
        connectEvm(savedWalletType).catch(() => {
          localStorage.removeItem('evmWalletConnected');
          localStorage.removeItem('evmWalletType');
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
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
    error,
    connectEvm,
    connectSolana,
    connectTron,
    connectSui,
    connectTon,
    disconnect,
    switchEvmChain,
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
  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={solanaEndpoint}>
      <SolanaWalletProvider wallets={solanaWallets} autoConnect>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
          <SuiWalletProvider autoConnect>
            <TonConnectUIProvider manifestUrl="https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json">
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

// Re-export for backwards compatibility  
export { useMultiWallet as useWallet };
