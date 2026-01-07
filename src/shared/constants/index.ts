/**
 * Shared Constants - Barrel Export
 */

// Chain data
export { 
  SUPPORTED_CHAINS,
  getChainByIndex, 
  getChainByChainId,
  getPrimaryChain,
  getEvmChains,
  getNonEvmChains,
  isNonEvmChain,
  getExplorerTxUrl,
  NATIVE_TOKEN_ADDRESS,
} from './chains';

export type { Chain } from './chains';

// Currency data
export { popularCurrencies, getCurrencyByTicker } from './currencies';
export type { Currency } from './currencies';
