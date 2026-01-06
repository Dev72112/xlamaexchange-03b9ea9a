import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, securityHeaders } from "../_shared/security-headers.ts";

// Combined headers for responses
const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

const OKX_API_KEY = Deno.env.get('OKX_API_KEY') || '';
const OKX_SECRET_KEY = Deno.env.get('OKX_SECRET_KEY') || '';
const OKX_API_PASSPHRASE = Deno.env.get('OKX_API_PASSPHRASE') || '';
const OKX_PROJECT_ID = Deno.env.get('OKX_PROJECT_ID') || '';
const OKX_REFERRER_WALLET_ADDRESS = Deno.env.get('OKX_REFERRER_WALLET_ADDRESS') || '';

// API Base URLs - all using v6
const OKX_DEX_AGGREGATOR_URL = 'https://web3.okx.com/api/v6/dex/aggregator';
const OKX_MARKET_API_URL = 'https://web3.okx.com/api/v6/dex/market';
const OKX_BALANCE_API_URL = 'https://web3.okx.com/api/v6/dex/balance';
const OKX_TX_HISTORY_API_URL = 'https://web3.okx.com/api/v6/dex/post-transaction';
const OKX_CROSS_CHAIN_URL = 'https://web3.okx.com/api/v6/dex/cross-chain';

// Commission fee percentage for partner revenue
const COMMISSION_FEE_PERCENT = '1.5';

// Valid actions - v6 API additions
const VALID_ACTIONS = [
  // DEX Aggregator (v5)
  'supported-chains',
  'tokens',
  'quote',
  'swap',
  'approve-transaction',
  'liquidity',
  'token-info',
  'cross-chain-quote',
  'cross-chain-swap',
  // Market API (v6)
  'token-price',
  'token-price-info',
  'token-ranking',
  'token-search',
  'candlesticks',
  'history-candles',
  'market-trades',
  // Balance API (v6)
  'wallet-balances',
  'portfolio-value',
  // Transaction History API (v6)
  'tx-history',
  'tx-detail',
] as const;

type ValidAction = typeof VALID_ACTIONS[number];

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMITS: Record<ValidAction, number> = {
  'supported-chains': 40,
  'tokens': 40,
  'quote': 80,
  'swap': 40,
  'approve-transaction': 40,
  'liquidity': 40,
  'token-info': 40,
  'cross-chain-quote': 50,
  'cross-chain-swap': 30,
  'token-price': 80,
  'token-price-info': 80,
  'token-ranking': 40,
  'token-search': 80,
  'candlesticks': 80,
  'history-candles': 40,
  'market-trades': 40,
  'wallet-balances': 40,
  'portfolio-value': 40,
  'tx-history': 40,
  'tx-detail': 40,
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

// Get OKX API headers
async function getOkxHeaders(requestPath: string, method: string = 'GET'): Promise<Record<string, string>> {
  const timestamp = new Date().toISOString();
  const signature = await generateSignature(timestamp, method, requestPath);
  
  return {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
    'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
    'Content-Type': 'application/json',
  };
}

// Make authenticated request to OKX DEX Aggregator API (v6)
async function okxDexRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v6/dex/aggregator${endpoint}${queryString}`;
  const headers = await getOkxHeaders(requestPath, method);
  
  const url = `${OKX_DEX_AGGREGATOR_URL}${endpoint}${queryString}`;
  console.log(`OKX DEX API v6 request: ${method} ${endpoint}`, params);
  
  return fetch(url, { method, headers });
}

// Make authenticated request to OKX Market API (v6)
async function okxMarketRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v6/dex/market${endpoint}${queryString}`;
  const headers = await getOkxHeaders(requestPath, method);
  
  const url = `${OKX_MARKET_API_URL}${endpoint}${queryString}`;
  console.log(`OKX Market API v6 request: ${method} ${endpoint}`, params);
  
  return fetch(url, { method, headers });
}

// Make authenticated request to OKX Balance API (v6)
async function okxBalanceRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v6/dex/balance${endpoint}${queryString}`;
  const headers = await getOkxHeaders(requestPath, method);
  
  const url = `${OKX_BALANCE_API_URL}${endpoint}${queryString}`;
  console.log(`OKX Balance API v6 request: ${method} ${endpoint}`, params);
  
  return fetch(url, { method, headers });
}

// Make authenticated request to OKX Transaction History API (v6)
async function okxTxHistoryRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v6/dex/post-transaction${endpoint}${queryString}`;
  const headers = await getOkxHeaders(requestPath, method);
  
  const url = `${OKX_TX_HISTORY_API_URL}${endpoint}${queryString}`;
  console.log(`OKX Tx History API v6 request: ${method} ${endpoint}`, params);
  
  return fetch(url, { method, headers });
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
      const limit = RATE_LIMITS[action as ValidAction];
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.', 
          retryAfter: 60,
          retryable: true 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limit),
            'Retry-After': '60'
          } 
        }
      );
    }
    
    console.log(`OKX DEX action: ${action}`, params, `IP: ${clientIp}`);
    
    let response: Response;
    
    switch (action as ValidAction) {
      // ========== DEX Aggregator (v5) ==========
      case 'supported-chains': {
        response = await okxDexRequest('/supported/chain');
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
        response = await okxDexRequest('/all-tokens', { chainIndex });
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
        
        // Validate and ensure slippage is never empty
        const validSlippage = (slippage && !isNaN(parseFloat(slippage)) && parseFloat(slippage) > 0) 
          ? slippage 
          : '0.5';
        
        const quoteParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          // OKX v6 expects slippagePercent; keep slippage for backward compatibility
          slippagePercent: validSlippage,
          slippage: validSlippage,
        };
        
        if (OKX_REFERRER_WALLET_ADDRESS) {
          quoteParams.feePercent = COMMISSION_FEE_PERCENT;
          quoteParams.toTokenReferrerWalletAddress = OKX_REFERRER_WALLET_ADDRESS;
        }
        
        response = await okxDexRequest('/quote', quoteParams);
        break;
      }
      
      case 'swap': {
        const { chainIndex, fromTokenAddress, toTokenAddress, amount, slippage, userWalletAddress } = params;
        
        if (!chainIndex || !fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex, fromTokenAddress, toTokenAddress, amount, and userWalletAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Validate and ensure slippage is never empty
        const validSlippage = (slippage && !isNaN(parseFloat(slippage)) && parseFloat(slippage) > 0) 
          ? slippage 
          : '0.5';
        
        const swapParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          // OKX v6 expects slippagePercent; keep slippage for backward compatibility
          slippagePercent: validSlippage,
          slippage: validSlippage,
          userWalletAddress,
        };
        
        if (OKX_REFERRER_WALLET_ADDRESS) {
          swapParams.feePercent = COMMISSION_FEE_PERCENT;
          swapParams.toTokenReferrerWalletAddress = OKX_REFERRER_WALLET_ADDRESS;
        }
        
        response = await okxDexRequest('/swap', swapParams);
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
        response = await okxDexRequest('/approve-transaction', {
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
        response = await okxDexRequest('/liquidity', { chainIndex });
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
        
        const getNativeTokenAddress = (chain: string): string => {
          switch (chain) {
            case '501': return 'So11111111111111111111111111111111111111112';
            case '195': return 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
            case '784': return '0x2::sui::SUI';
            case '607': return 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
            default: return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
          }
        };

        const getDefaultDecimals = (chain: string): string => {
          switch (chain) {
            case '501': return '9';
            case '195': return '6';
            case '784': return '9';
            case '607': return '9';
            default: return '18';
          }
        };

        const getDefaultAmount = (chain: string): string => {
          switch (chain) {
            case '501': return '1000000000';
            case '195': return '1000000';
            case '784': return '1000000000';
            case '607': return '1000000000';
            default: return '1000000000000000000';
          }
        };
        
        // First try to find in all-tokens list
        try {
          const tokensResponse = await okxDexRequest('/all-tokens', { chainIndex });
          const tokensData = await tokensResponse.json();
          
          if (tokensData.code === '0' || tokensData.code === 0) {
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
        
        // Try quote endpoint as fallback
        try {
          const nativeAddress = getNativeTokenAddress(chainIndex);
          const defaultAmount = getDefaultAmount(chainIndex);
          
          console.log(`Trying quote with native token ${nativeAddress} and amount ${defaultAmount}`);
          
          const quoteResponse = await okxDexRequest('/quote', {
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
        
        console.log(`Token ${tokenAddress} not found on chain ${chainIndex}`);
        return new Response(
          JSON.stringify({ error: 'Token not found on this chain' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cross-chain-quote': {
        const { fromChainIndex, toChainIndex, fromTokenAddress, toTokenAddress, amount, slippage, userWalletAddress } = params;
        
        if (!fromChainIndex || !toChainIndex || !fromTokenAddress || !toTokenAddress || !amount) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for cross-chain quote' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Validate and ensure slippage is never empty
        const validSlippage = (slippage && !isNaN(parseFloat(slippage)) && parseFloat(slippage) > 0) 
          ? slippage 
          : '0.5';
        
        // Build params - userWalletAddress is optional for quotes
        const quoteParams: Record<string, string | number | undefined> = {
          fromChainIndex,
          toChainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          // OKX v6 expects slippagePercent; keep slippage for backward compatibility
          slippagePercent: validSlippage,
          slippage: validSlippage,
        };
        
        // Only include userWalletAddress if provided
        if (userWalletAddress) {
          quoteParams.userWalletAddress = userWalletAddress;
        }
        
        const queryString = buildQueryString(quoteParams);
        const requestPath = `/api/v6/dex/cross-chain/quote${queryString}`;
        const headers = await getOkxHeaders(requestPath);
        
        console.log(`Cross-chain quote request: ${fromChainIndex} -> ${toChainIndex}`, { hasAddress: !!userWalletAddress });
        
        response = await fetch(`${OKX_CROSS_CHAIN_URL}/quote${queryString}`, { method: 'GET', headers });
        break;
      }

      case 'cross-chain-swap': {
        const { fromChainIndex, toChainIndex, fromTokenAddress, toTokenAddress, amount, slippage, userWalletAddress, receiveAddress } = params;
        
        if (!fromChainIndex || !toChainIndex || !fromTokenAddress || !toTokenAddress || !amount || !userWalletAddress) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for cross-chain swap' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Validate and ensure slippage is never empty
        const validSlippage = (slippage && !isNaN(parseFloat(slippage)) && parseFloat(slippage) > 0) 
          ? slippage 
          : '0.5';
        
        const queryString = buildQueryString({
          fromChainIndex,
          toChainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          // OKX v6 expects slippagePercent; keep slippage for backward compatibility
          slippagePercent: validSlippage,
          slippage: validSlippage,
          userWalletAddress,
          receiveAddress: receiveAddress || userWalletAddress,
        });
        const requestPath = `/api/v6/dex/cross-chain/swap${queryString}`;
        const headers = await getOkxHeaders(requestPath);
        
        response = await fetch(`${OKX_CROSS_CHAIN_URL}/swap${queryString}`, { method: 'GET', headers });
        break;
      }

      // ========== Market API (v6) ==========
      case 'token-price': {
        const { chainIndex, tokenAddress } = params;
        if (!chainIndex || !tokenAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Use v6 Market API for price
        response = await okxMarketRequest('/price', {
          chainIndex,
          tokenContractAddress: tokenAddress,
        });
        break;
      }

      case 'token-price-info': {
        const { chainIndex, tokenContractAddress } = params;
        if (!chainIndex || !tokenContractAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenContractAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Market API - Token Trading Information requires POST with JSON body
        const requestPath = `/api/v6/dex/market/price-info`;
        const bodyData = JSON.stringify([{ chainIndex, tokenContractAddress }]);
        const timestamp = new Date().toISOString();
        const signature = await generateSignature(timestamp, 'POST', requestPath, bodyData);
        
        const postHeaders = {
          'OK-ACCESS-KEY': OKX_API_KEY,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
          'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
          'Content-Type': 'application/json',
        };
        
        console.log(`Fetching token price info for ${tokenContractAddress} on chain ${chainIndex} (POST)`);
        
        response = await fetch(`${OKX_MARKET_API_URL}/price-info`, {
          method: 'POST',
          headers: postHeaders,
          body: bodyData,
        });
        break;
      }

      case 'token-ranking': {
        const { chains, sortBy, timeFrame } = params;
        if (!chains || !sortBy || !timeFrame) {
          return new Response(
            JSON.stringify({ error: 'chains, sortBy, and timeFrame are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Market Token API - Token Ranking List
        response = await okxMarketRequest('/token/toplist', {
          chains,
          sortBy, // 2=price change, 5=volume, 6=market cap
          timeFrame, // 1=5m, 2=1h, 3=4h, 4=24h
        });
        break;
      }

      case 'token-search': {
        const { chains, search } = params;
        if (!chains || !search) {
          return new Response(
            JSON.stringify({ error: 'chains and search are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Searching tokens: "${search}" on chains: ${chains}`);
        
        // v6 Market Token API - Token Search
        response = await okxMarketRequest('/token/search', {
          chains,
          search,
        });
        break;
      }

      case 'candlesticks': {
        const { chainIndex, tokenContractAddress, bar, limit, after, before } = params;
        if (!chainIndex || !tokenContractAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenContractAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Market API - Candlesticks
        response = await okxMarketRequest('/candles', {
          chainIndex,
          tokenContractAddress,
          bar: bar || '1H',
          limit: limit || '100',
          after,
          before,
        });
        break;
      }

      case 'history-candles': {
        const { chainIndex, tokenContractAddress, bar, limit, after } = params;
        if (!chainIndex || !tokenContractAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenContractAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Market API - Historical Candlesticks
        response = await okxMarketRequest('/history-candles', {
          chainIndex,
          tokenContractAddress,
          bar: bar || '1H',
          limit: limit || '100',
          after,
        });
        break;
      }

      case 'market-trades': {
        const { chainIndex, tokenContractAddress, limit } = params;
        if (!chainIndex || !tokenContractAddress) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and tokenContractAddress are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Fetching market trades for ${tokenContractAddress} on chain ${chainIndex}`);
        
        // v6 Market API - Recent trades for a token
        response = await okxMarketRequest('/trades', {
          chainIndex,
          tokenContractAddress,
          limit: limit || '50',
        });
        break;
      }

      // ========== Balance API (v6) ==========
      case 'wallet-balances': {
        const { address, chains, excludeRiskToken } = params;
        if (!address || !chains) {
          return new Response(
            JSON.stringify({ error: 'address and chains are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Fetching wallet balances for ${address} on chains: ${chains}`);
        
        // v6 Balance API
        response = await okxBalanceRequest('/all-token-balances-by-address', {
          address,
          chains,
          excludeRiskToken: excludeRiskToken || '0', // 0 = filter out risk tokens
        });
        break;
      }

      case 'portfolio-value': {
        const { address, chains } = params;
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'address is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Balance API - Total Portfolio Value
        response = await okxBalanceRequest('/total-value', {
          address,
          chains,
        });
        break;
      }

      // ========== Transaction History API (v6) ==========
      case 'tx-history': {
        const { address, chains, tokenContractAddress, begin, end, cursor, limit } = params;
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'address is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Fetching tx history for ${address}`);
        
        // v6 Transaction History API
        response = await okxTxHistoryRequest('/transactions-by-address', {
          address,
          chains,
          tokenContractAddress,
          begin,
          end,
          cursor,
          limit: limit || '20',
        });
        break;
      }

      case 'tx-detail': {
        const { chainIndex, txHash } = params;
        if (!chainIndex || !txHash) {
          return new Response(
            JSON.stringify({ error: 'chainIndex and txHash are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // v6 Transaction History API - Specific Transaction Detail
        response = await okxTxHistoryRequest('/transaction-detail', {
          chainIndex,
          txHash,
        });
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Action not implemented' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    // Check if response is OK
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      // Handle HTML error pages (502, 503, etc.)
      if (contentType.includes('text/html') || !contentType.includes('application/json')) {
        console.error(`OKX API returned non-JSON response (${response.status}):`, response.statusText);
        return new Response(
          JSON.stringify({ 
            error: response.status >= 500 
              ? 'OKX service temporarily unavailable. Please try again.'
              : `OKX API error: ${response.status} ${response.statusText}`,
            retryable: response.status >= 500,
            status: response.status
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Safely parse JSON
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OKX response:', responseText.slice(0, 200));
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from OKX API. Please try again.',
          retryable: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // OKX API returns { code: "0", data: [...] } on success
    if (data.code !== '0' && data.code !== 0) {
      console.error('OKX API error:', data);
      return new Response(
        JSON.stringify({ 
          error: data.msg || 'OKX API error', 
          code: data.code,
          retryable: data.code === '50011' || data.code === 50011
        }),
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
