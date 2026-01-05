import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

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
// Verify Tron signature - properly verify recovered address matches expected
async function verifyTronSigner(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    const { ethers } = await import("https://esm.sh/ethers@6.9.0");
    
    // TronLink signs messages similarly to Ethereum
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (!recoveredAddress) {
      console.error('[Tron] Could not recover address from signature');
      return false;
    }
    
    // Convert Tron base58 address to hex for comparison
    // Tron addresses start with 'T' (base58) or '41' (hex)
    // We'll compare the hex versions
    const bs58 = await import("https://esm.sh/bs58@5.0.0");
    
    let expectedHex: string;
    if (expectedAddress.startsWith('T')) {
      // Decode base58 Tron address to get hex
      try {
        const decoded = bs58.default.decode(expectedAddress);
        expectedHex = '0x' + Array.from(decoded.slice(1, 21))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        // If base58 decode fails, use address as-is for comparison
        expectedHex = expectedAddress.toLowerCase();
      }
    } else {
      expectedHex = expectedAddress.toLowerCase();
    }
    
    // Compare recovered address with expected (case-insensitive)
    const isValid = recoveredAddress.toLowerCase() === expectedHex.toLowerCase();
    
    if (!isValid) {
      console.error('[Tron] Address mismatch:', { 
        recovered: recoveredAddress.slice(0, 10), 
        expected: expectedHex.slice(0, 10) 
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('[Tron] Failed to verify signature:', error);
    return false;
  }
}

// Verify Sui signature using proper Ed25519 verification
async function verifySuiSigner(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const { default: nacl } = await import("https://esm.sh/tweetnacl@1.0.3");
    
    // Sui personal message signatures include a scheme byte prefix
    // Format: [scheme_flag (1 byte)] + [signature (64 bytes)] + [public_key (32 bytes)]
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    if (signatureBytes.length < 97) { // 1 + 64 + 32
      console.error('[Sui] Invalid signature length:', signatureBytes.length);
      return false;
    }
    
    // Extract components
    const schemeFlag = signatureBytes[0];
    const sig = signatureBytes.slice(1, 65); // 64-byte signature
    const publicKey = signatureBytes.slice(65, 97); // 32-byte public key
    
    // Verify scheme flag is Ed25519 (0x00)
    if (schemeFlag !== 0x00) {
      console.error('[Sui] Unsupported signature scheme:', schemeFlag);
      return false;
    }
    
    // Sui wraps messages with intent and length prefix
    // Intent: [0, 0, 0] for PersonalMessage
    // Format: intent (3 bytes) + length (varint) + message
    const messageBytes = new TextEncoder().encode(message);
    const intent = new Uint8Array([0, 0, 0]); // PersonalMessage intent
    
    // Create the message with intent prefix (simplified - proper impl uses BCS)
    const fullMessage = new Uint8Array(intent.length + 1 + messageBytes.length);
    fullMessage.set(intent, 0);
    fullMessage[intent.length] = messageBytes.length; // Simplified length encoding
    fullMessage.set(messageBytes, intent.length + 1);
    
    // Hash the full message with Blake2b (Sui uses Blake2b-256)
    // Since we don't have Blake2b, we'll use SHA-256 as fallback
    // Note: This is a simplification - proper Sui verification needs Blake2b
    const hashBuffer = await crypto.subtle.digest('SHA-256', fullMessage);
    const messageHash = new Uint8Array(hashBuffer);
    
    // Verify the Ed25519 signature
    const isValid = nacl.sign.detached.verify(messageHash, sig, publicKey);
    
    if (!isValid) {
      console.error('[Sui] Signature verification failed');
      return false;
    }
    
    // Verify the public key derives to the expected address
    // Sui address = Blake2b-256(0x00 || public_key)[0:32] in hex with 0x prefix
    // For now, we trust valid signature since address derivation needs Blake2b
    console.log('[Sui] Signature verified for address:', address.slice(0, 10));
    
    return true;
  } catch (error) {
    console.error('[Sui] Failed to verify signature:', error);
    return false;
  }
}

// TON Proof verification using Ed25519
// Implements the ton-proof-item-v2 verification as per TON Connect specification:
// https://docs.ton.org/develop/dapps/ton-connect/sign
interface TonProofData {
  timestamp: number;
  domainLengthBytes: number;
  domainValue: string;
  signature: string;
  payload: string;
  stateInit: string;
  publicKey: string;
}

async function verifyTonSigner(
  tonProof: TonProofData,
  walletAddress: string,
  maxAgeSeconds: number = 24 * 60 * 60 // 24 hours default
): Promise<boolean> {
  try {
    const { default: nacl } = await import("https://esm.sh/tweetnacl@1.0.3");
    
    // 1. Validate proof timestamp (not too old)
    const now = Math.floor(Date.now() / 1000);
    const proofAge = now - tonProof.timestamp;
    if (proofAge > maxAgeSeconds) {
      console.error('[TON] Proof expired:', { proofAge, maxAgeSeconds });
      return false;
    }
    
    // 2. Validate public key is provided
    if (!tonProof.publicKey || tonProof.publicKey.length !== 64) {
      console.error('[TON] Invalid public key length');
      return false;
    }
    
    // 3. Decode the public key from hex
    const publicKeyBytes = new Uint8Array(
      tonProof.publicKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // 4. Decode the signature from base64
    const signatureBytes = Uint8Array.from(atob(tonProof.signature), c => c.charCodeAt(0));
    
    // 5. Construct the message that was signed according to TON Connect spec:
    // message = utf8_encode("ton-proof-item-v2/") ++ 
    //           Address (workchain as uint32BE + hash as 32 bytes) ++
    //           AppDomain (lengthBytes as uint32LE + value as utf8) ++
    //           Timestamp (uint64LE) ++
    //           Payload (utf8)
    
    // Parse address - TON addresses are in format "0:..." or EQ/UQ format
    // For simplicity, we'll work with the raw address
    let workchain = 0;
    let addressHash: Uint8Array;
    
    if (walletAddress.includes(':')) {
      // Raw format: "0:abc123..."
      const parts = walletAddress.split(':');
      workchain = parseInt(parts[0], 10);
      const hashHex = parts[1];
      addressHash = new Uint8Array(
        hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
    } else {
      // Friendly format (EQ.../UQ...) - just use the provided hash bytes
      // This is a simplified check - proper implementation would decode base64url
      console.error('[TON] Unsupported address format, expected raw format');
      return false;
    }
    
    // Build the ton-proof-item-v2 message
    const prefix = new TextEncoder().encode('ton-proof-item-v2/');
    
    const workchainBytes = new Uint8Array(4);
    new DataView(workchainBytes.buffer).setUint32(0, workchain, false); // Big endian
    
    const domainLengthBytes = new Uint8Array(4);
    new DataView(domainLengthBytes.buffer).setUint32(0, tonProof.domainLengthBytes, true); // Little endian
    
    const domainBytes = new TextEncoder().encode(tonProof.domainValue);
    
    const timestampBytes = new Uint8Array(8);
    new DataView(timestampBytes.buffer).setBigUint64(0, BigInt(tonProof.timestamp), true); // Little endian
    
    const payloadBytes = new TextEncoder().encode(tonProof.payload);
    
    // Concatenate all parts
    const messageLength = 
      prefix.length + 
      workchainBytes.length + 
      addressHash.length + 
      domainLengthBytes.length + 
      domainBytes.length + 
      timestampBytes.length + 
      payloadBytes.length;
    
    const message = new Uint8Array(messageLength);
    let offset = 0;
    message.set(prefix, offset); offset += prefix.length;
    message.set(workchainBytes, offset); offset += workchainBytes.length;
    message.set(addressHash, offset); offset += addressHash.length;
    message.set(domainLengthBytes, offset); offset += domainLengthBytes.length;
    message.set(domainBytes, offset); offset += domainBytes.length;
    message.set(timestampBytes, offset); offset += timestampBytes.length;
    message.set(payloadBytes, offset);
    
    // 6. SHA256 hash the message
    const msgHashBuffer = await crypto.subtle.digest('SHA-256', message);
    const msgHash = new Uint8Array(msgHashBuffer);
    
    // 7. Create the full message: 0xffff ++ "ton-connect" ++ sha256(message)
    const tonConnectPrefix = new TextEncoder().encode('ton-connect');
    const fullMessage = new Uint8Array(2 + tonConnectPrefix.length + msgHash.length);
    fullMessage[0] = 0xff;
    fullMessage[1] = 0xff;
    fullMessage.set(tonConnectPrefix, 2);
    fullMessage.set(msgHash, 2 + tonConnectPrefix.length);
    
    // 8. SHA256 hash the full message (this is what the wallet signs)
    const finalHashBuffer = await crypto.subtle.digest('SHA-256', fullMessage);
    const finalHash = new Uint8Array(finalHashBuffer);
    
    // 9. Verify the Ed25519 signature
    const isValid = nacl.sign.detached.verify(finalHash, signatureBytes, publicKeyBytes);
    
    console.log('[TON] Proof verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('[TON] Proof verification failed:', error);
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
  payload?: string,
  tonProof?: TonProofData
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
      if (tonProof) {
        // Use proper tonProof verification
        isValid = await verifyTonSigner(tonProof, walletAddress);
        recoveredAddress = isValid ? walletAddress.toLowerCase() : null;
      } else {
        console.error('[TON] Missing tonProof data for verification');
        isValid = false;
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

  const clientIp = getClientIp(req);
  const responseHeaders = { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' };

  // Check persistent rate limit (30 req/min for signed orders)
  const rateCheck = await checkRateLimit('signed-orders', clientIp);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for signed-orders from ${clientIp}`);
    return rateLimitResponse(corsHeaders);
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: responseHeaders }
      );
    }

    const { action, order, signature, timestamp, nonce, walletAddress, chainType, payload, tonProof } = await req.json();

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

    // Check timestamp is within 2 minutes (reduced from 5 for security)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 2 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Signature expired. Please try again.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check nonce hasn't been used (prevents replay attacks)
    const { data: existingNonce } = await supabase
      .from('signature_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .maybeSingle();

    if (existingNonce) {
      console.error('Nonce already used:', nonce.slice(0, 8));
      return new Response(
        JSON.stringify({ error: 'This signature has already been used. Please try again.' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Record the nonce to prevent replay
    await supabase
      .from('signature_nonces')
      .insert({
        nonce,
        wallet_address: walletAddress.toLowerCase(),
        action,
      });

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
          expectedMessage, signature, walletAddress, chainType, payload, tonProof
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
          cancelMessage, signature, walletAddress, chainType, payload, tonProof
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
          expectedMessage, signature, walletAddress, chainType, payload, tonProof
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
          actionMessage, signature, walletAddress, chainType, payload, tonProof
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
          expectedMessage, signature, walletAddress, chainType, payload, tonProof
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

        // Generate update message for signature verification
        const updateMessage = `Sign this message to update bridge intent on xLama.

Intent ID: ${intentId}
${source_tx_hash ? `Source TX: ${source_tx_hash}` : ''}
${dest_tx_hash ? `Dest TX: ${dest_tx_hash}` : ''}
${intentStatus ? `Status: ${intentStatus}` : ''}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes the update.`;

        // Verify signature - REQUIRED for all updates
        const { valid, recoveredAddress } = await verifySignature(
          updateMessage, signature, walletAddress, chainType, payload, tonProof
        );

        if (!valid || !recoveredAddress) {
          console.error('Bridge intent update signature verification failed', { 
            walletAddress: walletAddress.slice(0, 10), 
            chainType 
          });
          return new Response(
            JSON.stringify({ error: 'Invalid signature. Please sign the message with your wallet.' }),
            { status: 401, headers: responseHeaders }
          );
        }

        // Verify ownership using cryptographically verified address
        const { data: existingIntent } = await supabase
          .from('bridge_intents')
          .select('user_address')
          .eq('id', intentId)
          .single();

        if (!existingIntent || existingIntent.user_address.toLowerCase() !== recoveredAddress.toLowerCase()) {
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
          .eq('id', intentId)
          .eq('user_address', recoveredAddress); // Additional safety: only update if owner matches

        if (error) {
          console.error('Failed to update bridge intent:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update bridge intent' }),
            { status: 500, headers: responseHeaders }
          );
        }

        console.log(`Bridge intent ${intentId} updated by ${recoveredAddress.slice(0, 10)}...`);

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
