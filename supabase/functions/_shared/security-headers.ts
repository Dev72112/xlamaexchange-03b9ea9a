/**
 * Security and caching headers for edge function responses
 * Phase 5: Optimized for delivery performance
 */

/**
 * Security headers for all responses
 */
export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // XSS protection for older browsers
  'X-XSS-Protection': '1; mode=block',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Cache control presets for different response types
 */
export const cachePresets = {
  // No caching - for sensitive/dynamic data
  noStore: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  // Short cache - for frequently changing data (quotes, prices)
  short: {
    'Cache-Control': 'public, max-age=30, s-maxage=15, stale-while-revalidate=60',
  },
  // Medium cache - for semi-static data (token lists)
  medium: {
    'Cache-Control': 'public, max-age=300, s-maxage=180, stale-while-revalidate=600',
  },
  // Long cache - for static data (chain configs)
  long: {
    'Cache-Control': 'public, max-age=3600, s-maxage=1800, stale-while-revalidate=86400',
  },
  // Immutable - for versioned/hashed assets
  immutable: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
} as const;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-referrer-address, x-request-id, accept-encoding',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

/**
 * Compression hint headers
 */
export const compressionHeaders = {
  // Indicate we support compression
  'Vary': 'Accept-Encoding',
};

/**
 * Combined headers for API responses
 */
export function getResponseHeaders(
  additionalHeaders: Record<string, string> = {},
  cachePreset: keyof typeof cachePresets = 'noStore'
): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
    ...cachePresets[cachePreset],
    ...compressionHeaders,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}

/**
 * Create a JSON response with security headers
 */
export function secureJsonResponse(
  data: unknown, 
  status = 200,
  options: {
    additionalHeaders?: Record<string, string>;
    cachePreset?: keyof typeof cachePresets;
  } = {}
): Response {
  const { additionalHeaders = {}, cachePreset = 'noStore' } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: getResponseHeaders(additionalHeaders, cachePreset),
  });
}

/**
 * Create an error response with security headers
 */
export function secureErrorResponse(
  message: string, 
  status = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      code: code || `ERR_${status}`,
      timestamp: new Date().toISOString(),
    }), 
    {
      status,
      headers: getResponseHeaders({}, 'noStore'),
    }
  );
}

/**
 * Create CORS preflight response
 */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    },
  });
}

/**
 * Create a cached response for static-like data
 */
export function cachedJsonResponse(
  data: unknown,
  cachePreset: keyof typeof cachePresets = 'medium',
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: getResponseHeaders(additionalHeaders, cachePreset),
  });
}

/**
 * Validate and sanitize input string
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // EVM address
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true;
  
  // Solana address (base58, 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return true;
  
  // TON address
  if (/^(EQ|UQ)[a-zA-Z0-9_-]{46}$/.test(address)) return true;
  
  // Tron address
  if (/^T[a-zA-Z0-9]{33}$/.test(address)) return true;
  
  // Sui address
  if (/^0x[a-fA-F0-9]{64}$/.test(address)) return true;
  
  return false;
}

/**
 * Validate chain index
 */
export function isValidChainIndex(chainIndex: string): boolean {
  if (!chainIndex || typeof chainIndex !== 'string') return false;
  // Chain indexes are numeric strings
  return /^[0-9]+$/.test(chainIndex);
}

/**
 * Validate token contract address
 */
export function isValidTokenAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Native token placeholder
  if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') return true;
  
  // Standard contract addresses
  return isValidWalletAddress(address);
}
