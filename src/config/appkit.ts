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

// Project ID from environment or localStorage
const getProjectId = (): string => {
  const fromEnv = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
  const fromStorage = typeof window !== 'undefined' ? localStorage.getItem('walletconnectProjectId') || '' : '';
  return fromEnv || fromStorage || '';
};

export let projectId = getProjectId();

// Fetch project ID from edge function and reinitialize if needed
export const initializeProjectId = async (): Promise<string> => {
  if (projectId) return projectId;
  
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return projectId;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/walletconnect-config`);
    if (response.ok) {
      const data = await response.json();
      if (data.projectId) {
        projectId = data.projectId;
        localStorage.setItem('walletconnectProjectId', data.projectId);
        console.log('[AppKit] WalletConnect Project ID loaded from edge function');
      }
    }
  } catch (error) {
    console.warn('[AppKit] Failed to fetch WalletConnect config:', error);
  }
  
  return projectId;
};

// Create Wagmi adapter for EVM chains
export const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId,
});

// Create Solana adapter
export const solanaAdapter = new SolanaAdapter({
  wallets: [], // AppKit auto-detects Phantom, Solflare, etc.
});

// Create AppKit instance immediately
export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks: allNetworks,
  projectId,
  metadata: appKitMetadata,
  features: {
    analytics: false,
    socials: false,
    email: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': 'hsl(142, 71%, 45%)', // Match app primary color
    '--w3m-border-radius-master': '0.5rem',
  },
});

// Export the wagmi config from adapter
export const wagmiConfig = wagmiAdapter.wagmiConfig;
