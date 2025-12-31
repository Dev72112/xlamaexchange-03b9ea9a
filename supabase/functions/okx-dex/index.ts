import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OKX_API_KEY = Deno.env.get('OKX_API_KEY') || '';
const OKX_SECRET_KEY = Deno.env.get('OKX_SECRET_KEY') || '';
const OKX_API_PASSPHRASE = Deno.env.get('OKX_API_PASSPHRASE') || '';
const OKX_PROJECT_ID = Deno.env.get('OKX_PROJECT_ID') || '';
const OKX_DEX_API_URL = 'https://www.okx.com/api/v5/dex/aggregator';

// Valid actions
const VALID_ACTIONS = [
  'supported-chains',
  'tokens',
  'quote',
  'swap',
  'approve-transaction',
  'liquidity',
  'token-info',
  'cross-chain-quote',
  'cross-chain-swap',
] as const;

type ValidAction = typeof VALID_ACTIONS[number];

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMITS: Record<ValidAction, number> = {
  'supported-chains': 30,
  'tokens': 30,
  'quote': 60,
  'swap': 30,
  'approve-transaction': 30,
  'liquidity': 30,
  'token-info': 30,
  'cross-chain-quote': 30,
  'cross-chain-swap': 20,
};

function checkRateLimit(action: ValidAction, clientIp: string): boolean {
  const key = `${action}:${clientIp}`;
  const now = Date.now();
  const limit = RATE_LIMITS[action];
  
  const current = rateLimitMap.get(key);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// HMAC-SHA256 signature generation for OKX API
async function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ''
): Promise<string> {
  const message = timestamp + method + requestPath + body;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(OKX_SECRET_KEY);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Build query string from params
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return filtered.length > 0 ? '?' + filtered.join('&') : '';
}

// Make authenticated request to OKX API
async function okxRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v5/dex/aggregator${endpoint}${queryString}`;
  const timestamp = new Date().toISOString();
  const signature = await generateSignature(timestamp, method, requestPath);
  
  const headers = {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
    'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
    'Content-Type': 'application/json',
  };
  
  const url = `${OKX_DEX_API_URL}${endpoint}${queryString}`;
  console.log(`OKX DEX API request: ${method} ${endpoint}`, params);
  
  const response = await fetch(url, { method, headers });
  return response;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params = {} } = await req.json();
    const clientIp = getClientIp(req);
    
    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action', validActions: VALID_ACTIONS }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check rate limit
    if (!checkRateLimit(action as ValidAction, clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`OKX DEX action: ${action}`, params, `IP: ${clientIp}`);
    
    let response: Response;
    
    switch (action as ValidAction) {
      case 'supported-chains': {
        response = await okxRequest('/supported/chain');
        break;
      }
      
      case 'tokens': {
        const { chainIndex } = params;
        if (!chainIndex) {
          return new Response(
            JSON.stringify({ error: 'chainIndex is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await okxRequest('/all-tokens', { chainIndex });
        break;
      }
      
      case 'quote': {
        const { chainIndex, fromTokenAddress, toTokenAddress, amount, slippage } = params;
        if (!chainIndex || !fromTokenAddress || !toTokenAddress || !amount) {
          return new Response(
            JSON.stringify({ error: 'chainIndex, fromTokenAddress, toTokenAddress, and amount are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await okxRequest('/quote', {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
        });
        break;
      }
      
      case 'swap': {
        const { 
          chainIndex, 
          fromTokenAddress, 
          toTokenAddress, 
          amount, 
          slippage, 
          userWalletAddress 
        } = params;
        
        if (!chainIndex || !fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex, fromTokenAddress, toTokenAddress, amount, and userWalletAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        response = await okxRequest('/swap', {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
          userWalletAddress,
        });
        break;
      }
      
      case 'approve-transaction': {
        const { chainIndex, tokenContractAddress, approveAmount } = params;
        if (!chainIndex || !tokenContractAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenContractAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await okxRequest('/approve-transaction', {
          chainIndex,
          tokenContractAddress,
          approveAmount: approveAmount || '',
        });
        break;
      }
      
      case 'liquidity': {
        const { chainIndex } = params;
        if (!chainIndex) {
          return new Response(
            JSON.stringify({ error: 'chainIndex is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await okxRequest('/liquidity', { chainIndex });
        break;
      }

      case 'token-info': {
        const { chainIndex, tokenAddress } = params;
        if (!chainIndex || !tokenAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Fetch all tokens and find the matching one
        response = await okxRequest('/all-tokens', { chainIndex });
        const tokensData = await response.json();
        if (tokensData.code === '0' || tokensData.code === 0) {
          const foundToken = tokensData.data?.find(
            (t: any) => t.tokenContractAddress?.toLowerCase() === tokenAddress.toLowerCase()
          );
          if (foundToken) {
            return new Response(
              JSON.stringify(foundToken),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        return new Response(
          JSON.stringify({ error: 'Token not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cross-chain-quote': {
        const { 
          fromChainIndex, 
          toChainIndex, 
          fromTokenAddress, 
          toTokenAddress, 
          amount, 
          slippage,
          userWalletAddress 
        } = params;
        
        if (!fromChainIndex || !toChainIndex || !fromTokenAddress || !toTokenAddress || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for cross-chain quote' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // OKX Cross-chain API endpoint
        const crossChainUrl = 'https://www.okx.com/api/v5/dex/cross-chain';
        const queryString = buildQueryString({
          fromChainIndex,
          toChainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
          userWalletAddress,
        });
        const requestPath = `/api/v5/dex/cross-chain/quote${queryString}`;
        const timestamp = new Date().toISOString();
        const signature = await generateSignature(timestamp, 'GET', requestPath);
        
        const headers = {
          'OK-ACCESS-KEY': OKX_API_KEY,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
          'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
          'Content-Type': 'application/json',
        };
        
        response = await fetch(`${crossChainUrl}/quote${queryString}`, { method: 'GET', headers });
        break;
      }

      case 'cross-chain-swap': {
        const { 
          fromChainIndex, 
          toChainIndex, 
          fromTokenAddress, 
          toTokenAddress, 
          amount, 
          slippage,
          userWalletAddress,
          receiveAddress
        } = params;
        
        if (!fromChainIndex || !toChainIndex || !fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for cross-chain swap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const crossChainUrl = 'https://www.okx.com/api/v5/dex/cross-chain';
        const queryString = buildQueryString({
          fromChainIndex,
          toChainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
          userWalletAddress,
          receiveAddress: receiveAddress || userWalletAddress,
        });
        const requestPath = `/api/v5/dex/cross-chain/swap${queryString}`;
        const timestamp = new Date().toISOString();
        const signature = await generateSignature(timestamp, 'GET', requestPath);
        
        const headers = {
          'OK-ACCESS-KEY': OKX_API_KEY,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
          'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
          'Content-Type': 'application/json',
        };
        
        response = await fetch(`${crossChainUrl}/swap${queryString}`, { method: 'GET', headers });
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Action not implemented' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    const data = await response.json();
    
    // OKX API returns { code: "0", data: [...] } on success
    if (data.code !== '0' && data.code !== 0) {
      console.error('OKX DEX API error:', data);
      return new Response(
        JSON.stringify({ error: data.msg || 'OKX API error', code: data.code }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify(data.data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('OKX DEX edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});