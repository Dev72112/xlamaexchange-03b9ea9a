/**
 * X Layer Token Mappings
 * Direct contract address mappings for X Layer wrapped tokens
 * Used when DexScreener doesn't support X Layer (chainId 196)
 */

// X Layer chainIndex
export const XLAYER_CHAIN_INDEX = '196';

// X Layer wrapped tokens that map to underlying assets
// These tokens are wrapped versions of major cryptocurrencies
export const XLAYER_WRAPPED_TOKENS: Record<string, { underlying: string; symbol: string }> = {
  // XBTC - Wrapped Bitcoin on X Layer
  '0xb7c00000bcdeef966b20b3d884b98e64d2b06b4f': { underlying: 'btc', symbol: 'XBTC' },
  // XETH - Wrapped Ethereum on X Layer
  '0xe7b000003a45145decf8a28fc755ad5ec5ea025a': { underlying: 'eth', symbol: 'XETH' },
  // XSOL - Wrapped Solana on X Layer
  '0x505000008de8748dbd4422ff4687a4fc9beba15b': { underlying: 'sol', symbol: 'XSOL' },
  // WETH - Wrapped ETH (standard)
  '0x5a77f1443d16ee5761d310e38b62f77f726bc71c': { underlying: 'eth', symbol: 'WETH' },
  // WOKB - Wrapped OKB
  '0xe538905cf8410324e03a5a23c1c177a474d59b2b': { underlying: 'okb', symbol: 'WOKB' },
};

// X Layer stablecoins - always priced at $1.00
export const XLAYER_STABLECOINS: Record<string, string> = {
  '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8': 'USDG',
  '0x779ded0c9e1022225f8e0630b35a9b54be713736': 'USD₮0',
  '0x1e4a5963abfd975d8c9021ce480b42188849d41d': 'USDT',
  '0x74b7f16337b8972027f6196a17a631ac6de26d22': 'USDC',
};

// X Layer tokens with known DEX pairs (can use DexScreener for some)
// Note: Most X Layer tokens are NOT on DexScreener
export const XLAYER_DEX_TOKENS: Record<string, string> = {
  // XDOG - Dog coin on X Layer (may have DEX pairs)
  '0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e': 'XDOG',
  // DOG - Another dog token
  '0x9b8cc6320f22325759b7d2ca5cd27347bb4ecd86': 'DOG',
};

/**
 * Check if a token is an X Layer stablecoin
 */
export function isXLayerStablecoin(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() in XLAYER_STABLECOINS;
}

/**
 * Check if a token is an X Layer wrapped asset
 */
export function isXLayerWrappedToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() in XLAYER_WRAPPED_TOKENS;
}

/**
 * Get the underlying asset for an X Layer wrapped token
 */
export function getXLayerUnderlyingAsset(tokenAddress: string): string | null {
  const mapping = XLAYER_WRAPPED_TOKENS[tokenAddress.toLowerCase()];
  return mapping?.underlying || null;
}

/**
 * Check if a chain is X Layer
 */
export function isXLayerChain(chainIndex: string): boolean {
  return chainIndex === XLAYER_CHAIN_INDEX;
}
