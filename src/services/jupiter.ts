/**
 * Jupiter Ultra API Service
 * 
 * Handles Solana swaps via Jupiter's Ultra API for better liquidity and commission earnings.
 * Uses an edge function to keep API keys secure.
 */

import { supabase } from '@/integrations/supabase/client';

// Response types from Jupiter Ultra API
export interface JupiterOrderResponse {
  transaction: string;           // base64 encoded VersionedTransaction
  requestId: string;             // Required for /execute
  inAmount: string;
  outAmount: string;
  inputMint: string;
  outputMint: string;
  priceImpact?: number;
  feeBps?: number;               // Total fee including referral
  feeMint?: string;              // Token mint for fee collection
  routePlan?: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface JupiterExecuteResponse {
  signature: string;
  status: 'Success' | 'Failed' | 'Pending';
  error?: string;
  slot?: number;
}

export interface JupiterQuoteResponse {
  inAmount: string;
  outAmount: string;
  inputMint: string;
  outputMint: string;
  priceImpact?: number;
  routePlan?: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
    };
    percent: number;
  }>;
}

// Limit Order Types
export interface JupiterLimitOrderParams {
  inputMint: string;
  outputMint: string;
  maker: string;
  makingAmount: string;    // Amount to sell (in smallest units)
  takingAmount: string;    // Minimum amount to receive (in smallest units)
  expiredAt?: number;      // Unix timestamp in seconds
  feeAccount?: string;     // Referral token account for output mint
  computeUnitPrice?: string | 'auto';
}

export interface JupiterLimitOrderResponse {
  tx: string;              // Base64 encoded transaction
  order: string;           // Order public key
}

export interface JupiterOpenOrder {
  order: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  remainingMakingAmount: string;
  remainingTakingAmount: string;
  expiredAt: number | null;
  createdAt: string;
  updatedAt: string;
}

// DCA Types
export interface JupiterDCAParams {
  user: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;        // Total amount to invest (in smallest units)
  numberOfOrders: number;  // Number of DCA orders
  interval: number;        // Seconds between orders
  minPrice?: number | null;
  maxPrice?: number | null;
  startAt?: number | null; // Unix timestamp, null = start immediately
}

export interface JupiterDCAResponse {
  tx: string;              // Base64 encoded transaction
  order: string;           // DCA order public key
}

export interface JupiterDCAOrder {
  order: string;
  user: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  inDeposited: string;
  inWithdrawn: string;
  outWithdrawn: string;
  inUsed: string;
  outReceived: string;
  inAmountPerCycle: string;
  cycleFrequency: number;
  nextCycleAt: number;
  minOutAmount: string | null;
  maxOutAmount: string | null;
  createdAt: string;
}

class JupiterService {
  private edgeFunctionUrl: string;

  constructor() {
    // Using Supabase edge function to proxy Jupiter API calls
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/jupiter`;
  }

  /**
   * Get swap order with transaction ready to sign
   * This returns a base64-encoded VersionedTransaction
   */
  async getSwapOrder(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    takerAddress: string;
    slippageBps?: number;
  }): Promise<JupiterOrderResponse> {
    console.log('[Jupiter] Getting swap order:', {
      inputMint: params.inputMint.slice(0, 8) + '...',
      outputMint: params.outputMint.slice(0, 8) + '...',
      amount: params.amount,
      taker: params.takerAddress.slice(0, 8) + '...',
    });

    const response = await fetch(`${this.edgeFunctionUrl}?action=order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        taker: params.takerAddress,
        slippageBps: params.slippageBps || 50, // Default 0.5%
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Order failed:', errorData);
      throw new Error(errorData.error || `Jupiter order failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[Jupiter] Order received:', {
      requestId: data.requestId?.slice(0, 12) + '...',
      inAmount: data.inAmount,
      outAmount: data.outAmount,
      hasTransaction: !!data.transaction,
    });

    return data;
  }

  /**
   * Submit signed transaction for execution via Jupiter
   * Jupiter handles RPC submission for reliability
   */
  async executeSwap(params: {
    signedTransaction: string;
    requestId: string;
  }): Promise<JupiterExecuteResponse> {
    console.log('[Jupiter] Executing swap:', {
      requestId: params.requestId.slice(0, 12) + '...',
      txLength: params.signedTransaction.length,
    });

    const response = await fetch(`${this.edgeFunctionUrl}?action=execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction: params.signedTransaction,
        requestId: params.requestId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Execute failed:', errorData);
      throw new Error(errorData.error || `Jupiter execution failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[Jupiter] Execution result:', {
      signature: data.signature?.slice(0, 12) + '...',
      status: data.status,
    });

    return data;
  }

  /**
   * Get quote only (for comparison with other providers)
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
  }): Promise<JupiterQuoteResponse> {
    console.log('[Jupiter] Getting quote:', {
      inputMint: params.inputMint.slice(0, 8) + '...',
      outputMint: params.outputMint.slice(0, 8) + '...',
      amount: params.amount,
    });

    const response = await fetch(`${this.edgeFunctionUrl}?action=quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps || 50,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Quote failed:', errorData);
      throw new Error(errorData.error || `Jupiter quote failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[Jupiter] Quote received:', {
      inAmount: data.inAmount,
      outAmount: data.outAmount,
    });

    return data;
  }

  // ============ LIMIT ORDERS ============

  /**
   * Create a limit order on Jupiter
   * Returns transaction to sign and order public key
   */
  async createLimitOrder(params: JupiterLimitOrderParams): Promise<JupiterLimitOrderResponse> {
    console.log('[Jupiter] Creating limit order:', {
      inputMint: params.inputMint.slice(0, 8) + '...',
      outputMint: params.outputMint.slice(0, 8) + '...',
      makingAmount: params.makingAmount,
      takingAmount: params.takingAmount,
    });

    // CRITICAL: Ensure all amounts are strings for Jupiter API (Zod validation requires string)
    const payload = {
      inputMint: String(params.inputMint),
      outputMint: String(params.outputMint),
      maker: String(params.maker),
      makingAmount: String(params.makingAmount),
      takingAmount: String(params.takingAmount),
      expiredAt: params.expiredAt ? Number(params.expiredAt) : undefined,
      feeAccount: params.feeAccount ? String(params.feeAccount) : undefined,
      computeUnitPrice: params.computeUnitPrice,
    };

    const response = await fetch(`${this.edgeFunctionUrl}?action=limit-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Jupiter] Limit order creation failed:', errorData);
      // Extract error message from various possible formats (Zod validation errors, etc.)
      const errorMessage = 
        errorData.error || 
        errorData.message || 
        (errorData.issues && JSON.stringify(errorData.issues)) ||
        (errorData.errors && JSON.stringify(errorData.errors)) ||
        `Failed to create limit order: HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get open limit orders for a wallet
   */
  async getOpenLimitOrders(wallet: string): Promise<JupiterOpenOrder[]> {
    console.log('[Jupiter] Getting open limit orders:', { wallet: wallet.slice(0, 8) + '...' });

    const response = await fetch(`${this.edgeFunctionUrl}?action=limit-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to get limit orders:', errorData);
      throw new Error(errorData.error || `Failed to get limit orders: ${response.status}`);
    }

    const data = await response.json();
    return data.orders || data || [];
  }

  /**
   * Cancel limit orders
   * Returns transaction to sign
   */
  async cancelLimitOrders(maker: string, orders: string[]): Promise<{ tx: string; requestId?: string }> {
    console.log('[Jupiter] Cancelling limit orders:', {
      maker: maker.slice(0, 8) + '...',
      orderCount: orders.length,
    });

    const response = await fetch(`${this.edgeFunctionUrl}?action=limit-cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maker, orders }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to cancel limit orders:', errorData);
      throw new Error(errorData.error || `Failed to cancel limit orders: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Execute a signed Trigger API transaction (limit order create/cancel)
   * This is the Jupiter-recommended way to submit limit order transactions
   */
  async executeTriggerOrder(params: {
    signedTransaction: string;
    requestId?: string;
  }): Promise<{ signature: string; status: string; error?: string }> {
    console.log('[Jupiter] Executing trigger order...');

    const response = await fetch(`${this.edgeFunctionUrl}?action=limit-execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Trigger execute failed:', errorData);
      throw new Error(errorData.error || `Failed to execute trigger order: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Jupiter] Trigger execute result:', { signature: data.signature?.slice(0, 12) + '...', status: data.status });
    
    return data;
  }

  /**
   * Get limit order history
   */
  async getLimitOrderHistory(wallet: string): Promise<JupiterOpenOrder[]> {
    console.log('[Jupiter] Getting limit order history:', { wallet: wallet.slice(0, 8) + '...' });

    const response = await fetch(`${this.edgeFunctionUrl}?action=limit-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to get limit order history:', errorData);
      throw new Error(errorData.error || `Failed to get limit order history: ${response.status}`);
    }

    const data = await response.json();
    return data.orders || data || [];
  }

  // ============ DCA ORDERS ============

  /**
   * Create a DCA order on Jupiter
   * Returns transaction to sign and order public key
   */
  async createDCAOrder(params: JupiterDCAParams): Promise<JupiterDCAResponse> {
    console.log('[Jupiter] Creating DCA order:', {
      user: params.user.slice(0, 8) + '...',
      inputMint: params.inputMint.slice(0, 8) + '...',
      outputMint: params.outputMint.slice(0, 8) + '...',
      inAmount: params.inAmount,
      numberOfOrders: params.numberOfOrders,
      interval: params.interval,
    });

    // CRITICAL: Ensure all amounts are strings for Jupiter API (Zod validation requires string)
    const payload = {
      user: String(params.user),
      inputMint: String(params.inputMint),
      outputMint: String(params.outputMint),
      inAmount: String(params.inAmount),
      numberOfOrders: Number(params.numberOfOrders),
      interval: Number(params.interval),
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      startAt: params.startAt,
    };

    const response = await fetch(`${this.edgeFunctionUrl}?action=dca-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Jupiter] DCA order creation failed:', errorData);
      // Extract error message from various possible formats
      const errorMessage = 
        errorData.error || 
        errorData.message || 
        (errorData.issues && JSON.stringify(errorData.issues)) ||
        (errorData.errors && JSON.stringify(errorData.errors)) ||
        `Failed to create DCA order: HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get open DCA orders for a wallet
   */
  async getOpenDCAOrders(wallet: string): Promise<JupiterDCAOrder[]> {
    console.log('[Jupiter] Getting open DCA orders:', { wallet: wallet.slice(0, 8) + '...' });

    const response = await fetch(`${this.edgeFunctionUrl}?action=dca-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to get DCA orders:', errorData);
      throw new Error(errorData.error || `Failed to get DCA orders: ${response.status}`);
    }

    const data = await response.json();
    return data.orders || data || [];
  }

  /**
   * Cancel a DCA order
   * Returns transaction to sign
   */
  async cancelDCAOrder(user: string, order: string): Promise<{ tx: string; requestId?: string }> {
    console.log('[Jupiter] Cancelling DCA order:', {
      user: user.slice(0, 8) + '...',
      order: order.slice(0, 8) + '...',
    });

    const response = await fetch(`${this.edgeFunctionUrl}?action=dca-cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, order }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to cancel DCA order:', errorData);
      throw new Error(errorData.error || `Failed to cancel DCA order: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Execute a signed Recurring API transaction (DCA create/cancel)
   * This is the Jupiter-recommended way to submit DCA transactions
   */
  async executeDCAOrder(params: {
    signedTransaction: string;
    requestId?: string;
  }): Promise<{ signature: string; status: string; error?: string }> {
    console.log('[Jupiter] Executing DCA order...');

    const response = await fetch(`${this.edgeFunctionUrl}?action=dca-execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] DCA execute failed:', errorData);
      throw new Error(errorData.error || `Failed to execute DCA order: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Jupiter] DCA execute result:', { signature: data.signature?.slice(0, 12) + '...', status: data.status });
    
    return data;
  }

  /**
   * Get DCA order history
   */
  async getDCAOrderHistory(wallet: string): Promise<JupiterDCAOrder[]> {
    console.log('[Jupiter] Getting DCA order history:', { wallet: wallet.slice(0, 8) + '...' });

    const response = await fetch(`${this.edgeFunctionUrl}?action=dca-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Jupiter] Failed to get DCA order history:', errorData);
      throw new Error(errorData.error || `Failed to get DCA order history: ${response.status}`);
    }

    const data = await response.json();
    return data.orders || data || [];
  }

  // ============ UTILITIES ============

  /**
   * Convert human-readable amount to lamports/smallest unit
   */
  toSmallestUnit(amount: string, decimals: number): string {
    if (!amount || isNaN(parseFloat(amount))) return '0';
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    const combined = whole + paddedFraction;
    return combined.replace(/^0+/, '') || '0';
  }

  /**
   * Calculate taking amount for limit orders based on target price
   * @param makingAmount Amount to sell (in smallest units)
   * @param currentPrice Current price of input token in terms of output token
   * @param targetPrice Target price to execute at
   * @param inputDecimals Decimals of input token
   * @param outputDecimals Decimals of output token
   */
  calculateTakingAmount(
    makingAmount: string,
    targetPrice: number,
    inputDecimals: number,
    outputDecimals: number
  ): string {
    const making = BigInt(makingAmount);
    const scaleFactor = BigInt(10 ** outputDecimals);
    const priceScaled = BigInt(Math.floor(targetPrice * 10 ** 9)); // Use 9 decimal precision
    
    // takingAmount = makingAmount * targetPrice * (10^outputDecimals) / (10^inputDecimals) / 10^9
    const taking = (making * priceScaled * scaleFactor) / BigInt(10 ** inputDecimals) / BigInt(10 ** 9);
    return taking.toString();
  }
}

// Export singleton instance
export const jupiterService = new JupiterService();
