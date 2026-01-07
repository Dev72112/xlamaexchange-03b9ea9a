/**
 * OKX Universal Provider Wrapper
 * Enables multi-chain wallet connection (EVM, Solana, Sui, Tron, TON) through a single session
 */

import { OKXUniversalProvider, type SessionTypes } from '@okxconnect/universal-provider';
import { SUPPORTED_CHAINS, getEvmChains } from '@/data/chains';
import { getOkxWallet, type OkxWalletExtension } from '@/lib/wallet-deeplinks';

// Extend Window interface for tronWeb only
declare global {
  interface Window {
    tronWeb?: {
      defaultAddress?: {
        base58?: string;
      };
    };
  }
}

// Chain namespace mapping for OKX Connect
export const OKX_NAMESPACES = {
  // EVM chains use eip155 namespace
  eip155: {
    chains: getEvmChains().map(c => `eip155:${c.chainId}`),
    methods: [
      'eth_sendTransaction',
      'eth_signTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData',
      'eth_signTypedData_v4',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
    ],
    events: ['accountsChanged', 'chainChanged'],
    defaultChain: 'eip155:1', // Ethereum mainnet
  },
  // Solana
  solana: {
    chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'], // Mainnet
    methods: ['solana_signMessage', 'solana_signTransaction', 'solana_signAllTransactions'],
    events: ['accountsChanged'],
    defaultChain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};

// Optional namespaces (connect if wallet supports)
export const OKX_OPTIONAL_NAMESPACES = {
  // Tron - uses eip155:195 in OKX
  tron: {
    chains: ['tron:0x2b6653dc'], // Tron mainnet
    methods: ['tron_signMessage', 'tron_signTransaction'],
    events: ['accountsChanged'],
  },
  // Sui
  sui: {
    chains: ['sui:mainnet'],
    methods: ['sui_signMessage', 'sui_signTransactionBlock', 'sui_signAndExecuteTransactionBlock'],
    events: ['accountsChanged'],
  },
  // TON
  ton: {
    chains: ['ton:mainnet'],
    methods: ['ton_signMessage', 'ton_sendTransaction'],
    events: ['accountsChanged'],
  },
};

export interface OkxSession {
  topic: string;
  namespaces: SessionTypes.Namespaces;
  expiry: number;
  addresses: {
    evm: string | null;
    solana: string | null;
    tron: string | null;
    sui: string | null;
    ton: string | null;
  };
}

export interface OkxProviderState {
  provider: OKXUniversalProvider | null;
  session: OkxSession | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

const OKX_SESSION_KEY = 'xlama_okx_session';
const OKX_PROJECT_ID = 'xlama-dex'; // App identifier for OKX

/**
 * Initialize OKX Universal Provider
 */
export async function initOkxProvider(): Promise<OKXUniversalProvider | null> {
  try {
    const provider = await OKXUniversalProvider.init({
      dappMetaData: {
        name: 'xLama DEX',
        icon: `${window.location.origin}/xlama-mascot.png`,
      },
    });
    
    console.log('[OKX] Provider initialized');
    return provider;
  } catch (error) {
    console.error('[OKX] Failed to init provider:', error);
    return null;
  }
}

/**
 * Connect to OKX wallet with multi-namespace support
 */
export async function connectOkxWallet(provider: OKXUniversalProvider): Promise<OkxSession | null> {
  try {
    const session = await provider.connect({
      namespaces: OKX_NAMESPACES,
      optionalNamespaces: OKX_OPTIONAL_NAMESPACES,
    });
    
    if (!session) {
      throw new Error('No session returned from OKX');
    }
    
    // Extract addresses from session
    const addresses = extractAddresses(session.namespaces);
    
    const okxSession: OkxSession = {
      topic: session.topic,
      namespaces: session.namespaces,
      expiry: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      addresses,
    };
    
    // Persist session
    saveOkxSession(okxSession);
    
    console.log('[OKX] Connected with addresses:', addresses);
    return okxSession;
  } catch (error: any) {
    console.error('[OKX] Connection failed:', error);
    throw error;
  }
}

/**
 * Extract addresses from session namespaces
 */
function extractAddresses(namespaces: SessionTypes.Namespaces): OkxSession['addresses'] {
  const addresses: OkxSession['addresses'] = {
    evm: null,
    solana: null,
    tron: null,
    sui: null,
    ton: null,
  };
  
  // EVM address (from eip155 namespace)
  if (namespaces.eip155?.accounts?.[0]) {
    // Format: eip155:1:0x...
    const parts = namespaces.eip155.accounts[0].split(':');
    addresses.evm = parts[2] || null;
  }
  
  // Solana address
  if (namespaces.solana?.accounts?.[0]) {
    // Format: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:...
    const parts = namespaces.solana.accounts[0].split(':');
    addresses.solana = parts[2] || null;
  }
  
  // Tron address (if supported)
  if (namespaces.tron?.accounts?.[0]) {
    const parts = namespaces.tron.accounts[0].split(':');
    addresses.tron = parts[2] || null;
  }
  
  // Sui address (if supported)
  if (namespaces.sui?.accounts?.[0]) {
    const parts = namespaces.sui.accounts[0].split(':');
    addresses.sui = parts[2] || null;
  }
  
  // TON address (if supported)
  if (namespaces.ton?.accounts?.[0]) {
    const parts = namespaces.ton.accounts[0].split(':');
    addresses.ton = parts[2] || null;
  }
  
  return addresses;
}

/**
 * Switch active chain for OKX provider (seamless, no signing needed)
 */
export async function switchOkxChain(
  provider: OKXUniversalProvider, 
  chainIndex: string
): Promise<boolean> {
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  if (!chain) return false;
  
  try {
    if (chain.isEvm && chain.chainId) {
      // EVM: use setDefaultChain
      provider.setDefaultChain(`eip155:${chain.chainId}`, 'eip155');
    } else {
      // Non-EVM: set the default chain for that namespace
      const namespace = getNamespaceForChain(chainIndex);
      if (namespace) {
        provider.setDefaultChain(namespace.chain, namespace.namespace);
      }
    }
    
    console.log(`[OKX] Switched to chain: ${chain.name}`);
    return true;
  } catch (error) {
    console.error('[OKX] Chain switch failed:', error);
    return false;
  }
}

/**
 * Get namespace info for a chain
 */
function getNamespaceForChain(chainIndex: string): { namespace: string; chain: string } | null {
  switch (chainIndex) {
    case '501': // Solana
      return { namespace: 'solana', chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' };
    case '195': // Tron
      return { namespace: 'tron', chain: 'tron:0x2b6653dc' };
    case '784': // Sui
      return { namespace: 'sui', chain: 'sui:mainnet' };
    case '607': // TON
      return { namespace: 'ton', chain: 'ton:mainnet' };
    default:
      // EVM chain
      const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
      if (chain?.isEvm && chain.chainId) {
        return { namespace: 'eip155', chain: `eip155:${chain.chainId}` };
      }
      return null;
  }
}

/**
 * Disconnect OKX session
 */
export async function disconnectOkx(provider: OKXUniversalProvider): Promise<void> {
  try {
    await provider.disconnect();
    clearOkxSession();
    console.log('[OKX] Disconnected');
  } catch (error) {
    console.error('[OKX] Disconnect error:', error);
    clearOkxSession();
  }
}

/**
 * Check if OKX wallet extension is available
 */
export function isOkxExtensionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const okx = getOkxWallet();
  return !!(okx || (window.ethereum && (window.ethereum as any).isOKXWallet));
}

/**
 * Check if running inside OKX app browser
 */
export function isInOkxBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getOkxWallet();
}

/**
 * Check if we should use extension vs Universal Provider
 */
export function shouldUseOkxExtension(): boolean {
  return isOkxExtensionAvailable() || isInOkxBrowser();
}

/**
 * Get OKX wallet provider for direct extension calls (desktop)
 */
export function getOkxExtensionProvider(): OkxWalletExtension | null {
  if (typeof window === 'undefined') return null;
  return getOkxWallet() || null;
}

/**
 * Connect via OKX extension (EIP-1193 direct call)
 */
export async function connectOkxExtension(): Promise<OkxSession | null> {
  const okx = getOkxWallet();
  if (!okx) {
    throw new Error('OKX extension not found');
  }
  
  try {
    // Request EVM accounts
    const accounts = await okx.request({
      method: 'eth_requestAccounts'
    });
    
    if (!accounts || !accounts[0]) {
      throw new Error('No accounts returned');
    }
    
    // Try to get Solana address
    let solanaAddr = null;
    try {
      if (okx.solana) {
        const resp = await okx.solana.connect();
        solanaAddr = resp?.publicKey?.toString() || null;
      }
    } catch (e) {
      console.warn('[OKX] Solana connection failed:', e);
    }
    
    // Try to get Tron address
    let tronAddr = null;
    try {
      if (window.tronWeb?.defaultAddress?.base58) {
        tronAddr = window.tronWeb.defaultAddress.base58;
      }
    } catch (e) {
      console.warn('[OKX] Tron address fetch failed:', e);
    }
    
    const session: OkxSession = {
      topic: 'extension',
      namespaces: {},
      expiry: Date.now() + (7 * 24 * 60 * 60 * 1000),
      addresses: {
        evm: accounts[0],
        solana: solanaAddr,
        tron: tronAddr,
        sui: null,
        ton: null,
      },
    };
    
    saveOkxSession(session);
    console.log('[OKX] Connected via extension:', session.addresses);
    return session;
  } catch (error: any) {
    console.error('[OKX] Extension connect failed:', error);
    throw error;
  }
}

/**
 * Save OKX session to localStorage
 */
export function saveOkxSession(session: OkxSession): void {
  try {
    localStorage.setItem(OKX_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[OKX] Failed to save session:', error);
  }
}

/**
 * Get OKX session from localStorage
 */
export function getOkxSession(): OkxSession | null {
  try {
    const stored = localStorage.getItem(OKX_SESSION_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as OkxSession;
    
    // Check expiry
    if (session.expiry < Date.now()) {
      clearOkxSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.warn('[OKX] Failed to get session:', error);
    return null;
  }
}

/**
 * Clear OKX session from localStorage
 */
export function clearOkxSession(): void {
  try {
    localStorage.removeItem(OKX_SESSION_KEY);
  } catch (error) {
    console.warn('[OKX] Failed to clear session:', error);
  }
}

/**
 * Send transaction via OKX provider
 */
export async function sendOkxTransaction(
  provider: OKXUniversalProvider,
  chainIndex: string,
  transaction: any
): Promise<string> {
  const namespace = getNamespaceForChain(chainIndex);
  if (!namespace) throw new Error('Unsupported chain');
  
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  
  if (chain?.isEvm) {
    // EVM transaction
    const result = await provider.request(
      { method: 'eth_sendTransaction', params: [transaction] },
      namespace.chain
    );
    return result as string;
  } else if (chainIndex === '501') {
    // Solana transaction
    const result = await provider.request(
      { method: 'solana_signTransaction', params: transaction },
      namespace.chain
    );
    return result as string;
  }
  
  throw new Error('Transaction method not implemented for this chain');
}

/**
 * Sign message via OKX provider
 */
export async function signOkxMessage(
  provider: OKXUniversalProvider,
  chainIndex: string,
  message: string,
  address: string
): Promise<string> {
  const namespace = getNamespaceForChain(chainIndex);
  if (!namespace) throw new Error('Unsupported chain');
  
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  
  if (chain?.isEvm) {
    // EVM personal_sign
    const result = await provider.request(
      { method: 'personal_sign', params: [message, address] },
      namespace.chain
    );
    return result as string;
  } else if (chainIndex === '501') {
    // Solana sign message
    const result = await provider.request(
      { method: 'solana_signMessage', params: { message } },
      namespace.chain
    );
    return (result as any).signature;
  }
  
  throw new Error('Sign method not implemented for this chain');
}
