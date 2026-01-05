import { wagmiConfig } from '@/config/appkit';
import { signMessage, getAccount } from '@wagmi/core';

/**
 * Generate a nonce for request signing
 */
export function generateNonce(): string {
  return crypto.randomUUID();
}

/**
 * Generate the message to be signed for order creation
 */
export function generateOrderMessage(
  order: {
    amount: string;
    from_token_symbol: string;
    to_token_symbol: string;
    target_price: number;
    condition: string;
    chain_index: string;
  },
  timestamp: number,
  nonce: string
): string {
  return `Sign this message to create a limit order on xLama.

Order Details:
- Swap ${order.amount} ${order.from_token_symbol} → ${order.to_token_symbol}
- Trigger: ${order.condition} $${order.target_price}
- Chain: ${order.chain_index}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature proves you own this wallet and authorizes the order creation.`;
}

/**
 * Generate the message to be signed for order cancellation
 */
export function generateCancelMessage(
  orderId: string,
  timestamp: number,
  nonce: string
): string {
  return `Sign this message to cancel limit order on xLama.

Order ID: ${orderId}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes cancellation of your order.`;
}

/**
 * Generate the message to be signed for DCA order creation
 */
export function generateDCAOrderMessage(
  order: {
    amount_per_interval: string;
    from_token_symbol: string;
    to_token_symbol: string;
    frequency: string;
    chain_index: string;
  },
  timestamp: number,
  nonce: string
): string {
  return `Sign this message to create a DCA order on xLama.

DCA Details:
- Buy ${order.to_token_symbol} with ${order.amount_per_interval} ${order.from_token_symbol}
- Frequency: ${order.frequency}
- Chain: ${order.chain_index}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes recurring purchases.`;
}

/**
 * Generate the message to be signed for DCA order actions (pause/resume/cancel)
 */
export function generateDCAActionMessage(
  orderId: string,
  action: 'pause' | 'resume' | 'cancel',
  timestamp: number,
  nonce: string
): string {
  return `Sign this message to ${action} DCA order on xLama.

Order ID: ${orderId}
Action: ${action}
Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes the ${action} of your DCA order.`;
}

/**
 * Sign a message using EVM wallet
 */
export async function signEvmMessage(message: string): Promise<string | null> {
  try {
    const account = getAccount(wagmiConfig);
    if (!account.address) {
      throw new Error('No EVM account connected');
    }
    const signature = await signMessage(wagmiConfig, { 
      message,
      account: account.address,
    });
    return signature;
  } catch (error) {
    console.error('Failed to sign EVM message:', error);
    return null;
  }
}

/**
 * Sign a message using Solana wallet
 */
export async function signSolanaMessage(
  message: string,
  solanaProvider: any
): Promise<string | null> {
  try {
    if (!solanaProvider?.signMessage) {
      throw new Error('Solana wallet does not support message signing');
    }
    
    const encodedMessage = new TextEncoder().encode(message);
    const signatureResult = await solanaProvider.signMessage(encodedMessage);
    
    // Convert signature to base58
    const bs58 = await import('bs58');
    if (signatureResult.signature) {
      return bs58.default.encode(signatureResult.signature);
    }
    return bs58.default.encode(signatureResult);
  } catch (error) {
    console.error('Failed to sign Solana message:', error);
    return null;
  }
}

/**
 * Sign a message using Tron wallet (TronLink)
 */
export async function signTronMessage(
  message: string,
  tronWeb: any
): Promise<string | null> {
  try {
    if (!tronWeb?.trx?.signMessageV2) {
      throw new Error('Tron wallet does not support message signing');
    }
    
    const signature = await tronWeb.trx.signMessageV2(message);
    return signature;
  } catch (error) {
    console.error('Failed to sign Tron message:', error);
    return null;
  }
}

/**
 * Sign a message using Sui wallet
 */
export async function signSuiMessage(
  message: string,
  signPersonalMessage: (input: { message: Uint8Array }) => Promise<{ signature: string }>
): Promise<string | null> {
  try {
    const encodedMessage = new TextEncoder().encode(message);
    const result = await signPersonalMessage({ message: encodedMessage });
    return result.signature;
  } catch (error) {
    console.error('Failed to sign Sui message:', error);
    return null;
  }
}

/**
 * Sign a message using TON wallet (TonConnect) with proper tonProof
 * TON Connect uses a proof-based approach where the signature is obtained during wallet connection.
 * This function retrieves the stored proof and combines it with the operation payload.
 */
export async function signTonMessage(
  message: string,
  timestamp: number,
  _tonConnectUI: any,
  walletAddress: string
): Promise<{ signature: string; payload: string; tonProof: TonProofPayload } | null> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getGlobalTonProof } = await import('@/hooks/useTonProof');
    const storedProof = getGlobalTonProof();
    
    if (!storedProof) {
      console.error('[TonSign] No TON proof available. User must reconnect wallet with tonProof.');
      return null;
    }
    
    // Check if proof is still valid (within 24 hours)
    const now = Math.floor(Date.now() / 1000);
    const proofAge = now - storedProof.timestamp;
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (proofAge >= maxAge) {
      console.error('[TonSign] TON proof expired. User must reconnect wallet.');
      return null;
    }
    
    // Create the operation payload that includes the message
    const operationPayload = JSON.stringify({
      operation: message,
      operationTimestamp: timestamp,
      walletAddress: walletAddress,
      proofPayload: storedProof.payload,
    });
    
    // Return the proof data for backend verification
    return {
      signature: storedProof.signature,
      payload: operationPayload,
      tonProof: {
        timestamp: storedProof.timestamp,
        domainLengthBytes: storedProof.domainLengthBytes,
        domainValue: storedProof.domainValue,
        signature: storedProof.signature,
        payload: storedProof.payload,
        stateInit: storedProof.stateInit,
        publicKey: storedProof.publicKey,
      },
    };
  } catch (error) {
    console.error('[TonSign] Failed to get TON proof:', error);
    return null;
  }
}

// Extended interface for TON proof data
export interface TonProofPayload {
  timestamp: number;
  domainLengthBytes: number;
  domainValue: string;
  signature: string;
  payload: string;
  stateInit: string;
  publicKey: string;
}

export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
  message: string;
  payload?: string; // For TON proof-based signing
  tonProof?: TonProofPayload; // Full TON proof for backend verification
}

/**
 * Create a signed request for order creation
 */
export async function createSignedOrderRequest(
  order: {
    amount: string;
    from_token_symbol: string;
    to_token_symbol: string;
    target_price: number;
    condition: string;
    chain_index: string;
  },
  chainType: 'evm' | 'solana' | 'tron' | 'sui' | 'ton',
  providers?: {
    solanaProvider?: any;
    tronWeb?: any;
    signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
    tonConnectUI?: any;
    walletAddress?: string;
  }
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateOrderMessage(order, timestamp, nonce);
  
  let signature: string | null = null;
  let payload: string | undefined;
  
  switch (chainType) {
    case 'solana':
      if (providers?.solanaProvider) {
        signature = await signSolanaMessage(message, providers.solanaProvider);
      }
      break;
    case 'tron':
      if (providers?.tronWeb) {
        signature = await signTronMessage(message, providers.tronWeb);
      }
      break;
    case 'sui':
      if (providers?.signPersonalMessage) {
        signature = await signSuiMessage(message, providers.signPersonalMessage);
      }
      break;
    case 'ton':
      if (providers?.tonConnectUI && providers?.walletAddress) {
        const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
        if (result) {
          signature = result.signature;
          payload = result.payload;
          return { signature, timestamp, nonce, message, payload, tonProof: result.tonProof };
        }
      }
      break;
    default:
      signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message, payload };
}

/**
 * Create a signed request for order cancellation
 */
export async function createSignedCancelRequest(
  orderId: string,
  chainType: 'evm' | 'solana' | 'tron' | 'sui' | 'ton',
  providers?: {
    solanaProvider?: any;
    tronWeb?: any;
    signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
    tonConnectUI?: any;
    walletAddress?: string;
  }
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateCancelMessage(orderId, timestamp, nonce);
  
  let signature: string | null = null;
  let payload: string | undefined;
  
  switch (chainType) {
    case 'solana':
      if (providers?.solanaProvider) {
        signature = await signSolanaMessage(message, providers.solanaProvider);
      }
      break;
    case 'tron':
      if (providers?.tronWeb) {
        signature = await signTronMessage(message, providers.tronWeb);
      }
      break;
    case 'sui':
      if (providers?.signPersonalMessage) {
        signature = await signSuiMessage(message, providers.signPersonalMessage);
      }
      break;
    case 'ton':
      if (providers?.tonConnectUI && providers?.walletAddress) {
        const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
        if (result) {
          signature = result.signature;
          payload = result.payload;
          return { signature, timestamp, nonce, message, payload, tonProof: result.tonProof };
        }
      }
      break;
    default:
      signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message, payload };
}

/**
 * Create a signed request for DCA order creation
 */
export async function createSignedDCAOrderRequest(
  order: {
    amount_per_interval: string;
    from_token_symbol: string;
    to_token_symbol: string;
    frequency: string;
    chain_index: string;
  },
  chainType: 'evm' | 'solana' | 'tron' | 'sui' | 'ton',
  providers?: {
    solanaProvider?: any;
    tronWeb?: any;
    signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
    tonConnectUI?: any;
    walletAddress?: string;
  }
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateDCAOrderMessage(order, timestamp, nonce);
  
  let signature: string | null = null;
  let payload: string | undefined;
  
  switch (chainType) {
    case 'solana':
      if (providers?.solanaProvider) {
        signature = await signSolanaMessage(message, providers.solanaProvider);
      }
      break;
    case 'tron':
      if (providers?.tronWeb) {
        signature = await signTronMessage(message, providers.tronWeb);
      }
      break;
    case 'sui':
      if (providers?.signPersonalMessage) {
        signature = await signSuiMessage(message, providers.signPersonalMessage);
      }
      break;
    case 'ton':
      if (providers?.tonConnectUI && providers?.walletAddress) {
        const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
        if (result) {
          signature = result.signature;
          payload = result.payload;
          return { signature, timestamp, nonce, message, payload, tonProof: result.tonProof };
        }
      }
      break;
    default:
      signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message, payload };
}

/**
 * Create a signed request for DCA order actions (pause/resume/cancel)
 */
export async function createSignedDCAActionRequest(
  orderId: string,
  action: 'pause' | 'resume' | 'cancel',
  chainType: 'evm' | 'solana' | 'tron' | 'sui' | 'ton',
  providers?: {
    solanaProvider?: any;
    tronWeb?: any;
    signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
    tonConnectUI?: any;
    walletAddress?: string;
  }
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateDCAActionMessage(orderId, action, timestamp, nonce);
  
  let signature: string | null = null;
  let payload: string | undefined;
  
  switch (chainType) {
    case 'solana':
      if (providers?.solanaProvider) {
        signature = await signSolanaMessage(message, providers.solanaProvider);
      }
      break;
    case 'tron':
      if (providers?.tronWeb) {
        signature = await signTronMessage(message, providers.tronWeb);
      }
      break;
    case 'sui':
      if (providers?.signPersonalMessage) {
        signature = await signSuiMessage(message, providers.signPersonalMessage);
      }
      break;
    case 'ton':
      if (providers?.tonConnectUI && providers?.walletAddress) {
        const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
        if (result) {
          signature = result.signature;
          payload = result.payload;
          return { signature, timestamp, nonce, message, payload, tonProof: result.tonProof };
        }
      }
      break;
    default:
      signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message, payload };
}

/**
 * Generate the message to be signed for bridge swap authorization
 */
export function generateBridgeMessage(
  bridge: {
    from_chain_id: number;
    to_chain_id: number;
    from_token_symbol: string;
    to_token_symbol: string;
    from_amount: string;
    to_amount_expected: string;
    bridge_provider?: string;
  },
  timestamp: number,
  nonce: string
): string {
  return `Sign this message to authorize a bridge swap on xLama.

Bridge Details:
- From: ${bridge.from_amount} ${bridge.from_token_symbol} (Chain ${bridge.from_chain_id})
- To: ~${bridge.to_amount_expected} ${bridge.to_token_symbol} (Chain ${bridge.to_chain_id})
${bridge.bridge_provider ? `- Provider: ${bridge.bridge_provider}` : ''}

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature authorizes the cross-chain bridge transaction.`;
}

/**
 * Create a signed request for bridge swap authorization
 */
export async function createSignedBridgeRequest(
  bridge: {
    from_chain_id: number;
    to_chain_id: number;
    from_token_address: string;
    to_token_address: string;
    from_token_symbol: string;
    to_token_symbol: string;
    from_amount: string;
    to_amount_expected: string;
    bridge_provider?: string;
  },
  chainType: 'evm' | 'solana' | 'tron' | 'sui' | 'ton',
  providers?: {
    solanaProvider?: any;
    tronWeb?: any;
    signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
    tonConnectUI?: any;
    walletAddress?: string;
  }
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateBridgeMessage(bridge, timestamp, nonce);
  
  let signature: string | null = null;
  let payload: string | undefined;
  
  switch (chainType) {
    case 'solana':
      if (providers?.solanaProvider) {
        signature = await signSolanaMessage(message, providers.solanaProvider);
      }
      break;
    case 'tron':
      if (providers?.tronWeb) {
        signature = await signTronMessage(message, providers.tronWeb);
      }
      break;
    case 'sui':
      if (providers?.signPersonalMessage) {
        signature = await signSuiMessage(message, providers.signPersonalMessage);
      }
      break;
    case 'ton':
      if (providers?.tonConnectUI && providers?.walletAddress) {
        const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
        if (result) {
          signature = result.signature;
          payload = result.payload;
          return { signature, timestamp, nonce, message, payload, tonProof: result.tonProof };
        }
      }
      break;
    default:
      signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message, payload };
}
