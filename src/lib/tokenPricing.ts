/**
 * Token pricing utilities with multi-source fallback strategies
 * 
 * Resolution chain:
 * 1. OKX Market API (primary - fastest)
 * 2. Aggregator Router Result (from swap quote)
 * 3. DexScreener API (supports many DEX pairs)
 * 4. CoinGecko/DefiLlama (major tokens)
 * 5. X Layer Token Mappings (wrapped tokens like XBTC, XETH, XSOL)
 * 6. Stablecoin Fallback ($1.00)
 */

import { dexScreenerService } from '@/services/dexscreener';
import { defiLlamaService } from '@/services/defillama';
import {
  isXLayerStablecoin,
  isXLayerWrappedToken,
  getXLayerUnderlyingAsset,
  isXLayerChain,
  XLAYER_CHAIN_INDEX,
} from './xlayerTokens';

// Stablecoins that should always be priced at ~$1.00
const STABLECOINS = new Set([
  'USDT', 'USDC', 'USDG', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 
  'USDD', 'USDN', 'MIM', 'GUSD', 'USDP', 'SUSD', 'CUSD', 'EURS',
  'EUROC', 'EURT', 'PYUSD', 'FDUSD', 'USD₮0'
]);

/**
 * Get fallback price for known stablecoins
 * Returns 1.0 for stablecoins, null for other tokens
 */
export function getStablecoinFallbackPrice(symbol: string): number | null {
  const upper = symbol.toUpperCase();
  if (STABLECOINS.has(upper)) {
    return 1.0;
  }
  return null;
}

/**
 * Extract token prices from OKX router result
 * These are more reliable than the price API for newer tokens
 */
export function extractRouterPrices(routerResult: any): {
  fromTokenPrice: number | null;
  toTokenPrice: number | null;
} {
  if (!routerResult) {
    return { fromTokenPrice: null, toTokenPrice: null };
  }

  // Try multiple possible fields for token unit prices
  const fromPrice = 
    parseFloatSafe(routerResult.fromTokenUnitPrice) ||
    parseFloatSafe(routerResult.fromTokenPrice) ||
    null;

  const toPrice = 
    parseFloatSafe(routerResult.toTokenUnitPrice) ||
    parseFloatSafe(routerResult.toTokenPrice) ||
    null;

  return { fromTokenPrice: fromPrice, toTokenPrice: toPrice };
}

/**
 * Get the best available price for a token
 * Priority: API price > Router price > Stablecoin fallback
 */
export function getBestPrice(
  apiPrice: number | null | undefined,
  routerPrice: number | null | undefined,
  tokenSymbol: string
): number | null {
  // Use API price if valid
  if (apiPrice && apiPrice > 0) {
    return apiPrice;
  }

  // Fall back to router price
  if (routerPrice && routerPrice > 0) {
    return routerPrice;
  }

  // Final fallback: stablecoin default
  return getStablecoinFallbackPrice(tokenSymbol);
}

/**
 * Calculate USD value with multiple fallbacks
 */
export function calculateUsdValue(
  amount: number,
  apiPrice: number | null | undefined,
  routerPrice: number | null | undefined,
  tokenSymbol: string
): number | null {
  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  const price = getBestPrice(apiPrice, routerPrice, tokenSymbol);
  if (!price) {
    return null;
  }

  return amount * price;
}

/**
 * Safe parseFloat that handles nullish values
 */
function parseFloatSafe(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = parseFloat(String(value));
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * Get price for X Layer wrapped tokens by looking up underlying asset price
 * Uses CoinGecko/DefiLlama for underlying asset prices (BTC, ETH, SOL, etc.)
 */
export async function getXLayerWrappedTokenPrice(tokenAddress: string): Promise<number | null> {
  const underlying = getXLayerUnderlyingAsset(tokenAddress);
  if (!underlying) return null;

  // Get price from DefiLlama (uses CoinGecko IDs)
  const price = await defiLlamaService.getPrice(underlying);
  return price;
}

/**
 * Get price from DexScreener (for chains it supports)
 * Note: X Layer is NOT supported by DexScreener
 */
export async function getDexScreenerPrice(chainIndex: string, tokenAddress: string): Promise<number | null> {
  // Skip if chain not supported
  if (!dexScreenerService.isChainSupported(chainIndex)) {
    return null;
  }
  
  return await dexScreenerService.getPrice(chainIndex, tokenAddress);
}

/**
 * Enhanced price resolution with multiple fallback sources
 * 
 * Order of resolution:
 * 1. API price (passed in, from OKX Market API)
 * 2. Router price (from aggregator quote)
 * 3. DexScreener (for supported chains)
 * 4. DefiLlama/CoinGecko (for major tokens by symbol)
 * 5. X Layer wrapped token mapping (for XBTC, XETH, XSOL)
 * 6. Stablecoin fallback ($1.00)
 */
export async function getEnhancedPrice(
  chainIndex: string,
  tokenAddress: string,
  tokenSymbol: string,
  apiPrice?: number | null,
  routerPrice?: number | null
): Promise<number | null> {
  // 1. Use API price if valid
  if (apiPrice && apiPrice > 0) {
    return apiPrice;
  }

  // 2. Fall back to router price
  if (routerPrice && routerPrice > 0) {
    return routerPrice;
  }

  // 3. Check X Layer stablecoins first (before DexScreener)
  if (isXLayerChain(chainIndex) && isXLayerStablecoin(tokenAddress)) {
    return 1.0;
  }

  // 4. Try DexScreener (for supported chains - NOT X Layer)
  if (dexScreenerService.isChainSupported(chainIndex)) {
    const dexPrice = await dexScreenerService.getPrice(chainIndex, tokenAddress);
    if (dexPrice && dexPrice > 0) {
      return dexPrice;
    }
  }

  // 5. Try DefiLlama by symbol (for major tokens)
  const defiLlamaPrice = await defiLlamaService.getPrice(tokenSymbol);
  if (defiLlamaPrice && defiLlamaPrice > 0) {
    return defiLlamaPrice;
  }

  // 6. For X Layer wrapped tokens, get underlying asset price
  if (isXLayerChain(chainIndex) && isXLayerWrappedToken(tokenAddress)) {
    const wrappedPrice = await getXLayerWrappedTokenPrice(tokenAddress);
    if (wrappedPrice && wrappedPrice > 0) {
      return wrappedPrice;
    }
  }

  // 7. Stablecoin fallback
  return getStablecoinFallbackPrice(tokenSymbol);
}

/**
 * Synchronous version of enhanced price resolution (without async fallbacks)
 * Uses only pre-fetched prices and stablecoin fallbacks
 */
export function getEnhancedPriceSync(
  chainIndex: string,
  tokenAddress: string,
  tokenSymbol: string,
  apiPrice?: number | null,
  routerPrice?: number | null
): number | null {
  // 1. Use API price if valid
  if (apiPrice && apiPrice > 0) {
    return apiPrice;
  }

  // 2. Fall back to router price
  if (routerPrice && routerPrice > 0) {
    return routerPrice;
  }

  // 3. Check X Layer stablecoins
  if (isXLayerChain(chainIndex) && isXLayerStablecoin(tokenAddress)) {
    return 1.0;
  }

  // 4. Stablecoin fallback by symbol
  return getStablecoinFallbackPrice(tokenSymbol);
}
