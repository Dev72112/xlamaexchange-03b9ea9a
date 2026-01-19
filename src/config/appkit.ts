// Reown AppKit configuration for EVM + Solana unified wallet connection
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  avalanche,
  base,
  linea,
  scroll,
  zkSync,
  fantom,
  gnosis,
  celo,
  moonbeam,
  cronos,
  mantle,
  blast,
  aurora,
  klaytn,
} from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

// Define X Layer (custom chain not in default list)
export const xlayer: AppKitNetwork = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'X Layer Explorer', url: 'https://www.okx.com/explorer/xlayer' },
  },
};

// Define Mode chain
export const mode: AppKitNetwork = {
  id: 34443,
  name: 'Mode',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.mode.network'] },
  },
  blockExplorers: {
    default: { name: 'Mode Explorer', url: 'https://explorer.mode.network' },
  },
};

// Define HyperEVM chain (Hyperliquid L1) - Required for Perpetuals trading
export const hyperEVM: AppKitNetwork = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVMScan', url: 'https://hyperevmscan.io' },
  },
};

// All supported EVM networks
export const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  xlayer, // Primary chain first
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  linea,
  scroll,
  zkSync,
  fantom,
  gnosis,
  celo,
  moonbeam,
  cronos,
  mantle,
  blast,
  mode,
  aurora,
  klaytn,
  hyperEVM, // HyperEVM for Perpetuals
];

// All networks including Solana
export const allNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ...evmNetworks,
  solana,
];

// AppKit metadata
export const appKitMetadata = {
  name: 'XLama Exchange',
  description: 'Multi-chain DEX Aggregator',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://xlama.exchange',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '/favicon.ico'],
};

// Storage version key to invalidate cached project IDs
const STORAGE_VERSION_KEY = 'walletconnect_version';
const CURRENT_VERSION = '2';

// Project ID - initially empty, always fetched from backend
export let projectId = '';

// Validate project ID format (should be 32 hex chars)
const isValidProjectId = (id: string): boolean => {
  return id.length >= 20 && /^[a-f0-9]+$/.test(id);
};

// Fetch project ID from edge function - ALWAYS fetch from backend
export const initializeProjectId = async (): Promise<string> => {
  try {
    const backendUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!backendUrl || !anonKey) {
      console.warn('[AppKit] Backend URL or anon key not available');
      return projectId;
    }

    // Check if cached version is outdated
    const cachedVersion = localStorage.getItem(STORAGE_VERSION_KEY) || '';
    const cachedProjectId = localStorage.getItem('walletconnectProjectId') || '';
    
    // Use cache only if version matches AND project ID is valid
    if (cachedVersion === CURRENT_VERSION && isValidProjectId(cachedProjectId)) {
      projectId = cachedProjectId;
      return projectId;
    }

    // Always fetch from backend
    const response = await fetch(`${backendUrl}/functions/v1/walletconnect-config`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.projectId && isValidProjectId(data.projectId)) {
        projectId = data.projectId;
        localStorage.setItem('walletconnectProjectId', data.projectId);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      } else {
        // Clear invalid cache
        localStorage.removeItem('walletconnectProjectId');
        localStorage.removeItem(STORAGE_VERSION_KEY);
      }
    } else {
      console.error('[AppKit] WalletConnect config request failed:', response.status);
    }
  } catch (error) {
    console.error('[AppKit] Failed to fetch WalletConnect config:', error);
  }

  return projectId;
};

// AppKit instances are initialized AFTER we have a valid projectId.
// (This avoids "Project ID not configured" on fresh devices where localStorage is empty.)
export let wagmiConfig: any;
export let appKit: ReturnType<typeof createAppKit> | null = null;

export const initializeAppKit = async (): Promise<void> => {
  await initializeProjectId();

  if (appKit && wagmiConfig) return;

  const wagmiAdapter = new WagmiAdapter({
    networks: evmNetworks,
    projectId,
  });

  const solanaAdapter = new SolanaAdapter({
    wallets: [], // AppKit auto-detects Phantom, Solflare, etc.
  });

  // Export the wagmi config from adapter
  wagmiConfig = wagmiAdapter.wagmiConfig;

  // Create AppKit instance with unified wallet-first experience
  appKit = createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    networks: allNetworks,
    projectId,
    metadata: appKitMetadata,
    features: {
      analytics: false,
      socials: false,
      email: false,
    },
    // Wallet-first: show all wallets, user picks chain after
    enableWalletGuide: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': 'hsl(142, 71%, 45%)',
      '--w3m-border-radius-master': '0.5rem',
    },
  });
};

