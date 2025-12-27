import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHANGENOW_API_KEY = Deno.env.get('CHANGENOW_API_KEY');
const CHANGENOW_API_URL = 'https://api.changenow.io/v1';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    console.log(`ChangeNow API action: ${action}`, params);

    if (!CHANGENOW_API_KEY) {
      throw new Error('CHANGENOW_API_KEY is not configured');
    }

    let response: Response;
    let data: any;

    switch (action) {
      // Get available currencies
      case 'currencies':
        response = await fetch(`${CHANGENOW_API_URL}/currencies?active=true`, {
          headers: { 'Content-Type': 'application/json' },
        });
        data = await response.json();
        break;

      // Get minimum exchange amount
      case 'min-amount':
        const { from, to } = params;
        response = await fetch(
          `${CHANGENOW_API_URL}/min-amount/${from}_${to}?api_key=${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;

      // Get estimated exchange amount (floating rate)
      case 'exchange-amount':
        response = await fetch(
          `${CHANGENOW_API_URL}/exchange-amount/${params.amount}/${params.from}_${params.to}?api_key=${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;

      // Get estimated exchange amount (fixed rate)
      case 'exchange-amount-fixed':
        response = await fetch(
          `${CHANGENOW_API_URL}/exchange-amount/fixed-rate/${params.amount}/${params.from}_${params.to}?api_key=${CHANGENOW_API_KEY}&useRateId=true`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;

      // Create exchange transaction
      case 'create-transaction':
        response = await fetch(`${CHANGENOW_API_URL}/transactions/${CHANGENOW_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: params.from,
            to: params.to,
            address: params.address,
            amount: params.amount,
            extraId: params.extraId || '',
            refundAddress: params.refundAddress || '',
            refundExtraId: params.refundExtraId || '',
            contactEmail: params.contactEmail || '',
          }),
        });
        data = await response.json();
        console.log('Transaction created:', data);
        break;

      // Create fixed-rate exchange transaction
      case 'create-transaction-fixed':
        response = await fetch(`${CHANGENOW_API_URL}/transactions/fixed-rate/${CHANGENOW_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: params.from,
            to: params.to,
            address: params.address,
            amount: params.amount,
            rateId: params.rateId,
            extraId: params.extraId || '',
            refundAddress: params.refundAddress || '',
            refundExtraId: params.refundExtraId || '',
            contactEmail: params.contactEmail || '',
          }),
        });
        data = await response.json();
        console.log('Fixed-rate transaction created:', data);
        break;

      // Get transaction status
      case 'transaction-status':
        response = await fetch(
          `${CHANGENOW_API_URL}/transactions/${params.id}/${CHANGENOW_API_KEY}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        data = await response.json();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      console.error('ChangeNow API error:', response.status, data);
      return new Response(JSON.stringify({ error: data.message || 'API error', details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
