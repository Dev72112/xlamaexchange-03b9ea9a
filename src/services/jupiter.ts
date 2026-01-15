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
}

// Export singleton instance
export const jupiterService = new JupiterService();
