import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OKX_API_KEY = Deno.env.get('OKX_API_KEY') || '';
const OKX_SECRET_KEY = Deno.env.get('OKX_SECRET_KEY') || '';
const OKX_API_PASSPHRASE = Deno.env.get('OKX_API_PASSPHRASE') || '';
const OKX_PROJECT_ID = Deno.env.get('OKX_PROJECT_ID') || '';
const OKX_REFERRER_WALLET_ADDRESS = Deno.env.get('OKX_REFERRER_WALLET_ADDRESS') || '';
const OKX_DEX_API_URL = 'https://www.okx.com/api/v5/dex/aggregator';

// Commission fee percentage for partner revenue
// Max is 3% for EVM chains, 10% for Solana
// Using 1.5% as a balanced rate for good revenue without impacting user experience too much
const COMMISSION_FEE_PERCENT = '1.5';

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
  'token-price',
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
  'token-price': 60,
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
        
        // Build quote params with optional commission fee
        const quoteParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
        };
        
        // Add commission fee if referrer wallet is configured
        if (OKX_REFERRER_WALLET_ADDRESS) {
          quoteParams.feePercent = COMMISSION_FEE_PERCENT;
          quoteParams.toTokenReferrerWalletAddress = OKX_REFERRER_WALLET_ADDRESS;
        }
        
        response = await okxRequest('/quote', quoteParams);
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
        
        // Build swap params with optional commission fee
        const swapParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
          userWalletAddress,
        };
        
        // Add commission fee if referrer wallet is configured
        if (OKX_REFERRER_WALLET_ADDRESS) {
          swapParams.feePercent = COMMISSION_FEE_PERCENT;
          swapParams.toTokenReferrerWalletAddress = OKX_REFERRER_WALLET_ADDRESS;
        }
        
        response = await okxRequest('/swap', swapParams);
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
        
        console.log(`Fetching token info for ${tokenAddress} on chain ${chainIndex}`);
        
        // Chain-specific native token addresses for quote fallback
        const getNativeTokenAddress = (chain: string): string => {
          switch (chain) {
            case '501': // Solana - wrapped SOL
              return 'So11111111111111111111111111111111111111112';
            case '195': // Tron
              return 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'; // WTRX
            case '784': // Sui
              return '0x2::sui::SUI';
            case '607': // TON
              return 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // native TON
            default: // EVM chains
              return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
          }
        };

        // Chain-specific default decimals
        const getDefaultDecimals = (chain: string): string => {
          switch (chain) {
            case '501': // Solana SPL tokens typically use 6 or 9 decimals
              return '9';
            case '195': // Tron
              return '6';
            case '784': // Sui
              return '9';
            case '607': // TON
              return '9';
            default:
              return '18';
          }
        };

        // Chain-specific default amount for quote (accounting for decimals)
        const getDefaultAmount = (chain: string): string => {
          switch (chain) {
            case '501': // Solana - 9 decimals
              return '1000000000';
            case '195': // Tron - 6 decimals
              return '1000000';
            case '784': // Sui - 9 decimals
              return '1000000000';
            case '607': // TON - 9 decimals
              return '1000000000';
            default: // EVM - 18 decimals
              return '1000000000000000000';
          }
        };
        
        // First try to find in all-tokens list
        try {
          const tokensResponse = await okxRequest('/all-tokens', { chainIndex });
          const tokensData = await tokensResponse.json();
          
          if (tokensData.code === '0' || tokensData.code === 0) {
            // For non-EVM chains, do case-sensitive comparison
            const isNonEvmChain = ['501', '195', '784', '607'].includes(chainIndex);
            const foundToken = tokensData.data?.find((t: any) => {
              if (isNonEvmChain) {
                return t.tokenContractAddress === tokenAddress;
              }
              return t.tokenContractAddress?.toLowerCase() === tokenAddress.toLowerCase();
            });
            
            if (foundToken) {
              console.log(`Found token in list: ${foundToken.tokenSymbol}`);
              return new Response(
                JSON.stringify(foundToken),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (err) {
          console.error('Error fetching all-tokens:', err);
        }
        
        // If not in list, try quote endpoint with a small amount to get token info
        // This is a workaround since OKX doesn't have a dedicated token-info endpoint
        try {
          const nativeAddress = getNativeTokenAddress(chainIndex);
          const defaultAmount = getDefaultAmount(chainIndex);
          
          console.log(`Trying quote with native token ${nativeAddress} and amount ${defaultAmount}`);
          
          const quoteResponse = await okxRequest('/quote', {
            chainIndex,
            fromTokenAddress: tokenAddress,
            toTokenAddress: nativeAddress,
            amount: defaultAmount,
            slippage: '0.5',
          });
          
          const quoteData = await quoteResponse.json();
          console.log('Quote response for token info:', quoteData);
          
          if ((quoteData.code === '0' || quoteData.code === 0) && quoteData.data?.[0]) {
            const quote = quoteData.data[0];
            // Extract token info from quote response
            const tokenInfo = {
              tokenContractAddress: tokenAddress,
              tokenSymbol: quote.fromToken?.tokenSymbol || 'UNKNOWN',
              tokenName: quote.fromToken?.tokenName || quote.fromToken?.tokenSymbol || 'Unknown Token',
              decimals: quote.fromToken?.decimals || getDefaultDecimals(chainIndex),
              tokenLogoUrl: quote.fromToken?.tokenLogoUrl || '',
            };
            console.log('Extracted token info from quote:', tokenInfo);
            return new Response(
              JSON.stringify(tokenInfo),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (err) {
          console.error('Error getting token via quote:', err);
        }
        
        // Token not found
        console.log(`Token ${tokenAddress} not found on chain ${chainIndex}`);
        return new Response(
          JSON.stringify({ error: 'Token not found on this chain' }),
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

      case 'token-price': {
        const { chainIndex, tokenAddress } = params;
        if (!chainIndex || !tokenAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Use market-data API for token price
        const marketUrl = 'https://www.okx.com/api/v5/dex/market';
        const queryStr = buildQueryString({ chainIndex, tokenContractAddress: tokenAddress });
        const requestPath = `/api/v5/dex/market/token-price${queryStr}`;
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
        
        response = await fetch(`${marketUrl}/token-price${queryStr}`, { method: 'GET', headers });
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