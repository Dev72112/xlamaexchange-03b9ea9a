import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, securityHeaders } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

// Combined headers for responses
const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

const CHANGENOW_API_KEY = Deno.env.get('CHANGENOW_API_KEY');
const CHANGENOW_API_URL = 'https://api.changenow.io/v1';

// --- Input Validation Helpers ---

// Valid actions whitelist
const VALID_ACTIONS = [
  'currencies',
  'min-amount',
  'exchange-amount',
  'exchange-amount-fixed',
  'create-transaction',
  'create-transaction-fixed',
  'transaction-status',
] as const;

type ValidAction = typeof VALID_ACTIONS[number];

// Validate ticker format (alphanumeric, 2-20 chars)
function isValidTicker(ticker: unknown): ticker is string {
  return typeof ticker === 'string' && /^[a-z0-9]{2,20}$/i.test(ticker);
}

// Validate amount (positive finite number)
function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

// Validate wallet address (20-128 chars, alphanumeric with common address chars)
function isValidAddress(address: unknown): address is string {
  return typeof address === 'string' && address.length >= 20 && address.length <= 128 && /^[a-zA-Z0-9:]+$/.test(address);
}

// Validate email format (optional)
function isValidEmail(email: unknown): email is string {
  if (email === undefined || email === null || email === '') return true;
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

// Validate transaction ID
function isValidTransactionId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 10 && id.length <= 100 && /^[a-zA-Z0-9]+$/.test(id);
}

// Validate rate ID
function isValidRateId(rateId: unknown): rateId is string {
  return typeof rateId === 'string' && rateId.length >= 5 && rateId.length <= 200;
}

// Validate extra ID (optional, memo/tag)
function isValidExtraId(extraId: unknown): extraId is string {
  if (extraId === undefined || extraId === null || extraId === '') return true;
  return typeof extraId === 'string' && extraId.length <= 128;
}

// Sanitize ticker for URL usage
function sanitizeTicker(ticker: string): string {
  return ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);

  // Check persistent rate limit
  const rateCheck = await checkRateLimit('changenow', clientIp);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for changenow from ${clientIp}`);
    return rateLimitResponse(corsHeaders);
  }

  try {
    const body = await req.json();
    const { action, params = {} } = body;

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action as ValidAction)) {
      console.warn(`Invalid action attempted: ${action} from ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`ChangeNow API action: ${action}`, params, `IP: ${clientIp}`);

    if (!CHANGENOW_API_KEY) {
      throw new Error('CHANGENOW_API_KEY is not configured');
    }

    let response: Response;
    let data: unknown;

    switch (action as ValidAction) {
      // Get available currencies (no params needed)
      case 'currencies':
        response = await fetch(`${CHANGENOW_API_URL}/currencies?active=true`, {
          headers: { 'Content-Type': 'application/json' },
        });
        data = await response.json();
        break;

      // Get minimum exchange amount
      case 'min-amount': {
        const { from, to } = params;
        if (!isValidTicker(from) || !isValidTicker(to)) {
          return new Response(
            JSON.stringify({ error: 'Invalid currency ticker format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const safeFrom = sanitizeTicker(from);
        const safeTo = sanitizeTicker(to);
        response = await fetch(
          `${CHANGENOW_API_URL}/min-amount/${safeFrom}_${safeTo}?api_key=${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;
      }

      // Get estimated exchange amount (floating rate)
      case 'exchange-amount': {
        const { from, to, amount } = params;
        if (!isValidTicker(from) || !isValidTicker(to)) {
          return new Response(
            JSON.stringify({ error: 'Invalid currency ticker format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAmount(amount)) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount: must be a positive number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const safeFrom = sanitizeTicker(from);
        const safeTo = sanitizeTicker(to);
        response = await fetch(
          `${CHANGENOW_API_URL}/exchange-amount/${amount}/${safeFrom}_${safeTo}?api_key=${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;
      }

      // Get estimated exchange amount (fixed rate)
      case 'exchange-amount-fixed': {
        const { from, to, amount } = params;
        if (!isValidTicker(from) || !isValidTicker(to)) {
          return new Response(
            JSON.stringify({ error: 'Invalid currency ticker format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAmount(amount)) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount: must be a positive number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const safeFrom = sanitizeTicker(from);
        const safeTo = sanitizeTicker(to);
        response = await fetch(
          `${CHANGENOW_API_URL}/exchange-amount/fixed-rate/${amount}/${safeFrom}_${safeTo}?api_key=${CHANGENOW_API_KEY}&useRateId=true`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;
      }

      // Create exchange transaction
      case 'create-transaction': {
        const { from, to, address, amount, extraId, refundAddress, refundExtraId, contactEmail } = params;
        
        // Validate required fields
        if (!isValidTicker(from) || !isValidTicker(to)) {
          return new Response(
            JSON.stringify({ error: 'Invalid currency ticker format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAmount(amount)) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount: must be a positive number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAddress(address)) {
          return new Response(
            JSON.stringify({ error: 'Invalid wallet address format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidEmail(contactEmail)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidExtraId(extraId) || !isValidExtraId(refundExtraId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid extra ID format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (refundAddress && !isValidAddress(refundAddress)) {
          return new Response(
            JSON.stringify({ error: 'Invalid refund address format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        response = await fetch(`${CHANGENOW_API_URL}/transactions/${CHANGENOW_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: sanitizeTicker(from),
            to: sanitizeTicker(to),
            address,
            amount,
            extraId: extraId || '',
            refundAddress: refundAddress || '',
            refundExtraId: refundExtraId || '',
            contactEmail: contactEmail || '',
          }),
        });
        data = await response.json();
        console.log('Transaction created:', data, `IP: ${clientIp}`);
        break;
      }

      // Create fixed-rate exchange transaction
      case 'create-transaction-fixed': {
        const { from, to, address, amount, rateId, extraId, refundAddress, refundExtraId, contactEmail } = params;
        
        // Validate required fields
        if (!isValidTicker(from) || !isValidTicker(to)) {
          return new Response(
            JSON.stringify({ error: 'Invalid currency ticker format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAmount(amount)) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount: must be a positive number' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidAddress(address)) {
          return new Response(
            JSON.stringify({ error: 'Invalid wallet address format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidRateId(rateId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid rate ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidEmail(contactEmail)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!isValidExtraId(extraId) || !isValidExtraId(refundExtraId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid extra ID format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (refundAddress && !isValidAddress(refundAddress)) {
          return new Response(
            JSON.stringify({ error: 'Invalid refund address format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        response = await fetch(`${CHANGENOW_API_URL}/transactions/fixed-rate/${CHANGENOW_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: sanitizeTicker(from),
            to: sanitizeTicker(to),
            address,
            amount,
            rateId,
            extraId: extraId || '',
            refundAddress: refundAddress || '',
            refundExtraId: refundExtraId || '',
            contactEmail: contactEmail || '',
          }),
        });
        data = await response.json();
        console.log('Fixed-rate transaction created:', data, `IP: ${clientIp}`);
        break;
      }

      // Get transaction status
      case 'transaction-status': {
        const { id } = params;
        if (!isValidTransactionId(id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid transaction ID format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await fetch(
          `${CHANGENOW_API_URL}/transactions/${id}/${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;
      }

      default:
        // This should never happen due to VALID_ACTIONS check
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response.ok) {
      console.error('ChangeNow API error:', response.status, data);

      // IMPORTANT: Return 200 so the web client can handle provider errors gracefully.
      // We only use non-2xx for our own validation / rate-limit responses above.
      return new Response(
        JSON.stringify({
          error: (data as Record<string, unknown>)?.message || 'API error',
          details: data,
          httpStatus: response.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
