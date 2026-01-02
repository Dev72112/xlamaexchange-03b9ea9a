// WalletConnect configuration for EVM chains
import { createConfig, http } from '@wagmi/core';
import { injected, walletConnect } from '@wagmi/connectors';
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
  mode,
  aurora,
  klaytn,
} from 'viem/chains';
import { defineChain } from 'viem';

// Define X Layer chain (not in viem by default)
export const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'X Layer Explorer',
      url: 'https://www.okx.com/explorer/xlayer',
    },
  },
});

// Define X Layer Testnet
export const xlayerTestnet = defineChain({
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'X Layer Testnet Explorer',
      url: 'https://www.okx.com/explorer/xlayer-test',
    },
  },
  testnet: true,
});

// All supported EVM chains
export const supportedChains = [
  xlayer, // Primary chain - first
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
] as const;

// WalletConnect Project ID from environment (with runtime fallback to localStorage)
const wcFromEnv = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
const wcFromStorage =
  typeof window !== 'undefined' ? window.localStorage.getItem('walletconnectProjectId') || '' : '';

export const WALLETCONNECT_PROJECT_ID = wcFromEnv || wcFromStorage;

// Build connectors list - only include WalletConnect if Project ID is available
const getConnectors = () => {
  // Always include injected
  const list = [
    injected({
      shimDisconnect: true,
    }),
  ];

  // Important: Do NOT create the WalletConnect connector if the Project ID is missing.
  // Otherwise the modal can show "Project ID Not Configured".
  if (WALLETCONNECT_PROJECT_ID) {
    list.push(
      walletConnect({
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: true,
        metadata: {
          name: 'XLama Exchange',
          description: 'Multi-chain DEX Aggregator',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://xlama.exchange',
          icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : ''],
        },
      }) as ReturnType<typeof injected>
    );
  }

  return list;
};

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: getConnectors(),
  transports: {
    [xlayer.id]: http(),
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [avalanche.id]: http(),
    [linea.id]: http(),
    [scroll.id]: http(),
    [zkSync.id]: http(),
    [fantom.id]: http(),
    [gnosis.id]: http(),
    [celo.id]: http(),
    [moonbeam.id]: http(),
    [cronos.id]: http(),
    [mantle.id]: http(),
    [blast.id]: http(),
    [mode.id]: http(),
    [aurora.id]: http(),
    [klaytn.id]: http(),
  },
});

// Export chain ID mapping for easy lookup
export const chainIdToViem: Record<number, (typeof supportedChains)[number]> = {
  196: xlayer,
  1: mainnet,
  56: bsc,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  43114: avalanche,
  59144: linea,
  534352: scroll,
  324: zkSync,
  250: fantom,
  100: gnosis,
  42220: celo,
  1284: moonbeam,
  25: cronos,
  5000: mantle,
  81457: blast,
  34443: mode,
  1313161554: aurora,
  8217: klaytn,
};
