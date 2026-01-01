import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Chain, getChainByChainId, getPrimaryChain, SUPPORTED_CHAINS } from '@/data/chains';

export type WalletType = 'okx' | 'metamask' | null;

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  chain: Chain | null;
  walletType: WalletType;
  isConnecting: boolean;
  error: string | null;
  connect: (preferredWallet?: WalletType) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  getProvider: () => any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    okxwallet?: any;
    ethereum?: any;
  }
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chain = chainId ? getChainByChainId(chainId) : null;

  // Get the appropriate provider based on wallet type
  const getProvider = useCallback(() => {
    if (walletType === 'okx' && window.okxwallet) {
      return window.okxwallet;
    }
    if (walletType === 'metamask' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }, [walletType]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAddress(null);
      setWalletType(null);
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletType');
    } else {
      setAddress(accounts[0]);
      setIsConnected(true);
    }
  }, []);

  // Handle chain changes
  const handleChainChanged = useCallback((chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
  }, []);

  // Setup event listeners
  const setupListeners = useCallback((provider: any) => {
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
  }, [handleAccountsChanged, handleChainChanged]);

  // Remove event listeners
  const removeListeners = useCallback((provider: any) => {
    provider.removeListener('accountsChanged', handleAccountsChanged);
    provider.removeListener('chainChanged', handleChainChanged);
  }, [handleAccountsChanged, handleChainChanged]);

  // Connect wallet
  const connect = useCallback(async (preferredWallet?: WalletType) => {
    setIsConnecting(true);
    setError(null);

    try {
      let provider: any = null;
      let selectedWalletType: WalletType = null;

      // Priority: OKX Wallet > MetaMask
      if (preferredWallet === 'okx' || (!preferredWallet && window.okxwallet)) {
        if (window.okxwallet) {
          provider = window.okxwallet;
          selectedWalletType = 'okx';
        } else if (!preferredWallet) {
          // Fallback to MetaMask if OKX not available
          if (window.ethereum) {
            provider = window.ethereum;
            selectedWalletType = 'metamask';
          }
        } else {
          throw new Error('OKX Wallet is not installed. Please install it from okx.com/web3');
        }
      } else if (preferredWallet === 'metamask' || window.ethereum) {
        if (window.ethereum) {
          provider = window.ethereum;
          selectedWalletType = 'metamask';
        } else {
          throw new Error('MetaMask is not installed. Please install it from metamask.io');
        }
      }

      if (!provider) {
        throw new Error('No wallet detected. Please install OKX Wallet or MetaMask.');
      }

      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      // Get current chain
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      setAddress(accounts[0]);
      setChainId(currentChainId);
      setWalletType(selectedWalletType);
      setIsConnected(true);

      // Setup listeners
      setupListeners(provider);

      // Persist connection
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletType', selectedWalletType || '');

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [setupListeners]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    const provider = getProvider();
    if (provider) {
      removeListeners(provider);
    }

    setIsConnected(false);
    setAddress(null);
    setChainId(null);
    setWalletType(null);
    setError(null);

    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletType');
  }, [getProvider, removeListeners]);

  // Switch chain (EVM only)
  const switchChain = useCallback(async (targetChainId: number) => {
    const provider = getProvider();
    if (!provider) {
      throw new Error('No wallet connected');
    }

    const targetChain = getChainByChainId(targetChainId);
    if (!targetChain) {
      throw new Error('Unsupported chain');
    }

    if (!targetChain.isEvm) {
      throw new Error(`Network switching is only supported for EVM chains. Please switch to ${targetChain.name} inside your wallet.`);
    }

    const chainIdHex = `0x${targetChainId.toString(16)}`;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added to wallet, try to add it
      if (switchError.code === 4902) {
        try {
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
        } catch (addError) {
          throw new Error(`Failed to add ${targetChain.name} network to wallet`);
        }
      } else {
        throw switchError;
      }
    }
  }, [getProvider]);

  // Auto-reconnect on mount
  useEffect(() => {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    const savedWalletType = localStorage.getItem('walletType') as WalletType;

    if (wasConnected && savedWalletType) {
      // Delay to ensure wallet extension is loaded
      const timeout = setTimeout(() => {
        connect(savedWalletType).catch(() => {
          // Silent fail for auto-reconnect
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('walletType');
        });
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, []);

  const value: WalletContextType = {
    isConnected,
    address,
    chainId,
    chain,
    walletType,
    isConnecting,
    error,
    connect,
    disconnect,
    switchChain,
    getProvider,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
