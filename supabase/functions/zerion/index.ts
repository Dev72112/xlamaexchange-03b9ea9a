import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { securityHeaders } from "../_shared/security-headers.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

// Add Zerion to rate limits
const ZERION_RATE_LIMIT = { maxRequests: 60, windowSeconds: 60 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZERION_BASE_URL = 'https://api.zerion.io/v1';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const { allowed } = await checkRateLimit('zerion', clientIp);
  
  if (!allowed) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const { action, address, params } = await req.json();
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ZERION_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Zerion API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic auth with API key as username
    const auth = btoa(`${apiKey}:`);
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    let endpoint: string;
    let queryParams = new URLSearchParams();

    switch (action) {
      case 'wallet-portfolio':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-portfolio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/portfolio`;
        if (params?.currency) queryParams.set('currency', params.currency);
        break;

      case 'wallet-positions':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-positions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/positions`;
        if (params?.filter_positions) queryParams.set('filter[positions]', params.filter_positions);
        if (params?.filter_trash) queryParams.set('filter[trash]', params.filter_trash);
        if (params?.currency) queryParams.set('currency', params.currency);
        if (params?.sort) queryParams.set('sort', params.sort);
        break;

      case 'wallet-pnl':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-pnl' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/pnl`;
        if (params?.currency) queryParams.set('currency', params.currency);
        break;

      case 'wallet-transactions':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-transactions' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/transactions`;
        if (params?.currency) queryParams.set('currency', params.currency);
        if (params?.page_size) queryParams.set('page[size]', params.page_size);
        if (params?.page_after) queryParams.set('page[after]', params.page_after);
        if (params?.filter_operation_types) queryParams.set('filter[operation_types]', params.filter_operation_types);
        if (params?.filter_chain_ids) queryParams.set('filter[chain_ids]', params.filter_chain_ids);
        break;

      case 'wallet-nfts':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-nfts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/nft-positions`;
        if (params?.currency) queryParams.set('currency', params.currency);
        if (params?.page_size) queryParams.set('page[size]', params.page_size);
        break;

      case 'wallet-charts':
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address is required for wallet-charts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/wallets/${address}/charts`;
        if (params?.currency) queryParams.set('currency', params.currency);
        if (params?.charts_type) queryParams.set('charts_type', params.charts_type);
        if (params?.charts_period) queryParams.set('charts_period', params.charts_period);
        break;

      case 'fungibles':
        endpoint = '/fungibles';
        if (params?.filter_chain_ids) queryParams.set('filter[chain_ids]', params.filter_chain_ids);
        if (params?.filter_search_query) queryParams.set('filter[search_query]', params.filter_search_query);
        if (params?.page_size) queryParams.set('page[size]', params.page_size);
        break;

      case 'fungible-charts':
        if (!params?.fungible_id) {
          return new Response(
            JSON.stringify({ error: 'fungible_id is required for fungible-charts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        endpoint = `/fungibles/${params.fungible_id}/charts`;
        if (params?.currency) queryParams.set('currency', params.currency);
        if (params?.charts_period) queryParams.set('charts_period', params.charts_period);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const queryString = queryParams.toString();
    const url = `${ZERION_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`[Zerion] Fetching: ${action} for ${address || 'N/A'}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Zerion] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Zerion API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          ...securityHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30'
        } 
      }
    );
  } catch (error) {
    console.error('[Zerion] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
