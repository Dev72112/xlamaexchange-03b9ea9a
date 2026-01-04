import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// EIP-191 message prefix
const EIP191_PREFIX = '\x19Ethereum Signed Message:\n';

// Recover signer address from signature (EVM)
async function recoverEvmSigner(message: string, signature: string): Promise<string | null> {
  try {
    // Import ethers for signature recovery
    const { ethers } = await import("https://esm.sh/ethers@6.9.0");
    
    // Recover the address that signed the message
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase();
  } catch (error) {
    console.error('Failed to recover EVM signer:', error);
    return null;
  }
}

// Verify Solana signature using ed25519
async function verifySolanaSigner(message: string, signature: string, publicKey: string): Promise<boolean> {
  try {
    const { default: nacl } = await import("https://esm.sh/tweetnacl@1.0.3");
    const bs58 = await import("https://esm.sh/bs58@5.0.0");
    
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.default.decode(signature);
    const publicKeyBytes = bs58.default.decode(publicKey);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Failed to verify Solana signature:', error);
    return false;
  }
}

// Generate the message to be signed
function generateOrderMessage(order: any, timestamp: number, nonce: string): string {
  return `Sign this message to create a limit order on xLama.

Order Details:
- Swap ${order.amount} ${order.from_token_symbol} → ${order.to_token_symbol}
- Trigger: ${order.condition} $${order.target_price}
- Chain: ${order.chain_index}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature proves you own this wallet and authorizes the order creation.`;
}

// Validate order parameters
function validateOrder(order: any): { valid: boolean; error?: string } {
  if (!order.chain_index || typeof order.chain_index !== 'string') {
    return { valid: false, error: 'Invalid chain_index' };
  }
  if (!order.from_token_address || typeof order.from_token_address !== 'string') {
    return { valid: false, error: 'Invalid from_token_address' };
  }
  if (!order.to_token_address || typeof order.to_token_address !== 'string') {
    return { valid: false, error: 'Invalid to_token_address' };
  }
  if (!order.from_token_symbol || typeof order.from_token_symbol !== 'string') {
    return { valid: false, error: 'Invalid from_token_symbol' };
  }
  if (!order.to_token_symbol || typeof order.to_token_symbol !== 'string') {
    return { valid: false, error: 'Invalid to_token_symbol' };
  }
  if (!order.amount || typeof order.amount !== 'string' || parseFloat(order.amount) <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }
  if (typeof order.target_price !== 'number' || order.target_price <= 0) {
    return { valid: false, error: 'Invalid target_price' };
  }
  if (!['above', 'below'].includes(order.condition)) {
    return { valid: false, error: 'Invalid condition' };
  }
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' };

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: responseHeaders }
      );
    }

    const { action, order, signature, timestamp, nonce, walletAddress, chainType } = await req.json();

    console.log(`Signed order action: ${action}, wallet: ${walletAddress?.slice(0, 10)}...`);

    // Validate common parameters
    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!signature || typeof signature !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Signature is required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!timestamp || typeof timestamp !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Timestamp is required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    if (!nonce || typeof nonce !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Nonce is required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Check timestamp is within 5 minutes
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Signature expired. Please try again.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'create-order': {
        // Validate order
        const validation = validateOrder(order);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Regenerate the message that should have been signed
        const expectedMessage = generateOrderMessage(order, timestamp, nonce);

        // Verify signature based on chain type
        let isValid = false;
        let recoveredAddress: string | null = null;

        if (chainType === 'solana') {
          isValid = await verifySolanaSigner(expectedMessage, signature, walletAddress);
          recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
        } else {
          // Default to EVM signature verification
          recoveredAddress = await recoverEvmSigner(expectedMessage, signature);
          isValid = recoveredAddress === walletAddress.toLowerCase();
        }

        if (!isValid || !recoveredAddress) {
          console.error('Signature verification failed', { 
            walletAddress: walletAddress.slice(0, 10), 
            recoveredAddress: recoveredAddress?.slice(0, 10),
            chainType 
          });
          return new Response(
            JSON.stringify({ error: 'Invalid signature. Please sign the message with your wallet.' }),
            { status: 401, headers: responseHeaders }
          );
        }

        console.log(`Signature verified for ${recoveredAddress.slice(0, 10)}...`);

        // Create the order in database
        const { data, error } = await supabase
          .from('limit_orders')
          .insert({
            user_address: recoveredAddress,
            chain_index: order.chain_index,
            from_token_address: order.from_token_address,
            to_token_address: order.to_token_address,
            from_token_symbol: order.from_token_symbol,
            to_token_symbol: order.to_token_symbol,
            amount: order.amount,
            target_price: order.target_price,
            condition: order.condition,
            slippage: order.slippage || '0.5',
            expires_at: order.expires_at || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create order:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create order' }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`Order created: ${data.id}`);

        return new Response(
          JSON.stringify({ success: true, order: data }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'cancel-order': {
        const { orderId } = order || {};
        
        if (!orderId || typeof orderId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Order ID is required' }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Generate cancel message
        const cancelMessage = `Sign this message to cancel limit order on xLama.

Order ID: ${orderId}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes cancellation of your order.`;

        // Verify signature
        let isValid = false;
        let recoveredAddress: string | null = null;

        if (chainType === 'solana') {
          isValid = await verifySolanaSigner(cancelMessage, signature, walletAddress);
          recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
        } else {
          recoveredAddress = await recoverEvmSigner(cancelMessage, signature);
          isValid = recoveredAddress === walletAddress.toLowerCase();
        }

        if (!isValid || !recoveredAddress) {
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: responseHeaders }
          );
        }

        // Verify ownership and cancel
        const { data: existingOrder } = await supabase
          .from('limit_orders')
          .select('user_address')
          .eq('id', orderId)
          .single();

        if (!existingOrder || existingOrder.user_address !== recoveredAddress) {
          return new Response(
            JSON.stringify({ error: 'Order not found or not owned by you' }),
            { status: 404, headers: responseHeaders }
          );
        }

        const { error } = await supabase
          .from('limit_orders')
          .update({ status: 'cancelled' })
          .eq('id', orderId)
          .eq('user_address', recoveredAddress);

        if (error) {
          console.error('Failed to cancel order:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to cancel order' }),
            { status: 500, headers: responseHeaders }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: responseHeaders }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: responseHeaders }
        );
    }

  } catch (error) {
    console.error('Signed orders edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
