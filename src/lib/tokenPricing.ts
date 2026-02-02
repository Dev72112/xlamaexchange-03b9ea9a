/**
 * Token pricing utilities with fallback strategies
 * Used to ensure USD values are captured even when primary price APIs fail
 */

// Stablecoins that should always be priced at ~$1.00
const STABLECOINS = new Set([
  'USDT', 'USDC', 'USDG', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 
  'USDD', 'USDN', 'MIM', 'GUSD', 'USDP', 'SUSD', 'CUSD', 'EURS',
  'EUROC', 'EURT', 'PYUSD', 'FDUSD'
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
