import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OKX_API_KEY = Deno.env.get('OKX_API_KEY')!;
const OKX_SECRET_KEY = Deno.env.get('OKX_SECRET_KEY')!;
const OKX_API_PASSPHRASE = Deno.env.get('OKX_API_PASSPHRASE')!;
const OKX_PROJECT_ID = Deno.env.get('OKX_PROJECT_ID')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

// Create HMAC signature for OKX API
async function createOkxSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string = ''
): Promise<string> {
  const message = timestamp + method + path + body;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OKX_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Fetch token price from OKX
async function getTokenPrice(chainIndex: string, tokenAddress: string): Promise<number | null> {
  try {
    const timestamp = new Date().toISOString();
    const path = '/api/v5/dex/market/token-price';
    const body = JSON.stringify({ chainIndex, tokenContractAddress: tokenAddress });
    const signature = await createOkxSignature(timestamp, 'POST', path, body);

    const response = await fetch(`https://www.okx.com${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': OKX_API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
        'OK-ACCESS-PROJECT': OKX_PROJECT_ID,
      },
      body,
    });

    const data = await response.json();
    if (data?.data?.[0]?.price) {
      return parseFloat(data.data[0].price);
    }
    return null;
  } catch (error) {
    console.error('Failed to get token price:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate cron/admin requests
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[execute-orders] Unauthorized request - invalid or missing CRON_SECRET');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const currentHour = now.getUTCHours();

    console.log(`[execute-orders] Starting execution check at ${now.toISOString()}, hour: ${currentHour}`);

    // ==================== LIMIT ORDERS ====================
    // Check for triggered limit orders that need price checking
    const { data: limitOrders, error: limitError } = await supabase
      .from('limit_orders')
      .select('*')
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);

    if (limitError) {
      console.error('Failed to fetch limit orders:', limitError);
    } else {
      console.log(`[execute-orders] Found ${limitOrders?.length || 0} active limit orders`);

      for (const order of limitOrders || []) {
        try {
          // Get current price for the from token
          const currentPrice = await getTokenPrice(order.chain_index, order.from_token_address);
          
          if (currentPrice === null) {
            console.warn(`[limit-order] Could not get price for ${order.from_token_symbol} on chain ${order.chain_index}`);
            continue;
          }

          const targetPrice = parseFloat(order.target_price);
          let isTriggered = false;
          let triggerType = 'target';

          // Check main target price condition
          if (order.condition === 'above' && currentPrice >= targetPrice) {
            isTriggered = true;
            console.log(`[limit-order] ${order.id} TRIGGERED (above): current ${currentPrice} >= target ${targetPrice}`);
          } else if (order.condition === 'below' && currentPrice <= targetPrice) {
            isTriggered = true;
            console.log(`[limit-order] ${order.id} TRIGGERED (below): current ${currentPrice} <= target ${targetPrice}`);
          }

          // Check Take Profit price (if set and not already triggered)
          const tpPrice = order.take_profit_price ? parseFloat(order.take_profit_price) : null;
          if (!isTriggered && tpPrice && currentPrice >= tpPrice) {
            isTriggered = true;
            triggerType = 'take_profit';
            console.log(`[limit-order] ${order.id} TP TRIGGERED: current ${currentPrice} >= TP ${tpPrice}`);
          }

          // Check Stop Loss price (if set and not already triggered)
          const slPrice = order.stop_loss_price ? parseFloat(order.stop_loss_price) : null;
          if (!isTriggered && slPrice && currentPrice <= slPrice) {
            isTriggered = true;
            triggerType = 'stop_loss';
            console.log(`[limit-order] ${order.id} SL TRIGGERED: current ${currentPrice} <= SL ${slPrice}`);
          }

          if (isTriggered) {
            // Update order status to triggered with 24-hour expiration window
            const triggerExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            const updateData: any = {
              status: 'triggered',
              triggered_at: now.toISOString(),
              trigger_expires_at: triggerExpiresAt.toISOString(),
            };

            // Track which condition triggered
            if (triggerType === 'take_profit') {
              updateData.tp_triggered_at = now.toISOString();
            } else if (triggerType === 'stop_loss') {
              updateData.sl_triggered_at = now.toISOString();
            }

            await supabase
              .from('limit_orders')
              .update(updateData)
              .eq('id', order.id);

            console.log(`[limit-order] Order ${order.id} marked as triggered (${triggerType}) for ${order.from_token_symbol} -> ${order.to_token_symbol}`);
          }
        } catch (error) {
          console.error(`[limit-order] Error processing order ${order.id}:`, error);
          await supabase
            .from('limit_orders')
            .update({ execution_error: String(error) })
            .eq('id', order.id);
        }
      }
    }

    // Expire old limit orders (past their main expiry date)
    const { data: expiredOrders } = await supabase
      .from('limit_orders')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now.toISOString())
      .select('id');
    
    if (expiredOrders?.length) {
      console.log(`[execute-orders] Expired ${expiredOrders.length} limit orders (past expiry date)`);
    }

    // Expire triggered orders past their 24-hour execution window
    const { data: expiredTriggeredOrders } = await supabase
      .from('limit_orders')
      .update({ status: 'expired', execution_error: 'Trigger window expired (24 hours)' })
      .eq('status', 'triggered')
      .lt('trigger_expires_at', now.toISOString())
      .select('id');
    
    if (expiredTriggeredOrders?.length) {
      console.log(`[execute-orders] Expired ${expiredTriggeredOrders.length} triggered orders (execution window expired)`);
    }

    // ==================== DCA ORDERS ====================
    // Check for DCA orders that are due for execution
    const { data: dcaOrders, error: dcaError } = await supabase
      .from('dca_orders')
      .select('*')
      .eq('status', 'active')
      .lte('next_execution', now.toISOString());

    if (dcaError) {
      console.error('Failed to fetch DCA orders:', dcaError);
    } else {
      console.log(`[execute-orders] Found ${dcaOrders?.length || 0} DCA orders due for execution`);

      for (const order of dcaOrders || []) {
        try {
          // Check if current hour matches execution hour (default 9 AM UTC)
          const executionHour = order.execution_hour ?? 9;
          if (currentHour !== executionHour) {
            console.log(`[dca-order] ${order.id} skipped - not execution hour (current: ${currentHour}, target: ${executionHour})`);
            continue;
          }

          // Note: Actual DCA execution requires user's wallet signature
          // For now, we mark the order status and update next_execution
          // Users need to manually execute or set up automated execution with their keys

          // Calculate next execution based on frequency
          const nextExecution = new Date(now);
          switch (order.frequency) {
            case 'daily':
              nextExecution.setDate(nextExecution.getDate() + 1);
              break;
            case 'weekly':
              nextExecution.setDate(nextExecution.getDate() + 7);
              break;
            case 'biweekly':
              nextExecution.setDate(nextExecution.getDate() + 14);
              break;
            case 'monthly':
              nextExecution.setMonth(nextExecution.getMonth() + 1);
              break;
          }

          // Set to the correct execution hour
          nextExecution.setUTCHours(executionHour, 0, 0, 0);

          // Check if order is complete
          const newCompletedIntervals = order.completed_intervals + 1;
          const isComplete = order.total_intervals && newCompletedIntervals >= order.total_intervals;

          if (isComplete) {
            await supabase
              .from('dca_orders')
              .update({
                status: 'completed',
                completed_intervals: newCompletedIntervals,
                end_date: now.toISOString(),
              })
              .eq('id', order.id);

            console.log(`[dca-order] Order ${order.id} COMPLETED (${newCompletedIntervals}/${order.total_intervals} intervals)`);
          } else {
            // Update order with next execution time
            // Note: Without the user's wallet, we can't execute the swap automatically
            // The order will show as "pending execution" in the UI
            await supabase
              .from('dca_orders')
              .update({
                next_execution: nextExecution.toISOString(),
                completed_intervals: newCompletedIntervals,
                last_execution_error: 'Manual execution required - connect wallet to execute',
              })
              .eq('id', order.id);

            console.log(`[dca-order] Order ${order.id} updated - next execution: ${nextExecution.toISOString()}`);
          }
        } catch (error) {
          console.error(`[dca-order] Error processing order ${order.id}:`, error);
          await supabase
            .from('dca_orders')
            .update({ last_execution_error: String(error) })
            .eq('id', order.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        limitOrdersChecked: limitOrders?.length || 0,
        dcaOrdersProcessed: dcaOrders?.length || 0,
        expiredOrders: expiredOrders?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[execute-orders] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
