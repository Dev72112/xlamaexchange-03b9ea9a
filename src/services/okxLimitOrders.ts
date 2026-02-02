/**
 * OKX DEX Limit Orders Service
 * 
 * Service layer for managing limit orders via OKX DEX API
 * Supports EVM chains with price monitoring and order execution
 */

import { supabase } from '@/integrations/supabase/client';

export interface OkxLimitOrderParams {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  amount: string;
  targetPrice: number;
  condition: 'above' | 'below';
  slippage?: string;
  expiresAt?: string | null;
  // TP/SL fields
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface OkxLimitOrder {
  id: string;
  user_address: string;
  chain_index: string;
  from_token_address: string;
  to_token_address: string;
  from_token_symbol: string;
  to_token_symbol: string;
  amount: string;
  target_price: number;
  condition: 'above' | 'below';
  slippage: string;
  status: 'active' | 'triggered' | 'executed' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string | null;
  triggered_at: string | null;
  execution_tx_hash?: string;
  executed_at?: string;
  execution_error?: string;
  // TP/SL fields
  take_profit_price?: number | null;
  stop_loss_price?: number | null;
  tp_triggered_at?: string | null;
  sl_triggered_at?: string | null;
}

export interface TokenPrice {
  chainIndex: string;
  tokenAddress: string;
  price: number;
  timestamp: number;
}

class OkxLimitOrdersService {
  private priceCache: Map<string, TokenPrice> = new Map();
  private priceCacheTTL = 10000; // 10 seconds

  /**
   * Get cached token price or fetch from API
   */
  async getTokenPrice(chainIndex: string, tokenAddress: string): Promise<number | null> {
    const cacheKey = `${chainIndex}-${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.priceCacheTTL) {
      return cached.price;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('okx-dex', {
        body: { action: 'token-price', params: { chainIndex, tokenAddress } },
      });
      
      if (error || !data?.price) {
        console.error('Failed to fetch token price:', error);
        return null;
      }
      
      const price = parseFloat(data.price);
      this.priceCache.set(cacheKey, {
        chainIndex,
        tokenAddress,
        price,
        timestamp: Date.now(),
      });
      
      return price;
    } catch (err) {
      console.error('Error fetching token price:', err);
      return null;
    }
  }

  /**
   * Calculate exchange rate between two tokens
   */
  async getExchangeRate(
    chainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string = '1000000000000000000' // 1 token in wei
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase.functions.invoke('okx-dex', {
        body: {
          action: 'quote',
          params: { chainIndex, fromTokenAddress, toTokenAddress, amount, slippage: '0.5' },
        },
      });
      
      if (error || !data) {
        console.error('Failed to get exchange rate:', error);
        return null;
      }
      
      const quote = Array.isArray(data) ? data[0] : data;
      if (!quote?.fromTokenAmount || !quote?.toTokenAmount) {
        return null;
      }
      
      // Calculate rate as toAmount / fromAmount (adjusted for decimals)
      const fromDecimals = parseInt(quote.fromToken?.decimals || '18');
      const toDecimals = parseInt(quote.toToken?.decimals || '18');
      const fromAmount = parseFloat(quote.fromTokenAmount) / Math.pow(10, fromDecimals);
      const toAmount = parseFloat(quote.toTokenAmount) / Math.pow(10, toDecimals);
      
      return toAmount / fromAmount;
    } catch (err) {
      console.error('Error getting exchange rate:', err);
      return null;
    }
  }

  /**
   * Check if order should be triggered based on current price
   */
  async shouldTriggerOrder(order: OkxLimitOrder): Promise<boolean> {
    const currentRate = await this.getExchangeRate(
      order.chain_index,
      order.from_token_address,
      order.to_token_address
    );
    
    if (currentRate === null) {
      return false;
    }
    
    if (order.condition === 'above') {
      return currentRate >= order.target_price;
    } else {
      return currentRate <= order.target_price;
    }
  }

  /**
   * Get swap transaction data for order execution
   */
  async getSwapData(
    chainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    userWalletAddress: string,
    slippage: string = '0.5'
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('okx-dex', {
        body: {
          action: 'swap',
          params: {
            chainIndex,
            fromTokenAddress,
            toTokenAddress,
            amount,
            userWalletAddress,
            slippage,
          },
        },
      });
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to get swap data');
      }
      
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.error('Error getting swap data:', err);
      throw err;
    }
  }

  /**
   * Get token approval transaction data
   */
  async getApproveTransaction(
    chainIndex: string,
    tokenContractAddress: string,
    approveAmount?: string
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('okx-dex', {
        body: {
          action: 'approve-transaction',
          params: { chainIndex, tokenContractAddress, approveAmount },
        },
      });
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to get approval data');
      }
      
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.error('Error getting approval data:', err);
      throw err;
    }
  }

  /**
   * Get supported EVM chain IDs for limit orders
   */
  getSupportedChains(): string[] {
    // OKX DEX supported EVM chains
    return [
      '1',    // Ethereum
      '56',   // BSC
      '137',  // Polygon
      '42161', // Arbitrum
      '10',   // Optimism
      '43114', // Avalanche
      '250',  // Fantom
      '8453', // Base
      '324',  // zkSync Era
      '59144', // Linea
    ];
  }

  /**
   * Check if chain supports limit orders
   */
  isChainSupported(chainIndex: string): boolean {
    return this.getSupportedChains().includes(chainIndex);
  }
}

export const okxLimitOrdersService = new OkxLimitOrdersService();
