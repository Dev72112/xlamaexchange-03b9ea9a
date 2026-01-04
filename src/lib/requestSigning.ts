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

export interface SignedRequest {
  signature: string;
  timestamp: number;
  nonce: string;
  message: string;
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
  chainType: 'evm' | 'solana',
  solanaProvider?: any
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateOrderMessage(order, timestamp, nonce);
  
  let signature: string | null = null;
  
  if (chainType === 'solana' && solanaProvider) {
    signature = await signSolanaMessage(message, solanaProvider);
  } else {
    signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message };
}

/**
 * Create a signed request for order cancellation
 */
export async function createSignedCancelRequest(
  orderId: string,
  chainType: 'evm' | 'solana',
  solanaProvider?: any
): Promise<SignedRequest | null> {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateCancelMessage(orderId, timestamp, nonce);
  
  let signature: string | null = null;
  
  if (chainType === 'solana' && solanaProvider) {
    signature = await signSolanaMessage(message, solanaProvider);
  } else {
    signature = await signEvmMessage(message);
  }
  
  if (!signature) {
    return null;
  }
  
  return { signature, timestamp, nonce, message };
}
