/**
 * useHyperliquidTrading Hook
 * 
 * Complete trading functionality for Hyperliquid perpetuals.
 * Handles order execution, position management, and builder fee approval.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { useToast } from '@/hooks/use-toast';
import { hyperliquidService } from '@/services/hyperliquid';

// Builder fee configuration from environment
// Re-enabled for production - 0.01% platform fee on Hyperliquid trades
const BUILDER_FEES_ENABLED = true;
const BUILDER_ADDRESS = BUILDER_FEES_ENABLED ? (import.meta.env.VITE_HYPERLIQUID_BUILDER_ADDRESS || '') : '';
const BUILDER_FEE = BUILDER_FEES_ENABLED ? parseInt(import.meta.env.VITE_HYPERLIQUID_BUILDER_FEE || '10', 10) : 0; // 10 = 0.01%

// ============ TYPE DEFINITIONS ============

export interface MarketOrderParams {
  coin: string;
  isBuy: boolean;
  size: string;
  leverage: number;
  reduceOnly?: boolean;
  slippage?: number; // Default 0.5%
}

export interface LimitOrderParams {
  coin: string;
  isBuy: boolean;
  size: string;
  price: string;
  leverage: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
}

export interface TriggerOrderParams {
  coin: string;
  size: string;
  triggerPrice: string;
  isLong: boolean; // Position direction - determines isBuy for closing
  reduceOnly?: boolean;
}

export interface OrderResult {
  success: boolean;
  orderId?: number;
  status?: string;
  error?: string;
}

export interface UseHyperliquidTradingResult {
  // Network state
  isTestnet: boolean;
  setIsTestnet: (testnet: boolean) => void;
  
  // Builder approval
  isBuilderApproved: boolean;
  builderApprovalLoading: boolean;
  checkBuilderApproval: () => Promise<boolean>;
  approveBuilder: () => Promise<boolean>;
  
  // Order execution
  placeMarketOrder: (params: MarketOrderParams) => Promise<OrderResult>;
  placeLimitOrder: (params: LimitOrderParams) => Promise<OrderResult>;
  placeStopLoss: (params: TriggerOrderParams) => Promise<OrderResult>;
  placeTakeProfit: (params: TriggerOrderParams) => Promise<OrderResult>;
  
  // Position management
  closePosition: (coin: string, size: string, isLong: boolean) => Promise<OrderResult>;
  modifyLeverage: (coin: string, leverage: number, isCross?: boolean) => Promise<boolean>;
  addMargin: (coin: string, amount: number) => Promise<boolean>;
  removeMargin: (coin: string, amount: number) => Promise<boolean>;
  
  // Order management
  cancelOrder: (coin: string, orderId: number) => Promise<boolean>;
  cancelAllOrders: () => Promise<boolean>;
  
  // State
  isSubmitting: boolean;
  lastError: Error | null;
  
  // Config
  builderAddress: string;
  builderFeePercent: string;
}

// Helper to parse order status response
function parseOrderStatus(status: any): { filled?: boolean; resting?: { oid: number }; error?: string } {
  if (typeof status === 'string') {
    return {}; // 'waitingForFill' or 'waitingForTrigger'
  }
  if (status && typeof status === 'object') {
    if ('filled' in status) return { filled: true };
    if ('resting' in status) return { resting: status.resting };
    if ('error' in status) return { error: status.error };
  }
  return {};
}

// ============ HOOK IMPLEMENTATION ============

export function useHyperliquidTrading(): UseHyperliquidTradingResult {
  const { toast } = useToast();
  
  // Safe extraction of wallet data - wrap in try-catch for resilience
  let address: `0x${string}` | undefined;
  let walletClient: any = null;
  
  try {
    const accountResult = useAccount();
    address = accountResult?.address;
  } catch (err) {
    console.warn('[Hyperliquid] useAccount error:', err);
  }
  
  try {
    const walletClientResult = useWalletClient();
    walletClient = walletClientResult?.data ?? null;
  } catch (err) {
    console.warn('[Hyperliquid] useWalletClient error:', err);
  }
  
  // State
  const [isTestnet, setIsTestnetState] = useState(false);
  const [isBuilderApproved, setIsBuilderApproved] = useState(false);
  const [builderApprovalLoading, setBuilderApprovalLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Sync testnet state with service
  const setIsTestnet = useCallback((testnet: boolean) => {
    setIsTestnetState(testnet);
    hyperliquidService.setTestnet(testnet);
  }, []);

  // Create transport and clients - wrapped for safety
  const transport = useMemo(() => {
    try {
      return new HttpTransport({ isTestnet });
    } catch (err) {
      console.warn('[Hyperliquid] Failed to create transport:', err);
      return new HttpTransport({ isTestnet: false });
    }
  }, [isTestnet]);
  
  const infoClient = useMemo(() => {
    try {
      return new InfoClient({ transport });
    } catch (err) {
      console.warn('[Hyperliquid] Failed to create InfoClient:', err);
      return null;
    }
  }, [transport]);
  
  // Exchange client requires wallet - guarded creation
  const exchangeClient = useMemo(() => {
    if (!walletClient) return null;
    try {
      return new ExchangeClient({ 
        transport, 
        wallet: walletClient as any,
      });
    } catch (err) {
      console.warn('[Hyperliquid] Failed to create ExchangeClient:', err);
      return null;
    }
  }, [transport, walletClient]);

  // Get asset index from coin symbol
  const getAssetIndex = useCallback(async (coin: string): Promise<number> => {
    return hyperliquidService.getAssetIndex(coin);
  }, []);

  // Check builder approval status
  const checkBuilderApproval = useCallback(async (): Promise<boolean> => {
    // If builder fees are disabled, always return approved
    if (!BUILDER_FEES_ENABLED) {
      setIsBuilderApproved(true);
      return true;
    }
    
    if (!address || !BUILDER_ADDRESS) return false;
    
    setBuilderApprovalLoading(true);
    try {
      const maxFee = await hyperliquidService.checkMaxBuilderFee(address, BUILDER_ADDRESS);
      const approved = maxFee !== null && parseInt(maxFee, 10) >= BUILDER_FEE;
      setIsBuilderApproved(approved);
      return approved;
    } catch (error) {
      console.error('[Hyperliquid] Failed to check builder approval:', error);
      return false;
    } finally {
      setBuilderApprovalLoading(false);
    }
  }, [address]);

  // Check approval on mount and address change - with safety delay
  useEffect(() => {
    // Auto-approve if builder fees are disabled
    if (!BUILDER_FEES_ENABLED) {
      setIsBuilderApproved(true);
      return;
    }
    
    if (!address || !BUILDER_ADDRESS) return;
    
    // Delay check to allow wallet to stabilize after connection
    const timer = setTimeout(() => {
      checkBuilderApproval().catch(err => {
        console.warn('[Hyperliquid] Builder approval check failed:', err);
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [address, checkBuilderApproval]);

  // Approve builder fee
  const approveBuilder = useCallback(async (): Promise<boolean> => {
    if (!exchangeClient || !BUILDER_ADDRESS) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your EVM wallet to approve builder fee.',
        variant: 'destructive',
      });
      return false;
    }

    setBuilderApprovalLoading(true);
    try {
      const result = await exchangeClient.approveBuilderFee({
        builder: BUILDER_ADDRESS as `0x${string}`,
        maxFeeRate: String(BUILDER_FEE), // e.g. "10" for 0.01%
      });
      
      if (result.status === 'ok') {
        setIsBuilderApproved(true);
        toast({
          title: 'Builder Fee Approved',
          description: 'You can now trade on xlama. This was a one-time approval.',
        });
        return true;
      } else {
        throw new Error('Approval failed');
      }
    } catch (error) {
      console.error('[Hyperliquid] Builder approval failed:', error);
      setLastError(error as Error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Failed to approve builder fee',
        variant: 'destructive',
      });
      return false;
    } finally {
      setBuilderApprovalLoading(false);
    }
  }, [exchangeClient, toast]);

  // Place market order
  const placeMarketOrder = useCallback(async (params: MarketOrderParams): Promise<OrderResult> => {
    if (!exchangeClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsSubmitting(true);
    setLastError(null);

    try {
      const assetIndex = await getAssetIndex(params.coin);
      
      // For market orders, we use IOC with a slippage buffer
      const currentPrice = await hyperliquidService.getPrice(params.coin);
      const slippage = params.slippage || 0.005; // 0.5% default
      const slippagePrice = params.isBuy 
        ? currentPrice * (1 + slippage)
        : currentPrice * (1 - slippage);

      const result = await exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: params.isBuy,
          p: slippagePrice.toFixed(6), // Price with slippage for IOC
          s: params.size,
          r: params.reduceOnly || false,
          t: { limit: { tif: 'Ioc' } }, // Immediate-or-cancel for market-like behavior
        }],
        grouping: 'na',
        builder: BUILDER_ADDRESS ? {
          b: BUILDER_ADDRESS as `0x${string}`,
          f: BUILDER_FEE,
        } : undefined,
      });

      // Parse response
      const statuses = result.response?.data?.statuses;
      const status = statuses?.[0];
      const parsed = parseOrderStatus(status);

      if (parsed.filled || parsed.resting) {
        toast({
          title: 'Order Placed',
          description: `${params.isBuy ? 'Long' : 'Short'} ${params.size} ${params.coin}`,
        });
        return { 
          success: true, 
          orderId: parsed.resting?.oid,
          status: parsed.filled ? 'filled' : 'resting',
        };
      } else if (parsed.error) {
        throw new Error(parsed.error);
      }

      return { success: true };
    } catch (error) {
      console.error('[Hyperliquid] Market order failed:', error);
      setLastError(error as Error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to place order',
        variant: 'destructive',
      });
      return { success: false, error: (error as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Place limit order
  const placeLimitOrder = useCallback(async (params: LimitOrderParams): Promise<OrderResult> => {
    if (!exchangeClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsSubmitting(true);
    setLastError(null);

    try {
      const assetIndex = await getAssetIndex(params.coin);

      const result = await exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: params.isBuy,
          p: params.price,
          s: params.size,
          r: params.reduceOnly || false,
          t: { limit: { tif: params.postOnly ? 'Alo' : 'Gtc' } },
        }],
        grouping: 'na',
        builder: BUILDER_ADDRESS ? {
          b: BUILDER_ADDRESS as `0x${string}`,
          f: BUILDER_FEE,
        } : undefined,
      });

      const statuses = result.response?.data?.statuses;
      const status = statuses?.[0];
      const parsed = parseOrderStatus(status);

      if (parsed.resting || parsed.filled) {
        toast({
          title: 'Limit Order Placed',
          description: `${params.isBuy ? 'Buy' : 'Sell'} ${params.size} ${params.coin} @ $${params.price}`,
        });
        return { 
          success: true, 
          orderId: parsed.resting?.oid,
          status: parsed.filled ? 'filled' : 'resting',
        };
      } else if (parsed.error) {
        throw new Error(parsed.error);
      }

      return { success: true };
    } catch (error) {
      console.error('[Hyperliquid] Limit order failed:', error);
      setLastError(error as Error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to place limit order',
        variant: 'destructive',
      });
      return { success: false, error: (error as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Place stop-loss order
  const placeStopLoss = useCallback(async (params: TriggerOrderParams): Promise<OrderResult> => {
    if (!exchangeClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(params.coin);
      // For SL: if long position, we sell (isBuy=false); if short, we buy (isBuy=true)
      const isBuy = !params.isLong;

      const result = await exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: isBuy,
          p: params.triggerPrice,
          s: params.size,
          r: true, // Always reduce-only for SL
          t: { 
            trigger: { 
              triggerPx: params.triggerPrice,
              isMarket: true,
              tpsl: 'sl',
            },
          },
        }],
        grouping: 'na',
      });

      const statuses = result.response?.data?.statuses;
      const status = statuses?.[0];
      const parsed = parseOrderStatus(status);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      toast({
        title: 'Stop-Loss Set',
        description: `SL at $${params.triggerPrice} for ${params.coin}`,
      });
      return { success: true };
    } catch (error) {
      console.error('[Hyperliquid] Stop-loss failed:', error);
      setLastError(error as Error);
      return { success: false, error: (error as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Place take-profit order
  const placeTakeProfit = useCallback(async (params: TriggerOrderParams): Promise<OrderResult> => {
    if (!exchangeClient) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(params.coin);
      // For TP: if long position, we sell (isBuy=false); if short, we buy (isBuy=true)
      const isBuy = !params.isLong;

      const result = await exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: isBuy,
          p: params.triggerPrice,
          s: params.size,
          r: true, // Always reduce-only for TP
          t: { 
            trigger: { 
              triggerPx: params.triggerPrice,
              isMarket: true,
              tpsl: 'tp',
            },
          },
        }],
        grouping: 'na',
      });

      const statuses = result.response?.data?.statuses;
      const status = statuses?.[0];
      const parsed = parseOrderStatus(status);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      toast({
        title: 'Take-Profit Set',
        description: `TP at $${params.triggerPrice} for ${params.coin}`,
      });
      return { success: true };
    } catch (error) {
      console.error('[Hyperliquid] Take-profit failed:', error);
      setLastError(error as Error);
      return { success: false, error: (error as Error).message };
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Close position
  const closePosition = useCallback(async (
    coin: string, 
    size: string, 
    isLong: boolean
  ): Promise<OrderResult> => {
    // To close, we place an opposite order with reduce-only
    return placeMarketOrder({
      coin,
      isBuy: !isLong, // Opposite side to close
      size,
      leverage: 1, // Not relevant for closing
      reduceOnly: true,
    });
  }, [placeMarketOrder]);

  // Modify leverage
  const modifyLeverage = useCallback(async (
    coin: string,
    leverage: number,
    isCross: boolean = true
  ): Promise<boolean> => {
    if (!exchangeClient) return false;

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(coin);
      
      const result = await exchangeClient.updateLeverage({
        asset: assetIndex,
        isCross,
        leverage,
      });

      if (result.status === 'ok') {
        toast({
          title: 'Leverage Updated',
          description: `${coin} leverage set to ${leverage}x`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Hyperliquid] Leverage update failed:', error);
      setLastError(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Add margin (isolated only)
  const addMargin = useCallback(async (coin: string, amount: number): Promise<boolean> => {
    if (!exchangeClient) return false;

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(coin);
      
      const result = await exchangeClient.updateIsolatedMargin({
        asset: assetIndex,
        isBuy: true, // Positive = add margin
        ntli: amount,
      });

      if (result.status === 'ok') {
        toast({
          title: 'Margin Added',
          description: `Added $${amount} to ${coin} position`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Hyperliquid] Add margin failed:', error);
      setLastError(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Remove margin (isolated only)
  const removeMargin = useCallback(async (coin: string, amount: number): Promise<boolean> => {
    if (!exchangeClient) return false;

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(coin);
      
      const result = await exchangeClient.updateIsolatedMargin({
        asset: assetIndex,
        isBuy: true,
        ntli: -amount, // Negative = remove margin
      });

      if (result.status === 'ok') {
        toast({
          title: 'Margin Removed',
          description: `Removed $${amount} from ${coin} position`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Hyperliquid] Remove margin failed:', error);
      setLastError(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Cancel order
  const cancelOrder = useCallback(async (coin: string, orderId: number): Promise<boolean> => {
    if (!exchangeClient) return false;

    setIsSubmitting(true);
    try {
      const assetIndex = await getAssetIndex(coin);
      
      const result = await exchangeClient.cancel({
        cancels: [{
          a: assetIndex,
          o: orderId,
        }],
      });

      if (result.status === 'ok') {
        toast({
          title: 'Order Cancelled',
          description: `Order #${orderId} cancelled`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Hyperliquid] Cancel order failed:', error);
      setLastError(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, getAssetIndex, toast]);

  // Cancel all orders
  const cancelAllOrders = useCallback(async (): Promise<boolean> => {
    if (!exchangeClient) return false;

    setIsSubmitting(true);
    try {
      const result = await exchangeClient.scheduleCancel({ time: null as any }); // null = immediate
      
      if (result.status === 'ok') {
        toast({
          title: 'All Orders Cancelled',
          description: 'All open orders have been cancelled',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Hyperliquid] Cancel all orders failed:', error);
      setLastError(error as Error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [exchangeClient, toast]);

  return {
    // Network state
    isTestnet,
    setIsTestnet,
    
    // Builder approval
    isBuilderApproved,
    builderApprovalLoading,
    checkBuilderApproval,
    approveBuilder,
    
    // Order execution
    placeMarketOrder,
    placeLimitOrder,
    placeStopLoss,
    placeTakeProfit,
    
    // Position management
    closePosition,
    modifyLeverage,
    addMargin,
    removeMargin,
    
    // Order management
    cancelOrder,
    cancelAllOrders,
    
    // State
    isSubmitting,
    lastError,
    
    // Config
    builderAddress: BUILDER_ADDRESS,
    builderFeePercent: (BUILDER_FEE / 1000).toFixed(3) + '%', // 10 -> 0.010%
  };
}
