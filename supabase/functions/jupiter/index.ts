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
const JUPITER_TRIGGER_BASE = 'https://api.jup.ag/trigger/v1';
const JUPITER_RECURRING_BASE = 'https://api.jup.ag/recurring/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ============ TYPE DEFINITIONS ============

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

interface JupiterLimitOrderParams {
  inputMint: string;
  outputMint: string;
  maker: string;
  makingAmount: string;
  takingAmount: string;
  expiredAt?: number;
  computeUnitPrice?: string;
}

interface JupiterDCAParams {
  user: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  numberOfOrders: number;
  interval: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  startAt?: number | null;
}

// ============ MAIN SERVER ============

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
      // ============ ULTRA API (SWAPS) ============
      case 'order':
        return await handleOrder(req);
      case 'execute':
        return await handleExecute(req);
      case 'quote':
        return await handleQuote(req);
      
      // ============ TRIGGER API (LIMIT ORDERS) ============
      case 'limit-create':
        return await handleLimitCreate(req);
      case 'limit-orders':
        return await handleLimitOrders(req);
      case 'limit-cancel':
        return await handleLimitCancel(req);
      case 'limit-history':
        return await handleLimitHistory(req);
      
      // ============ RECURRING API (DCA) ============
      case 'dca-create':
        return await handleDCACreate(req);
      case 'dca-orders':
        return await handleDCAOrders(req);
      case 'dca-cancel':
        return await handleDCACancel(req);
      case 'dca-history':
        return await handleDCAHistory(req);
      
      default:
        return secureErrorResponse(
          'Invalid action. Use: order, execute, quote, limit-create, limit-orders, limit-cancel, dca-create, dca-orders, dca-cancel', 
          400, 
          'INVALID_ACTION'
        );
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

// ============ ULTRA API HANDLERS (SWAPS) ============

async function handleOrder(req: Request): Promise<Response> {
  const body = await req.json() as JupiterOrderParams;
  
  if (!body.inputMint || !body.outputMint || !body.amount || !body.taker) {
    return secureErrorResponse('Missing required parameters: inputMint, outputMint, amount, taker', 400);
  }
  
  if (!isValidSolanaMint(body.inputMint) || !isValidSolanaMint(body.outputMint)) {
    return secureErrorResponse('Invalid mint address format', 400);
  }
  
  if (!isValidSolanaAddress(body.taker)) {
    return secureErrorResponse('Invalid taker address', 400);
  }

  const params = new URLSearchParams({
    inputMint: sanitizeInput(body.inputMint, 100),
    outputMint: sanitizeInput(body.outputMint, 100),
    amount: sanitizeInput(body.amount, 50),
    taker: sanitizeInput(body.taker, 100),
    slippageBps: (body.slippageBps || 50).toString(),
  });

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
  
  if (!body.inputMint || !body.outputMint || !body.amount) {
    return secureErrorResponse('Missing required parameters: inputMint, outputMint, amount', 400);
  }

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

// ============ TRIGGER API HANDLERS (LIMIT ORDERS) ============

async function handleLimitCreate(req: Request): Promise<Response> {
  const body = await req.json() as JupiterLimitOrderParams;
  
  if (!body.inputMint || !body.outputMint || !body.maker || !body.makingAmount || !body.takingAmount) {
    return secureErrorResponse('Missing required parameters: inputMint, outputMint, maker, makingAmount, takingAmount', 400);
  }

  if (!isValidSolanaAddress(body.maker)) {
    return secureErrorResponse('Invalid maker address', 400);
  }

  const jupiterUrl = `${JUPITER_TRIGGER_BASE}/createOrder`;
  console.log(`[Jupiter] Creating limit order for maker: ${body.maker.slice(0, 8)}...`);

  const requestBody: any = {
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    maker: body.maker,
    makingAmount: body.makingAmount,
    takingAmount: body.takingAmount,
    computeUnitPrice: body.computeUnitPrice || 'auto',
  };

  // Add optional params
  if (body.expiredAt) {
    requestBody.expiredAt = body.expiredAt;
  }

  // Add referral if configured
  if (JUPITER_REFERRAL_ACCOUNT) {
    requestBody.referral = JUPITER_REFERRAL_ACCOUNT;
    console.log(`[Jupiter] Adding limit order referral: ${JUPITER_REFERRAL_ACCOUNT.slice(0, 8)}...`);
  }

  const response = await fetch(jupiterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Limit create error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Jupiter limit order error: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_LIMIT_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Limit order created: order=${data.order?.slice(0, 12)}...`);
  
  return secureJsonResponse(data);
}

async function handleLimitOrders(req: Request): Promise<Response> {
  const body = await req.json();
  const wallet = body.wallet;
  
  if (!wallet || !isValidSolanaAddress(wallet)) {
    return secureErrorResponse('Missing or invalid wallet address', 400);
  }

  const jupiterUrl = `${JUPITER_TRIGGER_BASE}/openOrders?wallet=${sanitizeInput(wallet, 100)}`;
  console.log(`[Jupiter] Fetching open limit orders for: ${wallet.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Limit orders fetch error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to fetch limit orders: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_LIMIT_ORDERS_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Found ${Array.isArray(data) ? data.length : data.orders?.length || 0} open limit orders`);
  
  return secureJsonResponse({ orders: Array.isArray(data) ? data : (data.orders || []) });
}

async function handleLimitCancel(req: Request): Promise<Response> {
  const body = await req.json();
  const { maker, orders } = body;
  
  if (!maker || !isValidSolanaAddress(maker)) {
    return secureErrorResponse('Missing or invalid maker address', 400);
  }
  
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return secureErrorResponse('Missing orders array', 400);
  }

  const jupiterUrl = `${JUPITER_TRIGGER_BASE}/cancelOrders`;
  console.log(`[Jupiter] Cancelling ${orders.length} limit orders for: ${maker.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
    body: JSON.stringify({
      maker,
      orders,
      computeUnitPrice: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Limit cancel error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to cancel limit orders: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_LIMIT_CANCEL_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Limit orders cancelled`);
  
  return secureJsonResponse(data);
}

async function handleLimitHistory(req: Request): Promise<Response> {
  const body = await req.json();
  const wallet = body.wallet;
  
  if (!wallet || !isValidSolanaAddress(wallet)) {
    return secureErrorResponse('Missing or invalid wallet address', 400);
  }

  const jupiterUrl = `${JUPITER_TRIGGER_BASE}/orderHistory?wallet=${sanitizeInput(wallet, 100)}`;
  console.log(`[Jupiter] Fetching limit order history for: ${wallet.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] Limit history error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to fetch limit order history: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_LIMIT_HISTORY_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Found ${Array.isArray(data) ? data.length : data.orders?.length || 0} historical limit orders`);
  
  return secureJsonResponse({ orders: Array.isArray(data) ? data : (data.orders || []) });
}

// ============ RECURRING API HANDLERS (DCA) ============

async function handleDCACreate(req: Request): Promise<Response> {
  const body = await req.json() as JupiterDCAParams;
  
  if (!body.user || !body.inputMint || !body.outputMint || !body.inAmount || !body.numberOfOrders || !body.interval) {
    return secureErrorResponse('Missing required parameters: user, inputMint, outputMint, inAmount, numberOfOrders, interval', 400);
  }

  if (!isValidSolanaAddress(body.user)) {
    return secureErrorResponse('Invalid user address', 400);
  }

  const jupiterUrl = `${JUPITER_RECURRING_BASE}/createDCA`;
  console.log(`[Jupiter] Creating DCA order for user: ${body.user.slice(0, 8)}...`);

  const requestBody: any = {
    user: body.user,
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    inAmount: body.inAmount,
    inAmountPerCycle: Math.floor(parseInt(body.inAmount) / body.numberOfOrders).toString(),
    cycleSecondsApart: body.interval,
    computeUnitPrice: 'auto',
  };

  // Add optional params
  if (body.minPrice) requestBody.minOutAmountPerCycle = body.minPrice;
  if (body.maxPrice) requestBody.maxOutAmountPerCycle = body.maxPrice;
  if (body.startAt) requestBody.startAt = body.startAt;

  const response = await fetch(jupiterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] DCA create error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Jupiter DCA order error: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_DCA_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] DCA order created: order=${data.dcaPubKey?.slice(0, 12) || data.order?.slice(0, 12)}...`);
  
  return secureJsonResponse({ tx: data.tx, order: data.dcaPubKey || data.order });
}

async function handleDCAOrders(req: Request): Promise<Response> {
  const body = await req.json();
  const wallet = body.wallet;
  
  if (!wallet || !isValidSolanaAddress(wallet)) {
    return secureErrorResponse('Missing or invalid wallet address', 400);
  }

  const jupiterUrl = `${JUPITER_RECURRING_BASE}/user/${sanitizeInput(wallet, 100)}`;
  console.log(`[Jupiter] Fetching open DCA orders for: ${wallet.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] DCA orders fetch error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to fetch DCA orders: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_DCA_ORDERS_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Found ${Array.isArray(data) ? data.length : data.orders?.length || 0} open DCA orders`);
  
  return secureJsonResponse({ orders: Array.isArray(data) ? data : (data.orders || []) });
}

async function handleDCACancel(req: Request): Promise<Response> {
  const body = await req.json();
  const { user, order } = body;
  
  if (!user || !isValidSolanaAddress(user)) {
    return secureErrorResponse('Missing or invalid user address', 400);
  }
  
  if (!order) {
    return secureErrorResponse('Missing order public key', 400);
  }

  const jupiterUrl = `${JUPITER_RECURRING_BASE}/closeDCA`;
  console.log(`[Jupiter] Cancelling DCA order: ${order.slice(0, 8)}... for user: ${user.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
    body: JSON.stringify({
      user,
      dcaPubKey: order,
      computeUnitPrice: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] DCA cancel error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to cancel DCA order: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_DCA_CANCEL_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] DCA order cancelled`);
  
  return secureJsonResponse(data);
}

async function handleDCAHistory(req: Request): Promise<Response> {
  const body = await req.json();
  const wallet = body.wallet;
  
  if (!wallet || !isValidSolanaAddress(wallet)) {
    return secureErrorResponse('Missing or invalid wallet address', 400);
  }

  // Note: Jupiter's Recurring API may not have a dedicated history endpoint
  // This endpoint fetches user's DCA accounts including completed ones
  const jupiterUrl = `${JUPITER_RECURRING_BASE}/user/${sanitizeInput(wallet, 100)}?includeCompleted=true`;
  console.log(`[Jupiter] Fetching DCA history for: ${wallet.slice(0, 8)}...`);

  const response = await fetch(jupiterUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Jupiter] DCA history error: ${response.status} - ${errorText.slice(0, 200)}`);
    return secureErrorResponse(
      `Failed to fetch DCA history: ${errorText.slice(0, 100)}`,
      response.status,
      'JUPITER_DCA_HISTORY_ERROR'
    );
  }

  const data = await response.json();
  console.log(`[Jupiter] Found ${Array.isArray(data) ? data.length : data.orders?.length || 0} historical DCA orders`);
  
  return secureJsonResponse({ orders: Array.isArray(data) ? data : (data.orders || []) });
}

// ============ UTILITIES ============

function isValidSolanaMint(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  if (address === 'So11111111111111111111111111111111111111112') return true; // Wrapped SOL
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
