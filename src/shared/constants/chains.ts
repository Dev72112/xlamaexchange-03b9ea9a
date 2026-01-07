/**
 * Chain Constants
 * Centralized chain data for the application
 */

// Re-export from existing data file
export { 
  SUPPORTED_CHAINS,
  getChainByIndex, 
  getChainByChainId,
  getPrimaryChain,
  getEvmChains,
  getNonEvmChains,
  NON_EVM_CHAIN_INDEXES,
  isNonEvmChain,
  DEFAULT_CHAIN_ICON,
  getChainIcon,
  NATIVE_TOKEN_ADDRESS,
  getExplorerTxUrl,
} from '@/data/chains';

export type { Chain } from '@/data/chains';
