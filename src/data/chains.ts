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

// Use reliable CDN sources for chain icons - prefer CoinGecko and raw.githubusercontent for reliability
const CHAIN_ICONS: Record<string, string> = {
  xlayer: 'https://static.okx.com/cdn/explorer/chain/1710316193959.png',
  ethereum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  base: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  polygon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  arbitrum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  optimism: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  bsc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
  avalanche: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  zksync: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
  linea: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png',
  solana: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  fantom: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png',
  cronos: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cronos/info/logo.png',
  mantle: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/mantle/info/logo.png',
  scroll: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/info/logo.png',
  blast: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/blast/info/logo.png',
  manta: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/manta/info/logo.png',
  metis: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/metis/info/logo.png',
  polygonZkEvm: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygonzkevm/info/logo.png',
  tron: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
  sui: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png',
  ton: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
  sonic: 'https://assets.coingecko.com/coins/images/38454/small/sonic.png',
  conflux: 'https://assets.coingecko.com/coins/images/13079/small/conflux.png',
  merlin: 'https://assets.coingecko.com/coins/images/35449/small/merlin.png',
  zetachain: 'https://assets.coingecko.com/coins/images/26718/small/zetachain.png',
  unichain: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/unichain/info/logo.png',
  monad: 'https://assets.coingecko.com/coins/images/39498/small/monad.png',
  plasma: 'https://ui-avatars.com/api/?name=PL&background=7c3aed&color=fff&size=128',
};

// OKX DEX Supported Chains - Based on official docs
export const SUPPORTED_CHAINS: Chain[] = [
  // Primary: X Layer
  {
    chainIndex: '196',
    chainId: 196,
    name: 'X Layer',
    shortName: 'XL',
    icon: CHAIN_ICONS.xlayer,
    rpcUrl: 'https://rpc.xlayer.tech',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    blockExplorer: 'https://www.okx.com/web3/explorer/xlayer',
    isPrimary: true,
    isEvm: true,
  },
  // EVM Chains from OKX docs
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
    chainIndex: '10',
    chainId: 10,
    name: 'OP Mainnet',
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
    chainIndex: '1030',
    chainId: 1030,
    name: 'Conflux eSpace',
    shortName: 'CFX',
    icon: CHAIN_ICONS.conflux,
    rpcUrl: 'https://evm.confluxrpc.com',
    nativeCurrency: { name: 'Conflux', symbol: 'CFX', decimals: 18 },
    blockExplorer: 'https://evm.confluxscan.io',
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
    chainIndex: '4200',
    chainId: 4200,
    name: 'Merlin Chain',
    shortName: 'Merlin',
    icon: CHAIN_ICONS.merlin,
    rpcUrl: 'https://rpc.merlinchain.io',
    nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
    blockExplorer: 'https://scan.merlinchain.io',
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
    chainIndex: '7000',
    chainId: 7000,
    name: 'ZetaChain',
    shortName: 'ZETA',
    icon: CHAIN_ICONS.zetachain,
    rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
    blockExplorer: 'https://explorer.zetachain.com',
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
    chainIndex: '130',
    chainId: 130,
    name: 'Unichain',
    shortName: 'UNI',
    icon: CHAIN_ICONS.unichain,
    rpcUrl: 'https://mainnet.unichain.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://uniscan.xyz',
    isEvm: true,
  },
  // New EVM chains from OKX DEX API (January 2025)
  {
    chainIndex: '143',
    chainId: 143,
    name: 'Monad',
    shortName: 'MONAD',
    icon: CHAIN_ICONS.monad,
    rpcUrl: 'https://rpc.monad.xyz',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    blockExplorer: 'https://explorer.monad.xyz',
    isEvm: true,
  },
  {
    chainIndex: '9745',
    chainId: 9745,
    name: 'Plasma',
    shortName: 'PLASMA',
    icon: CHAIN_ICONS.plasma,
    rpcUrl: 'https://rpc.plasma.io',
    nativeCurrency: { name: 'Plasma', symbol: 'PLASMA', decimals: 18 },
    blockExplorer: 'https://explorer.plasma.io',
    isEvm: true,
  },
  // Non-EVM chains from OKX docs
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

// Non-EVM chain indexes for quick checks
export const NON_EVM_CHAIN_INDEXES = ['501', '195', '784', '607']; // Solana, Tron, Sui, TON

export function isNonEvmChain(chainIndex: string): boolean {
  return NON_EVM_CHAIN_INDEXES.includes(chainIndex);
}

// Default fallback icon
export const DEFAULT_CHAIN_ICON = 'https://ui-avatars.com/api/?name=C&background=6366f1&color=fff&size=128';

// Get chain icon with fallback
export function getChainIcon(chain: Chain): string {
  return chain.icon || DEFAULT_CHAIN_ICON;
}

// Native token address for EVM chains (used for native ETH, BNB, etc.)
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Get explorer transaction URL for a chain
export function getExplorerTxUrl(chainIndex: string, txHash: string): string | null {
  const chain = getChainByIndex(chainIndex);
  if (!chain) return null;
  
  // Handle special cases for non-standard explorers
  switch (chainIndex) {
    case '501': // Solana
      return `https://solscan.io/tx/${txHash}`;
    case '784': // Sui
      return `https://suiscan.xyz/mainnet/tx/${txHash}`;
    case '607': // TON
      return `https://tonscan.org/tx/${txHash}`;
    case '195': // Tron
      return `https://tronscan.org/#/transaction/${txHash}`;
    case '196': // X Layer
      return `https://www.okx.com/web3/explorer/xlayer/tx/${txHash}`;
    default:
      // Standard EVM explorers
      return `${chain.blockExplorer}/tx/${txHash}`;
  }
}
