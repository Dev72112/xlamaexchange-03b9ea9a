import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService } from '@/services/okxdex';
import { useToast } from './use-toast';
import { useFeedback } from './useFeedback';
import { createWalletClient } from '@/lib/supabaseWithWallet';
import { supabase } from '@/integrations/supabase/client';
import { createSignedOrderRequest, createSignedCancelRequest } from '@/lib/requestSigning';
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { trackOrderCreated } from '@/lib/tracking';
import { notificationService } from '@/services/notificationService';

export interface LimitOrder {
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
  status: 'active' | 'triggered' | 'executed' | 'cancelled' | 'expired' | 'dismissed';
  created_at: string;
  expires_at: string | null;
  triggered_at: string | null;
  // Execution tracking fields
  execution_tx_hash?: string;
  executed_at?: string;
  execution_error?: string;
  // Trigger timeout fields
  trigger_expires_at?: string;
  user_dismissed?: boolean;
}

export function useLimitOrders() {
  const { activeAddress, isConnected, activeChainType, getSolanaWallet, getTronWeb, getTonConnectUI: getContextTonConnectUI } = useMultiWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [tonConnectUI] = useTonConnectUI();
  const { toast } = useToast();
  const { playAlert, settings } = useFeedback();
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedOrdersRef = useRef<Set<string>>(new Set());
  
  // Create wallet-authenticated Supabase client for reads
  const walletSupabase = useMemo(() => createWalletClient(activeAddress), [activeAddress]);

  // Get signing providers based on chain type
  const getProviders = useCallback(() => {
    return {
      solanaProvider: getSolanaWallet(),
      tronWeb: getTronWeb(),
      signPersonalMessage,
      tonConnectUI: tonConnectUI || getContextTonConnectUI(),
      walletAddress: activeAddress || undefined,
    };
  }, [getSolanaWallet, getTronWeb, signPersonalMessage, tonConnectUI, getContextTonConnectUI, activeAddress]);

  // Map chain type for signing
  const getChainType = useCallback((): 'evm' | 'solana' | 'tron' | 'sui' | 'ton' => {
    switch (activeChainType) {
      case 'solana': return 'solana';
      case 'tron': return 'tron';
      case 'sui': return 'sui';
      case 'ton': return 'ton';
      default: return 'evm';
    }
  }, [activeChainType]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Export orders to CSV
  const exportToCSV = useCallback(() => {
    if (orders.length === 0) return;
    
    const headers = ['ID', 'From Token', 'To Token', 'Amount', 'Target Price', 'Condition', 'Status', 'Created At', 'Triggered At', 'Expires At'];
    const rows = orders.map(order => [
      order.id,
      order.from_token_symbol,
      order.to_token_symbol,
      order.amount,
      order.target_price.toString(),
      order.condition,
      order.status,
      order.created_at,
      order.triggered_at || '',
      order.expires_at || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `limit-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [orders]);

  // Fetch user's orders
  const fetchOrders = useCallback(async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await walletSupabase
        .from('limit_orders')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data as LimitOrder[]) || []);
    } catch {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, walletSupabase]);

  // Create new limit order with signature verification for all chains
  const createOrder = useCallback(async (order: Omit<LimitOrder, 'id' | 'user_address' | 'status' | 'created_at' | 'triggered_at'>) => {
    if (!activeAddress) return null;
    
    const chainType = getChainType();
    const providers = getProviders();
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to create the order',
      });
      
      // Create signed request with multi-chain support
      const signedRequest = await createSignedOrderRequest(
        {
          amount: order.amount,
          from_token_symbol: order.from_token_symbol,
          to_token_symbol: order.to_token_symbol,
          target_price: order.target_price,
          condition: order.condition,
          chain_index: order.chain_index,
        },
        chainType,
        providers
      );
      
      if (!signedRequest) {
        toast({
          title: 'Signing Cancelled',
          description: 'You need to sign the message to create a limit order',
          variant: 'destructive',
        });
        return null;
      }
      
      // Call signed-orders edge function
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'create-order',
          order: {
            chain_index: order.chain_index,
            from_token_address: order.from_token_address,
            to_token_address: order.to_token_address,
            from_token_symbol: order.from_token_symbol,
            to_token_symbol: order.to_token_symbol,
            amount: order.amount,
            target_price: order.target_price,
            condition: order.condition,
            slippage: order.slippage || '0.5',
            expires_at: order.expires_at,
          },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
          tonProof: signedRequest.tonProof, // Include tonProof for TON verification
        },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: '✅ Limit Order Created',
        description: `Signed and verified. Will trigger when ${order.from_token_symbol} is ${order.condition} $${order.target_price.toFixed(6)}`,
      });
      
      // Track order creation
      trackOrderCreated('limit', order.chain_index, order.from_token_symbol, order.to_token_symbol);
      
      fetchOrders();
      return data.order as LimitOrder;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create limit order',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, getChainType, getProviders, fetchOrders, toast]);

  // Cancel order with signature verification for all chains
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!activeAddress) return;
    
    const chainType = getChainType();
    const providers = getProviders();
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to cancel the order',
      });
      
      const signedRequest = await createSignedCancelRequest(orderId, chainType, providers);
      
      if (!signedRequest) {
        toast({
          title: 'Signing Cancelled',
          description: 'You need to sign the message to cancel the order',
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'cancel-order',
          order: { orderId },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
          tonProof: signedRequest.tonProof, // Include tonProof for TON verification
        },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: '✅ Order Cancelled',
        description: 'Limit order has been cancelled and verified',
      });
      
      fetchOrders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, getChainType, getProviders, fetchOrders, toast]);

  // Dismiss a triggered order (user doesn't want to execute it)
  const dismissOrder = useCallback(async (orderId: string) => {
    if (!activeAddress) return;
    
    try {
      const { error } = await walletSupabase
        .from('limit_orders')
        .update({ 
          status: 'expired',
          user_dismissed: true,
          execution_error: 'Dismissed by user',
        })
        .eq('id', orderId)
        .eq('user_address', activeAddress.toLowerCase());
      
      if (error) throw error;
      
      toast({
        title: 'Order Dismissed',
        description: 'The triggered order has been dismissed',
      });
      
      fetchOrders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to dismiss order',
        variant: 'destructive',
      });
    }
  }, [activeAddress, walletSupabase, fetchOrders, toast]);

  // Mark order as executed with transaction hash
  const markExecuted = useCallback(async (orderId: string, txHash: string) => {
    if (!activeAddress) return false;
    
    try {
      const { error } = await walletSupabase
        .from('limit_orders')
        .update({ 
          status: 'executed' as LimitOrder['status'],
          executed_at: new Date().toISOString(),
          execution_tx_hash: txHash,
        })
        .eq('id', orderId)
        .eq('user_address', activeAddress.toLowerCase());
      
      if (error) throw error;
      
      // Find order details for notification
      const executedOrder = orders.find(o => o.id === orderId);
      if (executedOrder) {
        notificationService.notifyOrderExecuted(
          executedOrder.from_token_symbol,
          executedOrder.to_token_symbol,
          executedOrder.amount,
          txHash
        );
      }
      
      toast({
        title: '✅ Order Executed',
        description: 'Limit order has been successfully executed',
      });
      
      fetchOrders();
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to mark order as executed',
        variant: 'destructive',
      });
      return false;
    }
  }, [activeAddress, walletSupabase, fetchOrders, toast]);

  // Mark order as triggered (internal use - no signature needed)
  const markTriggered = useCallback(async (orderId: string) => {
    try {
      const { error } = await walletSupabase
        .from('limit_orders')
        .update({ 
          status: 'triggered',
          triggered_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchOrders();
    } catch {
      // Silently handle trigger errors
    }
  }, [walletSupabase, fetchOrders]);

  // Monitor active orders for price triggers
  const checkPrices = useCallback(async () => {
    const activeOrders = orders.filter(o => o.status === 'active');
    if (activeOrders.length === 0) return;

    for (const order of activeOrders) {
      // Check expiration
      if (order.expires_at && new Date(order.expires_at) < new Date()) {
        await walletSupabase
          .from('limit_orders')
          .update({ status: 'expired' })
          .eq('id', order.id);
        continue;
      }

      try {
        const priceInfo = await okxDexService.getTokenPriceInfo(
          order.chain_index,
          order.from_token_address
        );
        
        if (!priceInfo?.price) continue;
        
        const currentPrice = parseFloat(priceInfo.price);
        const targetPrice = order.target_price;
        
        const triggered = order.condition === 'above' 
          ? currentPrice >= targetPrice
          : currentPrice <= targetPrice;
        
        if (triggered && !notifiedOrdersRef.current.has(order.id)) {
          notifiedOrdersRef.current.add(order.id);
          await markTriggered(order.id);
          
          // Push to Notification Center
          notificationService.notifyOrderTriggered(
            order.from_token_symbol,
            order.to_token_symbol,
            order.condition,
            targetPrice
          );
          
          // Play notification sound using user's selected alert sound
          if (settings.soundEnabled) {
            playAlert();
          }
          
          // Browser push notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🎯 Limit Order Triggered!', {
              body: `${order.from_token_symbol} is now ${order.condition} $${targetPrice.toFixed(6)}. Current: $${currentPrice.toFixed(6)}`,
              icon: '/favicon.ico',
              tag: `limit-order-${order.id}`,
            });
          }
          
          toast({
            title: '🎯 Limit Order Triggered!',
            description: `${order.from_token_symbol} is now ${order.condition} $${targetPrice.toFixed(6)}. Current: $${currentPrice.toFixed(6)}`,
          });
        }
      } catch {
        // Silently handle price check errors
      }
    }
  }, [orders, walletSupabase, markTriggered, settings.soundEnabled, playAlert, toast]);

  // Start/stop price monitoring
  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [isConnected, activeAddress, fetchOrders]);

  useEffect(() => {
    const activeCount = orders.filter(o => o.status === 'active').length;
    
    if (activeCount > 0) {
      // Check immediately, then every 30s
      checkPrices();
      monitorIntervalRef.current = setInterval(checkPrices, 30000);
    }
    
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, [orders, checkPrices]);

  return {
    orders,
    activeOrders: orders.filter(o => o.status === 'active'),
    triggeredOrders: orders.filter(o => o.status === 'triggered'),
    executedOrders: orders.filter(o => o.status === 'executed'),
    isLoading,
    isSigning,
    notificationPermission,
    createOrder,
    cancelOrder,
    dismissOrder,
    markExecuted,
    refetch: fetchOrders,
    exportToCSV,
    requestNotificationPermission,
  };
}
