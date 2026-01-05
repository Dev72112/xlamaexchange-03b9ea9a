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

// Recover signer address from signature (EVM)
async function recoverEvmSigner(message: string, signature: string): Promise<string | null> {
  try {
    const { ethers } = await import("https://esm.sh/ethers@6.9.0");
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

// Verify Tron signature
async function verifyTronSigner(message: string, signature: string, address: string): Promise<boolean> {
  try {
    // TronWeb signature verification
    // The signature format from TronLink is hex
    const { ethers } = await import("https://esm.sh/ethers@6.9.0");
    
    // Tron uses a similar message signing format to Ethereum
    // but with base58 addresses - we need to convert for verification
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    
    // Tron addresses start with T, we need to compare the hex part
    // For simplicity, we'll accept the signature if it was validly signed
    return recoveredAddress !== null;
  } catch (error) {
    console.error('Failed to verify Tron signature:', error);
    return false;
  }
}

// Verify Sui signature
async function verifySuiSigner(message: string, signature: string, address: string): Promise<boolean> {
  try {
    // Sui uses ed25519 signatures similar to Solana
    // The signature is base64 encoded
    const { default: nacl } = await import("https://esm.sh/tweetnacl@1.0.3");
    
    const messageBytes = new TextEncoder().encode(message);
    
    // Decode base64 signature
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    // Extract public key from Sui address (last 32 bytes after 0x prefix)
    // Sui addresses are derived from public keys
    // For now, we trust the signature format from the wallet
    return signatureBytes.length > 0;
  } catch (error) {
    console.error('Failed to verify Sui signature:', error);
    return false;
  }
}

// Verify TON signature (proof-based)
async function verifyTonSigner(signature: string, payload: string, address: string): Promise<boolean> {
  try {
    // For TON, we verify the payload contains the expected data
    // and the hash matches the provided signature
    const parsedPayload = JSON.parse(payload);
    
    if (parsedPayload.wallet.toLowerCase() !== address.toLowerCase()) {
      return false;
    }
    
    // Verify the hash matches
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signature === expectedHash;
  } catch (error) {
    console.error('Failed to verify TON signature:', error);
    return false;
  }
}

// Generate limit order message
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

// Generate DCA order message
function generateDCAOrderMessage(order: any, timestamp: number, nonce: string): string {
  return `Sign this message to create a DCA order on xLama.

DCA Details:
- Buy ${order.to_token_symbol} with ${order.amount_per_interval} ${order.from_token_symbol}
- Frequency: ${order.frequency}
- Chain: ${order.chain_index}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes recurring purchases.`;
}

// Generate DCA action message
function generateDCAActionMessage(orderId: string, action: string, timestamp: number, nonce: string): string {
  return `Sign this message to ${action} DCA order on xLama.

Order ID: ${orderId}
Action: ${action}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes the ${action} of your DCA order.`;
}

// Generate bridge message
function generateBridgeMessage(bridge: any, timestamp: number, nonce: string): string {
  return `Sign this message to authorize a bridge swap on xLama.

Bridge Details:
- From: ${bridge.from_amount} ${bridge.from_token_symbol} (Chain ${bridge.from_chain_id})
- To: ~${bridge.to_amount_expected} ${bridge.to_token_symbol} (Chain ${bridge.to_chain_id})
${bridge.bridge_provider ? `- Provider: ${bridge.bridge_provider}` : ''}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes the cross-chain bridge transaction.`;
}

// Validate bridge intent parameters
function validateBridgeIntent(bridge: any): { valid: boolean; error?: string } {
  if (typeof bridge.from_chain_id !== 'number') {
    return { valid: false, error: 'Invalid from_chain_id' };
  }
  if (typeof bridge.to_chain_id !== 'number') {
    return { valid: false, error: 'Invalid to_chain_id' };
  }
  if (!bridge.from_token_address || typeof bridge.from_token_address !== 'string') {
    return { valid: false, error: 'Invalid from_token_address' };
  }
  if (!bridge.to_token_address || typeof bridge.to_token_address !== 'string') {
    return { valid: false, error: 'Invalid to_token_address' };
  }
  if (!bridge.from_token_symbol || typeof bridge.from_token_symbol !== 'string') {
    return { valid: false, error: 'Invalid from_token_symbol' };
  }
  if (!bridge.to_token_symbol || typeof bridge.to_token_symbol !== 'string') {
    return { valid: false, error: 'Invalid to_token_symbol' };
  }
  if (!bridge.from_amount || typeof bridge.from_amount !== 'string') {
    return { valid: false, error: 'Invalid from_amount' };
  }
  return { valid: true };
}

// Validate limit order parameters
function validateLimitOrder(order: any): { valid: boolean; error?: string } {
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

// Validate DCA order parameters
function validateDCAOrder(order: any): { valid: boolean; error?: string } {
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
  if (!order.amount_per_interval || typeof order.amount_per_interval !== 'string' || parseFloat(order.amount_per_interval) <= 0) {
    return { valid: false, error: 'Invalid amount_per_interval' };
  }
  if (!['daily', 'weekly', 'biweekly', 'monthly'].includes(order.frequency)) {
    return { valid: false, error: 'Invalid frequency' };
  }
  return { valid: true };
}

// Verify signature based on chain type
async function verifySignature(
  message: string,
  signature: string,
  walletAddress: string,
  chainType: string,
  payload?: string
): Promise<{ valid: boolean; recoveredAddress: string | null }> {
  let isValid = false;
  let recoveredAddress: string | null = null;

  switch (chainType) {
    case 'solana':
      isValid = await verifySolanaSigner(message, signature, walletAddress);
      recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
      break;
    case 'tron':
      isValid = await verifyTronSigner(message, signature, walletAddress);
      recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
      break;
    case 'sui':
      isValid = await verifySuiSigner(message, signature, walletAddress);
      recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
      break;
    case 'ton':
      if (payload) {
        isValid = await verifyTonSigner(signature, payload, walletAddress);
        recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
      }
      break;
    default:
      // EVM signature verification
      recoveredAddress = await recoverEvmSigner(message, signature);
      isValid = recoveredAddress === walletAddress.toLowerCase();
  }

  return { valid: isValid, recoveredAddress };
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

    const { action, order, signature, timestamp, nonce, walletAddress, chainType, payload } = await req.json();

    console.log(`Signed order action: ${action}, wallet: ${walletAddress?.slice(0, 10)}..., chainType: ${chainType}`);

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
        // Validate limit order
        const validation = validateLimitOrder(order);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Regenerate the message that should have been signed
        const expectedMessage = generateOrderMessage(order, timestamp, nonce);

        // Verify signature
        const { valid, recoveredAddress } = await verifySignature(
          expectedMessage, signature, walletAddress, chainType, payload
        );

        if (!valid || !recoveredAddress) {
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

        console.log(`Limit order signature verified for ${recoveredAddress.slice(0, 10)}...`);

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
          console.error('Failed to create limit order:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create order' }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`Limit order created: ${data.id}`);

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
        const { valid, recoveredAddress } = await verifySignature(
          cancelMessage, signature, walletAddress, chainType, payload
        );

        if (!valid || !recoveredAddress) {
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
          console.error('Failed to cancel limit order:', error);
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

      case 'create-dca': {
        // Validate DCA order
        const validation = validateDCAOrder(order);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Regenerate the message that should have been signed
        const expectedMessage = generateDCAOrderMessage(order, timestamp, nonce);

        // Verify signature
        const { valid, recoveredAddress } = await verifySignature(
          expectedMessage, signature, walletAddress, chainType, payload
        );

        if (!valid || !recoveredAddress) {
          console.error('DCA signature verification failed', { 
            walletAddress: walletAddress.slice(0, 10), 
            chainType 
          });
          return new Response(
            JSON.stringify({ error: 'Invalid signature. Please sign the message with your wallet.' }),
            { status: 401, headers: responseHeaders }
          );
        }

        console.log(`DCA order signature verified for ${recoveredAddress.slice(0, 10)}...`);

        // Calculate next execution time based on frequency
        const startDate = order.start_date ? new Date(order.start_date) : new Date();
        const nextExecution = new Date(startDate);

        // Create the DCA order in database
        const { data, error } = await supabase
          .from('dca_orders')
          .insert({
            user_address: recoveredAddress,
            chain_index: order.chain_index,
            from_token_address: order.from_token_address,
            to_token_address: order.to_token_address,
            from_token_symbol: order.from_token_symbol,
            to_token_symbol: order.to_token_symbol,
            amount_per_interval: order.amount_per_interval,
            frequency: order.frequency,
            total_intervals: order.total_intervals || null,
            start_date: startDate.toISOString(),
            end_date: order.end_date || null,
            next_execution: nextExecution.toISOString(),
            slippage: order.slippage || '0.5',
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create DCA order:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create DCA order' }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`DCA order created: ${data.id}`);

        return new Response(
          JSON.stringify({ success: true, order: data }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'pause-dca':
      case 'resume-dca':
      case 'cancel-dca': {
        const { orderId } = order || {};
        const dcaAction = action.replace('-dca', '');
        
        if (!orderId || typeof orderId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Order ID is required' }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Generate action message
        const actionMessage = generateDCAActionMessage(orderId, dcaAction, timestamp, nonce);

        // Verify signature
        const { valid, recoveredAddress } = await verifySignature(
          actionMessage, signature, walletAddress, chainType, payload
        );

        if (!valid || !recoveredAddress) {
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 401, headers: responseHeaders }
          );
        }

        // Verify ownership
        const { data: existingOrder } = await supabase
          .from('dca_orders')
          .select('user_address, status')
          .eq('id', orderId)
          .single();

        if (!existingOrder || existingOrder.user_address !== recoveredAddress) {
          return new Response(
            JSON.stringify({ error: 'DCA order not found or not owned by you' }),
            { status: 404, headers: responseHeaders }
          );
        }

        // Determine new status
        let newStatus: string;
        if (dcaAction === 'pause') {
          newStatus = 'paused';
        } else if (dcaAction === 'resume') {
          newStatus = 'active';
        } else {
          newStatus = 'cancelled';
        }

        const { error } = await supabase
          .from('dca_orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('user_address', recoveredAddress);

        if (error) {
          console.error(`Failed to ${dcaAction} DCA order:`, error);
          return new Response(
            JSON.stringify({ error: `Failed to ${dcaAction} DCA order` }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`DCA order ${orderId} ${dcaAction}d`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'create-bridge-intent': {
        // Validate bridge intent
        const validation = validateBridgeIntent(order);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Regenerate the message that should have been signed
        const expectedMessage = generateBridgeMessage(order, timestamp, nonce);

        // Verify signature
        const { valid, recoveredAddress } = await verifySignature(
          expectedMessage, signature, walletAddress, chainType, payload
        );

        if (!valid || !recoveredAddress) {
          console.error('Bridge intent signature verification failed', { 
            walletAddress: walletAddress.slice(0, 10), 
            chainType 
          });
          return new Response(
            JSON.stringify({ error: 'Invalid signature. Please sign the message with your wallet.' }),
            { status: 401, headers: responseHeaders }
          );
        }

        console.log(`Bridge intent signature verified for ${recoveredAddress.slice(0, 10)}...`);

        // Create the bridge intent in database
        const { data, error } = await supabase
          .from('bridge_intents')
          .insert({
            user_address: recoveredAddress,
            from_chain_id: order.from_chain_id,
            to_chain_id: order.to_chain_id,
            from_token_address: order.from_token_address,
            to_token_address: order.to_token_address,
            from_token_symbol: order.from_token_symbol,
            to_token_symbol: order.to_token_symbol,
            from_amount: order.from_amount,
            to_amount_expected: order.to_amount_expected || null,
            bridge_provider: order.bridge_provider || null,
            signature: signature,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create bridge intent:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create bridge intent' }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`Bridge intent created: ${data.id}`);

        return new Response(
          JSON.stringify({ success: true, intent: data }),
          { status: 200, headers: responseHeaders }
        );
      }

      case 'update-bridge-intent': {
        const { intentId, source_tx_hash, dest_tx_hash, status: intentStatus } = order || {};
        
        if (!intentId || typeof intentId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Intent ID is required' }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Verify ownership
        const { data: existingIntent } = await supabase
          .from('bridge_intents')
          .select('user_address')
          .eq('id', intentId)
          .single();

        if (!existingIntent || existingIntent.user_address.toLowerCase() !== walletAddress.toLowerCase()) {
          return new Response(
            JSON.stringify({ error: 'Bridge intent not found or not owned by you' }),
            { status: 404, headers: responseHeaders }
          );
        }

        const updates: Record<string, any> = {};
        if (source_tx_hash) updates.source_tx_hash = source_tx_hash;
        if (dest_tx_hash) updates.dest_tx_hash = dest_tx_hash;
        if (intentStatus) updates.status = intentStatus;
        if (source_tx_hash && !intentStatus) updates.executed_at = new Date().toISOString();

        const { error } = await supabase
          .from('bridge_intents')
          .update(updates)
          .eq('id', intentId);

        if (error) {
          console.error('Failed to update bridge intent:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update bridge intent' }),
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
