/**
 * OKX Limit Orders Hook
 * 
 * Manages EVM limit orders with price monitoring and execution via OKX DEX
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from './use-toast';
import { useFeedback } from './useFeedback';
import { supabase } from '@/integrations/supabase/client';
import { createWalletClient } from '@/lib/supabaseWithWallet';
import { createSignedOrderRequest, createSignedCancelRequest } from '@/lib/requestSigning';
import { okxLimitOrdersService, OkxLimitOrder, OkxLimitOrderParams } from '@/services/okxLimitOrders';
import { trackOrderCreated } from '@/lib/tracking';

interface UseOkxLimitOrdersResult {
  orders: OkxLimitOrder[];
  activeOrders: OkxLimitOrder[];
  triggeredOrders: OkxLimitOrder[];
  executedOrders: OkxLimitOrder[];
  isLoading: boolean;
  isSigning: boolean;
  createOrder: (params: OkxLimitOrderParams) => Promise<OkxLimitOrder | null>;
  cancelOrder: (orderId: string) => Promise<void>;
  refetch: () => Promise<void>;
  getCurrentRate: (chainIndex: string, fromToken: string, toToken: string) => Promise<number | null>;
  isChainSupported: (chainIndex: string) => boolean;
}

export function useOkxLimitOrders(): UseOkxLimitOrdersResult {
  const { activeAddress, isConnected, activeChainType } = useMultiWallet();
  const { toast } = useToast();
  const { playAlert, settings } = useFeedback();
  const [orders, setOrders] = useState<OkxLimitOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  const walletSupabase = useMemo(() => createWalletClient(activeAddress), [activeAddress]);

  // Check if current chain is EVM
  const isEVM = activeChainType === 'evm';

  // Fetch orders from database
  const fetchOrders = useCallback(async () => {
    if (!activeAddress || !isEVM) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await walletSupabase
        .from('limit_orders')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .in('chain_index', okxLimitOrdersService.getSupportedChains())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as OkxLimitOrder[]) || []);
    } catch (err) {
      console.error('Failed to fetch OKX limit orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, walletSupabase, isEVM]);

  // Create new limit order
  const createOrder = useCallback(async (params: OkxLimitOrderParams): Promise<OkxLimitOrder | null> => {
    if (!activeAddress || !isConnected || !isEVM) {
      toast({ title: 'Wallet Required', description: 'Connect an EVM wallet to create limit orders', variant: 'destructive' });
      return null;
    }

    if (!okxLimitOrdersService.isChainSupported(params.chainIndex)) {
      toast({ title: 'Chain Not Supported', description: 'This chain does not support limit orders', variant: 'destructive' });
      return null;
    }

    setIsSigning(true);
    try {
      // Create signed request using EVM signing
      const signedRequest = await createSignedOrderRequest(
        {
          amount: params.amount,
          from_token_symbol: params.fromTokenSymbol,
          to_token_symbol: params.toTokenSymbol,
          target_price: params.targetPrice,
          condition: params.condition,
          chain_index: params.chainIndex,
        },
        'evm',
        { walletAddress: activeAddress }
      );

      if (!signedRequest) {
        throw new Error('Failed to sign order request');
      }

      const { signature, nonce, timestamp, message } = signedRequest;

      // Submit to edge function
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'create',
          chainType: 'evm',
          walletAddress: activeAddress,
          signature,
          nonce,
          timestamp,
          message,
          orderData: {
            chain_index: params.chainIndex,
            from_token_address: params.fromTokenAddress,
            to_token_address: params.toTokenAddress,
            from_token_symbol: params.fromTokenSymbol,
            to_token_symbol: params.toTokenSymbol,
            amount: params.amount,
            target_price: params.targetPrice,
            condition: params.condition,
            slippage: params.slippage || '0.5',
            expires_at: params.expiresAt,
          },
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to create order');
      }

      toast({ title: 'Order Created', description: `Limit order for ${params.fromTokenSymbol}/${params.toTokenSymbol} created` });
      
      // Track event
      trackOrderCreated('limit', params.chainIndex, params.fromTokenSymbol, params.toTokenSymbol);

      await fetchOrders();
      return data.order;
    } catch (err) {
      console.error('Failed to create limit order:', err);
      toast({ title: 'Order Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, isConnected, isEVM, toast, fetchOrders]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!activeAddress || !isConnected) return;

    setIsSigning(true);
    try {
      const signedRequest = await createSignedCancelRequest(
        orderId,
        'evm',
        { walletAddress: activeAddress }
      );

      if (!signedRequest) {
        throw new Error('Failed to sign cancel request');
      }

      const { signature, nonce, timestamp, message } = signedRequest;

      const { error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'cancel',
          chainType: 'evm',
          walletAddress: activeAddress,
          signature,
          nonce,
          timestamp,
          message,
          orderId,
        },
      });

      if (error) throw error;

      toast({ title: 'Order Cancelled', description: 'Limit order has been cancelled' });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast({ title: 'Cancel Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, isConnected, toast, fetchOrders]);

  // Monitor prices for active orders
  const checkPrices = useCallback(async () => {
    const activeList = orders.filter(o => o.status === 'active');
    if (activeList.length === 0) return;

    for (const order of activeList) {
      try {
        const shouldTrigger = await okxLimitOrdersService.shouldTriggerOrder(order);
        
        if (shouldTrigger && !notifiedOrdersRef.current.has(order.id)) {
          // Mark as triggered
          await walletSupabase
            .from('limit_orders')
            .update({
              status: 'triggered',
              triggered_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          notifiedOrdersRef.current.add(order.id);

          // Notify user
          if (settings.soundEnabled) {
            playAlert();
          }

          toast({
            title: '🎯 Limit Order Triggered!',
            description: `${order.from_token_symbol}/${order.to_token_symbol} hit target price`,
          });

          await fetchOrders();
        }
      } catch (err) {
        console.error('Error checking order:', order.id, err);
      }
    }
  }, [orders, walletSupabase, settings, playAlert, toast, fetchOrders]);

  // Get current exchange rate
  const getCurrentRate = useCallback(async (
    chainIndex: string,
    fromToken: string,
    toToken: string
  ): Promise<number | null> => {
    return okxLimitOrdersService.getExchangeRate(chainIndex, fromToken, toToken);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (isConnected && activeAddress && isEVM) {
      fetchOrders();
    }
  }, [isConnected, activeAddress, isEVM, fetchOrders]);

  // Price monitoring
  useEffect(() => {
    if (!isConnected || !activeAddress || !isEVM) return;

    // Check prices every 30 seconds
    monitorIntervalRef.current = setInterval(checkPrices, 30000);
    
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, [isConnected, activeAddress, isEVM, checkPrices]);

  // Filtered order lists
  const activeOrders = useMemo(() => orders.filter(o => o.status === 'active'), [orders]);
  const triggeredOrders = useMemo(() => orders.filter(o => o.status === 'triggered'), [orders]);
  const executedOrders = useMemo(() => orders.filter(o => o.status === 'executed'), [orders]);

  // Wrapper for isChainSupported to preserve `this` context
  const isChainSupported = useCallback((chainIndex: string) => {
    return okxLimitOrdersService.isChainSupported(chainIndex);
  }, []);

  return {
    orders,
    activeOrders,
    triggeredOrders,
    executedOrders,
    isLoading,
    isSigning,
    createOrder,
    cancelOrder,
    refetch: fetchOrders,
    getCurrentRate,
    isChainSupported,
  };
}
