/**
 * Security headers for edge function responses
 * These headers provide additional protection for API responses
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
  // Prevent caching of sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-referrer-address, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

/**
 * Combined headers for API responses
 */
export function getResponseHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
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
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getResponseHeaders(additionalHeaders),
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
      headers: getResponseHeaders(),
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
