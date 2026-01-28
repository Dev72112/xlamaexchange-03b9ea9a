/**
 * xLama Webhook Service
 * Sends swap completion events to the xLama backend for real-time sync
 */

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xlama-api`;

export interface SwapWebhookPayload {
  event: 'swap.completed';
  source: 'xlamaexchange';
  data: {
    tx_hash: string;
    wallet_address: string;
    chain_id: string;
    token_in_symbol: string;
    token_in_amount: string;
    token_in_usd_value: number;
    token_out_symbol: string;
    token_out_amount: string;
    token_out_usd_value: number;
    gas_fee: string;
    gas_fee_usd: number;
    slippage: string;
    status: 'completed';
  };
}

/**
 * Send swap completion webhook to xLama backend
 * Uses the edge function proxy to inject the API key
 */
export async function sendSwapWebhook(payload: SwapWebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[xLama Webhook] Failed to send:', error);
      return false;
    }

    console.log('[xLama Webhook] Swap notification sent successfully');
    return true;
  } catch (error) {
    console.error('[xLama Webhook] Failed to send swap notification:', error);
    return false;
  }
}

export default sendSwapWebhook;
