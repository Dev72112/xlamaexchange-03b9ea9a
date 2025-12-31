export interface Chain {
  chainIndex: string;
  chainId: number | null;
  name: string;
  shortName: string;
  icon: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  isPrimary?: boolean;
  isEvm: boolean;
}

export const SUPPORTED_CHAINS: Chain[] = [
  {
    chainIndex: '196',
    chainId: 196,
    name: 'X Layer',
    shortName: 'X Layer',
    icon: 'https://static.okx.com/cdn/wallet/logo/xlayer.png',
    rpcUrl: 'https://rpc.xlayer.tech',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    blockExplorer: 'https://www.okx.com/web3/explorer/xlayer',
    isPrimary: true,
    isEvm: true,
  },
  {
    chainIndex: '1',
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    icon: 'https://static.okx.com/cdn/wallet/logo/ETH-20220328.png',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io',
    isEvm: true,
  },
  {
    chainIndex: '8453',
    chainId: 8453,
    name: 'Base',
    shortName: 'Base',
    icon: 'https://static.okx.com/cdn/wallet/logo/base_20230825.png',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org',
    isEvm: true,
  },
  {
    chainIndex: '137',
    chainId: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    icon: 'https://static.okx.com/cdn/wallet/logo/MATIC-20220415.png',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com',
    isEvm: true,
  },
  {
    chainIndex: '42161',
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    icon: 'https://static.okx.com/cdn/wallet/logo/arb_20220525.png',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io',
    isEvm: true,
  },
  {
    chainIndex: '10',
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    icon: 'https://static.okx.com/cdn/wallet/logo/op.png',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io',
    isEvm: true,
  },
  {
    chainIndex: '56',
    chainId: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    icon: 'https://static.okx.com/cdn/wallet/logo/BNB-20220308.png',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorer: 'https://bscscan.com',
    isEvm: true,
  },
  {
    chainIndex: '43114',
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'AVAX',
    icon: 'https://static.okx.com/cdn/wallet/logo/AVAX-20220318.png',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    blockExplorer: 'https://snowtrace.io',
    isEvm: true,
  },
  {
    chainIndex: '324',
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zkSync',
    icon: 'https://static.okx.com/cdn/wallet/logo/zksync-era.png',
    rpcUrl: 'https://mainnet.era.zksync.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://explorer.zksync.io',
    isEvm: true,
  },
  {
    chainIndex: '59144',
    chainId: 59144,
    name: 'Linea',
    shortName: 'Linea',
    icon: 'https://static.okx.com/cdn/wallet/logo/linea.png',
    rpcUrl: 'https://rpc.linea.build',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://lineascan.build',
    isEvm: true,
  },
  {
    chainIndex: '501',
    chainId: null,
    name: 'Solana',
    shortName: 'SOL',
    icon: 'https://static.okx.com/cdn/wallet/logo/SOL-20220318.png',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com',
    isEvm: false,
  },
];

export function getChainByIndex(chainIndex: string): Chain | undefined {
  return SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
}

export function getChainByChainId(chainId: number): Chain | undefined {
  return SUPPORTED_CHAINS.find(c => c.chainId === chainId);
}

export function getPrimaryChain(): Chain {
  return SUPPORTED_CHAINS.find(c => c.isPrimary) || SUPPORTED_CHAINS[0];
}

export function getEvmChains(): Chain[] {
  return SUPPORTED_CHAINS.filter(c => c.isEvm);
}

// Native token address for EVM chains (used for native ETH, BNB, etc.)
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
