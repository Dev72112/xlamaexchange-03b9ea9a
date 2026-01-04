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

// API Base URLs - using v6 for Market/Balance/Token APIs, v5 for DEX Aggregator
const OKX_DEX_AGGREGATOR_URL = 'https://www.okx.com/api/v5/dex/aggregator';
const OKX_MARKET_API_URL = 'https://web3.okx.com/api/v6/dex/market';
const OKX_BALANCE_API_URL = 'https://web3.okx.com/api/v6/dex/balance';
const OKX_TX_HISTORY_API_URL = 'https://web3.okx.com/api/v6/dex/post-transaction';
const OKX_CROSS_CHAIN_URL = 'https://www.okx.com/api/v5/dex/cross-chain';

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
  'token-price-info': 60,
  'token-ranking': 30,
  'token-search': 60,
  'candlesticks': 60,
  'history-candles': 30,
  'wallet-balances': 30,
  'portfolio-value': 30,
  'tx-history': 30,
  'tx-detail': 30,
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

// Make authenticated request to OKX DEX Aggregator API (v5)
async function okxDexRequest(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  method: string = 'GET'
): Promise<Response> {
  const queryString = buildQueryString(params);
  const requestPath = `/api/v5/dex/aggregator${endpoint}${queryString}`;
  const headers = await getOkxHeaders(requestPath, method);
  
  const url = `${OKX_DEX_AGGREGATOR_URL}${endpoint}${queryString}`;
  console.log(`OKX DEX API request: ${method} ${endpoint}`, params);
  
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
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        const quoteParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
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
        
        const swapParams: Record<string, string | number | undefined> = {
          chainIndex,
          fromTokenAddress,
          toTokenAddress,
          amount,
          slippage: slippage || '0.5',
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
        const headers = await getOkxHeaders(requestPath);
        
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
        
        // v6 Market API - Token Trading Information (includes price, volume, marketCap, etc.)
        response = await okxMarketRequest('/price-info', {
          chainIndex,
          tokenContractAddress,
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
    
    const data = await response.json();
    
    // OKX API returns { code: "0", data: [...] } on success
    if (data.code !== '0' && data.code !== 0) {
      console.error('OKX API error:', data);
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
