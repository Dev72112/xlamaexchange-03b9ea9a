// Alchemy RPC Configuration
// Provides private RPC endpoints with public fallbacks

// IMPORTANT: This variable is injected at BUILD TIME by Vite
// If it shows undefined, you need to:
// 1. Ensure VITE_ALCHEMY_API_KEY is set in Lovable Cloud secrets
// 2. Publish -> Update to trigger a new build
const RAW_ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '';

// Sanitize the key: trim whitespace and strip surrounding quotes
// (common issue when copying from dashboards or config files)
function sanitizeApiKey(key: string): string {
  if (!key) return '';
  let sanitized = key.trim();
  // Strip surrounding quotes (single or double)
  if ((sanitized.startsWith('"') && sanitized.endsWith('"')) ||
      (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
    sanitized = sanitized.slice(1, -1);
  }
  return sanitized.trim();
}

const ALCHEMY_KEY = sanitizeApiKey(RAW_ALCHEMY_KEY);

// Key sanity diagnostics (never expose actual key)
export const KEY_DIAGNOSTICS = {
  rawLength: RAW_ALCHEMY_KEY?.length || 0,
  sanitizedLength: ALCHEMY_KEY?.length || 0,
  hasQuotes: RAW_ALCHEMY_KEY?.startsWith('"') || RAW_ALCHEMY_KEY?.startsWith("'") || false,
  hasWhitespace: RAW_ALCHEMY_KEY !== RAW_ALCHEMY_KEY?.trim(),
  isValid: ALCHEMY_KEY.length >= 20 && ALCHEMY_KEY.length <= 64,
};

// Debug log for development only
if (import.meta.env.DEV) {
  console.log('[RPC Config] Alchemy key present:', Boolean(ALCHEMY_KEY));
  console.log('[RPC Config] Key diagnostics:', KEY_DIAGNOSTICS);
}

// Alchemy RPC endpoints by chain index
export const ALCHEMY_RPCS: Record<string, string> = ALCHEMY_KEY ? {
  // EVM Chains
  '1': `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '137': `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '42161': `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '10': `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '8453': `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '324': `https://zksync-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '1101': `https://polygonzkevm-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '59144': `https://linea-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '81457': `https://blast-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '534352': `https://scroll-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '5000': `https://mantle-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '7000': `https://zetachain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '1088': `https://metis-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '56': `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '146': `https://sonic-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  '130': `https://unichain-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  // Solana
  '501': `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
} : {};

/**
 * Get the best RPC URL for a chain (Alchemy first, fallback to public)
 */
export function getRpcUrl(chainIndex: string, fallbackRpc?: string): string {
  if (ALCHEMY_KEY && ALCHEMY_RPCS[chainIndex]) {
    return ALCHEMY_RPCS[chainIndex];
  }
  return fallbackRpc || '';
}

/**
 * Get Solana RPC endpoints - ALCHEMY ONLY (no public fallbacks for easier debugging)
 * If Alchemy key is not configured, returns empty array to surface the issue clearly
 */
export function getSolanaRpcEndpoints(_chainRpcUrl?: string): string[] {
  if (ALCHEMY_KEY) {
    // Return ONLY Alchemy - no fallbacks for clear debugging
    return [`https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`];
  }
  
  // No fallbacks - this makes debugging clear: if Alchemy fails, we know immediately
  console.error('[RPC] VITE_ALCHEMY_API_KEY not configured. Solana swaps will fail.');
  console.error('[RPC] To fix: 1) Add secret in Lovable Cloud, 2) Click Publish → Update to rebuild');
  return [];
}

/**
 * Check if Alchemy is configured
 */
export function isAlchemyConfigured(): boolean {
  return Boolean(ALCHEMY_KEY);
}

/**
 * Get diagnostic info about the RPC configuration
 */
export function getRpcDiagnostics(): {
  alchemyConfigured: boolean;
  keyLength: number;
  buildTime: string;
  keyDiagnostics: typeof KEY_DIAGNOSTICS;
} {
  return {
    alchemyConfigured: Boolean(ALCHEMY_KEY),
    keyLength: ALCHEMY_KEY?.length || 0,
    buildTime: new Date().toISOString(),
    keyDiagnostics: KEY_DIAGNOSTICS,
  };
}

/**
 * Get the Solana Alchemy endpoint URL (for diagnostics)
 */
export function getSolanaAlchemyEndpoint(): string | null {
  if (!ALCHEMY_KEY) return null;
  return `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
}

/**
 * Get the Ethereum Alchemy endpoint URL (for diagnostics)
 */
export function getEvmAlchemyEndpoint(): string | null {
  if (!ALCHEMY_KEY) return null;
  return `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
}
