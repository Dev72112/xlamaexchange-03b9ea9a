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

// Use reliable CDN sources for chain icons
const CHAIN_ICONS = {
  xlayer: 'https://assets.coingecko.com/coins/images/4463/small/WesyFn7A_400x400.jpeg',
  ethereum: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  base: 'https://assets.coingecko.com/coins/images/31164/small/base-token.png',
  polygon: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  arbitrum: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  optimism: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  bsc: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  avalanche: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  zksync: 'https://assets.coingecko.com/coins/images/28597/small/zksync.png',
  linea: 'https://assets.coingecko.com/coins/images/31005/small/linea.png',
  solana: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  fantom: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  cronos: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png',
  mantle: 'https://assets.coingecko.com/coins/images/30980/small/token-logo.png',
  scroll: 'https://assets.coingecko.com/coins/images/31422/small/scroll.png',
  blast: 'https://assets.coingecko.com/coins/images/35494/small/blast.jpeg',
  manta: 'https://assets.coingecko.com/coins/images/34147/small/manta-token.png',
  metis: 'https://assets.coingecko.com/coins/images/15595/small/metis.jpeg',
  polygonZkEvm: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  tron: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  sui: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  ton: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
  sonic: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  gnosis: 'https://assets.coingecko.com/coins/images/662/small/logo_square_simple_300px.png',
  celo: 'https://assets.coingecko.com/coins/images/11090/small/InjsRfJ9_400x400.png',
};

export const SUPPORTED_CHAINS: Chain[] = [
  // Primary: X Layer
  {
    chainIndex: '196',
    chainId: 196,
    name: 'X Layer',
    shortName: 'X Layer',
    icon: CHAIN_ICONS.xlayer,
    rpcUrl: 'https://rpc.xlayer.tech',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    blockExplorer: 'https://www.okx.com/web3/explorer/xlayer',
    isPrimary: true,
    isEvm: true,
  },
  // Major EVM chains
  {
    chainIndex: '1',
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    icon: CHAIN_ICONS.ethereum,
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
    icon: CHAIN_ICONS.base,
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
    icon: CHAIN_ICONS.polygon,
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
    icon: CHAIN_ICONS.arbitrum,
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
    icon: CHAIN_ICONS.optimism,
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
    icon: CHAIN_ICONS.bsc,
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
    icon: CHAIN_ICONS.avalanche,
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
    icon: CHAIN_ICONS.zksync,
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
    icon: CHAIN_ICONS.linea,
    rpcUrl: 'https://rpc.linea.build',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://lineascan.build',
    isEvm: true,
  },
  // Additional EVM chains
  {
    chainIndex: '250',
    chainId: 250,
    name: 'Fantom Opera',
    shortName: 'FTM',
    icon: CHAIN_ICONS.fantom,
    rpcUrl: 'https://rpc.ftm.tools',
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    blockExplorer: 'https://ftmscan.com',
    isEvm: true,
  },
  {
    chainIndex: '25',
    chainId: 25,
    name: 'Cronos',
    shortName: 'CRO',
    icon: CHAIN_ICONS.cronos,
    rpcUrl: 'https://evm.cronos.org',
    nativeCurrency: { name: 'Cronos', symbol: 'CRO', decimals: 18 },
    blockExplorer: 'https://cronoscan.com',
    isEvm: true,
  },
  {
    chainIndex: '5000',
    chainId: 5000,
    name: 'Mantle',
    shortName: 'MNT',
    icon: CHAIN_ICONS.mantle,
    rpcUrl: 'https://rpc.mantle.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    blockExplorer: 'https://explorer.mantle.xyz',
    isEvm: true,
  },
  {
    chainIndex: '534352',
    chainId: 534352,
    name: 'Scroll',
    shortName: 'Scroll',
    icon: CHAIN_ICONS.scroll,
    rpcUrl: 'https://rpc.scroll.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://scrollscan.com',
    isEvm: true,
  },
  {
    chainIndex: '81457',
    chainId: 81457,
    name: 'Blast',
    shortName: 'Blast',
    icon: CHAIN_ICONS.blast,
    rpcUrl: 'https://rpc.blast.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://blastscan.io',
    isEvm: true,
  },
  {
    chainIndex: '169',
    chainId: 169,
    name: 'Manta Pacific',
    shortName: 'Manta',
    icon: CHAIN_ICONS.manta,
    rpcUrl: 'https://pacific-rpc.manta.network/http',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://pacific-explorer.manta.network',
    isEvm: true,
  },
  {
    chainIndex: '1088',
    chainId: 1088,
    name: 'Metis',
    shortName: 'Metis',
    icon: CHAIN_ICONS.metis,
    rpcUrl: 'https://andromeda.metis.io/?owner=1088',
    nativeCurrency: { name: 'Metis', symbol: 'METIS', decimals: 18 },
    blockExplorer: 'https://andromeda-explorer.metis.io',
    isEvm: true,
  },
  {
    chainIndex: '1101',
    chainId: 1101,
    name: 'Polygon zkEVM',
    shortName: 'zkPoly',
    icon: CHAIN_ICONS.polygonZkEvm,
    rpcUrl: 'https://zkevm-rpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://zkevm.polygonscan.com',
    isEvm: true,
  },
  {
    chainIndex: '146',
    chainId: 146,
    name: 'Sonic',
    shortName: 'SONIC',
    icon: CHAIN_ICONS.sonic,
    rpcUrl: 'https://rpc.soniclabs.com',
    nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
    blockExplorer: 'https://sonicscan.org',
    isEvm: true,
  },
  {
    chainIndex: '100',
    chainId: 100,
    name: 'Gnosis',
    shortName: 'GNO',
    icon: CHAIN_ICONS.gnosis,
    rpcUrl: 'https://rpc.gnosischain.com',
    nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
    blockExplorer: 'https://gnosisscan.io',
    isEvm: true,
  },
  {
    chainIndex: '42220',
    chainId: 42220,
    name: 'Celo',
    shortName: 'CELO',
    icon: CHAIN_ICONS.celo,
    rpcUrl: 'https://forno.celo.org',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    blockExplorer: 'https://celoscan.io',
    isEvm: true,
  },
  // Non-EVM chains
  {
    chainIndex: '501',
    chainId: null,
    name: 'Solana',
    shortName: 'SOL',
    icon: CHAIN_ICONS.solana,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    blockExplorer: 'https://explorer.solana.com',
    isEvm: false,
  },
  {
    chainIndex: '195',
    chainId: null,
    name: 'Tron',
    shortName: 'TRX',
    icon: CHAIN_ICONS.tron,
    rpcUrl: 'https://api.trongrid.io',
    nativeCurrency: { name: 'Tron', symbol: 'TRX', decimals: 6 },
    blockExplorer: 'https://tronscan.org',
    isEvm: false,
  },
  {
    chainIndex: '784',
    chainId: null,
    name: 'Sui',
    shortName: 'SUI',
    icon: CHAIN_ICONS.sui,
    rpcUrl: 'https://fullnode.mainnet.sui.io',
    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
    blockExplorer: 'https://suiscan.xyz',
    isEvm: false,
  },
  {
    chainIndex: '607',
    chainId: null,
    name: 'TON',
    shortName: 'TON',
    icon: CHAIN_ICONS.ton,
    rpcUrl: 'https://toncenter.com/api/v2',
    nativeCurrency: { name: 'Toncoin', symbol: 'TON', decimals: 9 },
    blockExplorer: 'https://tonscan.org',
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

export function getNonEvmChains(): Chain[] {
  return SUPPORTED_CHAINS.filter(c => !c.isEvm);
}

// Default fallback icon
export const DEFAULT_CHAIN_ICON = 'https://ui-avatars.com/api/?name=C&background=6366f1&color=fff&size=128';

// Get chain icon with fallback
export function getChainIcon(chain: Chain): string {
  return chain.icon || DEFAULT_CHAIN_ICON;
}

// Native token address for EVM chains (used for native ETH, BNB, etc.)
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
