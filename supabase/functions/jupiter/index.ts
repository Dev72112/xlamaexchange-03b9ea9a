import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsPreflightResponse, 
  secureJsonResponse, 
  secureErrorResponse,
  sanitizeInput,
} from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS, getClientIp } from "../_shared/rate-limit.ts";

// Add Jupiter to rate limits
RATE_LIMITS['jupiter'] = { maxRequests: 60, windowSeconds: 60 };

const JUPITER_API_KEY = Deno.env.get('JUPITER_API_KEY') || '';
const JUPITER_REFERRAL_ACCOUNT = Deno.env.get('JUPITER_REFERRAL_ACCOUNT') || '';
const REFERRAL_FEE_BPS = 100; // 1% fee, you keep 80 bps after Jupiter's cut

const JUPITER_ULTRA_BASE = 'https://lite-api.jup.ag';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface JupiterOrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker: string;
  slippageBps?: number;
}

interface JupiterExecuteParams {
  signedTransaction: string;
  requestId: string;
}

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const clientIp = getClientIp(req);
  
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit('jupiter', clientIp);
    if (!rateCheck.allowed) {
      console.warn(`[Jupiter] Rate limited: ${clientIp}`);
      return rateLimitResponse(corsHeaders);
    }

    // Check API key
    if (!JUPITER_API_KEY) {
      console.error('[Jupiter] Missing JUPITER_API_KEY');
      return secureErrorResponse('Jupiter API not configured', 500, 'JUPITER_CONFIG_ERROR');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    console.log(`[Jupiter] Request: action=${action}, ip=${clientIp.slice(0, 10)}...`);

    switch (action) {
      case 'order':
        return await handleOrder(req);
      case 'execute':
        return await handleExecute(req);
      case 'quote':
        return await handleQuote(req);
      default:
        return secureErrorResponse('Invalid action. Use: order, execute, quote', 400, 'INVALID_ACTION');
    }
  } catch (error: any) {
    console.error('[Jupiter] Error:', error);
    return secureErrorResponse(
      error.message || 'Internal server error',
      error.status || 500,
      'JUPITER_ERROR'
    );
  }
});

async function handleOrder(req: Request): Promise<Response> {
  const body = await req.json() as JupiterOrderParams;
  
  // Validate inputs
  if (!body.inputMint || !body.outputMint || !body.amount || !body.taker) {
    return secureErrorResponse('Missing required parameters: inputMint, outputMint, amount, taker', 400);
  }
  
  if (!isValidSolanaMint(body.inputMint) || !isValidSolanaMint(body.outputMint)) {
    return secureErrorResponse('Invalid mint address format', 400);
  }
  
  // Validate taker is a valid Solana address
  if (!isValidSolanaAddress(body.taker)) {
    return secureErrorResponse('Invalid taker address', 400);
  }

  // Build query params for Jupiter Ultra API
  const params = new URLSearchParams({
    inputMint: sanitizeInput(body.inputMint, 100),
    outputMint: sanitizeInput(body.outputMint, 100),
    amount: sanitizeInput(body.amount, 50),
    taker: sanitizeInput(body.taker, 100),
    slippageBps: (body.slippageBps || 50).toString(),
  });

  // Add referral params if configured
  if (JUPITER_REFERRAL_ACCOUNT) {
    params.set('referralAccount', JUPITER_REFERRAL_ACCOUNT);
    params.set('referralFee', REFERRAL_FEE_BPS.toString());
    console.log(`[Jupiter] Adding referral: account=${JUPITER_REFERRAL_ACCOUNT.slice(0, 8)}..., fee=${REFERRAL_FEE_BPS}bps`);
  }

  const jupiterUrl = `${JUPITER_ULTRA_BASE}/ultra/v1/order?${params.toString()}`;
  console.log(`[Jupiter] Fetching order from: ${jupiterUrl.slice(0, 100)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'x-api-key': JUPITER_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Order API error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Jupiter API error: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_API_ERROR'
    );
  }

  const data = await response.json();
  
  console.log(`[Jupiter] Order success: inAmount=${data.inAmount}, outAmount=${data.outAmount}, requestId=${data.requestId?.slice(0, 12)}...`);
  
  return secureJsonResponse(data);
}

async function handleExecute(req: Request): Promise<Response> {
  const body = await req.json() as JupiterExecuteParams;
  
  // Validate inputs
  if (!body.signedTransaction || !body.requestId) {
    return secureErrorResponse('Missing required parameters: signedTransaction, requestId', 400);
  }

  const jupiterUrl = `${JUPITER_ULTRA_BASE}/ultra/v1/execute`;
  console.log(`[Jupiter] Executing swap for requestId: ${body.requestId.slice(0, 20)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'POST',
    headers: {
      'x-api-key': JUPITER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signedTransaction: body.signedTransaction,
      requestId: body.requestId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Execute API error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Jupiter execution error: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_EXECUTE_ERROR'
    );
  }

  const data = await response.json();
  
  console.log(`[Jupiter] Execute success: signature=${data.signature?.slice(0, 20)}..., status=${data.status}`);
  
  return secureJsonResponse(data);
}

async function handleQuote(req: Request): Promise<Response> {
  const body = await req.json() as JupiterQuoteParams;
  
  // Validate inputs
  if (!body.inputMint || !body.outputMint || !body.amount) {
    return secureErrorResponse('Missing required parameters: inputMint, outputMint, amount', 400);
  }

  // Build query params
  const params = new URLSearchParams({
    inputMint: sanitizeInput(body.inputMint, 100),
    outputMint: sanitizeInput(body.outputMint, 100),
    amount: sanitizeInput(body.amount, 50),
    slippageBps: (body.slippageBps || 50).toString(),
  });

  const jupiterUrl = `${JUPITER_ULTRA_BASE}/ultra/v1/quote?${params.toString()}`;
  console.log(`[Jupiter] Fetching quote from: ${jupiterUrl.slice(0, 80)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'x-api-key': JUPITER_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Quote API error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Jupiter quote error: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_QUOTE_ERROR'
    );
  }

  const data = await response.json();
  
  console.log(`[Jupiter] Quote: inAmount=${data.inAmount}, outAmount=${data.outAmount}`);
  
  return secureJsonResponse(data);
}

// Validate Solana mint address (32-44 chars base58)
function isValidSolanaMint(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  // Native SOL or SPL token mint
  if (address === 'So11111111111111111111111111111111111111112') return true; // Wrapped SOL
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Validate Solana wallet address
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
