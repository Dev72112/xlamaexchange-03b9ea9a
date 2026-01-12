// Alchemy RPC Configuration
// Provides private RPC endpoints with public fallbacks

// IMPORTANT: This variable is injected at BUILD TIME by Vite
// If it shows undefined, you need to:
// 1. Ensure VITE_ALCHEMY_API_KEY is set in Lovable Cloud secrets
// 2. Publish -> Update to trigger a new build
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

// Debug log for development only
if (import.meta.env.DEV) {
  console.log('[RPC Config] Alchemy key present:', Boolean(ALCHEMY_KEY));
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
 * Get Solana RPC endpoints with Alchemy priority and public fallbacks
 */
export function getSolanaRpcEndpoints(chainRpcUrl?: string): string[] {
  const endpoints: string[] = [];
  
  // Alchemy first (private, no rate limits)
  if (ALCHEMY_KEY) {
    endpoints.push(`https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
  }
  
  // Chain-configured RPC
  if (chainRpcUrl) {
    endpoints.push(chainRpcUrl);
  }
  
  // Public fallbacks
  endpoints.push(
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
  );
  
  return endpoints;
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
} {
  return {
    alchemyConfigured: Boolean(ALCHEMY_KEY),
    keyLength: ALCHEMY_KEY?.length || 0,
    buildTime: new Date().toISOString(),
  };
}
