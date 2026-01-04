import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService } from '@/services/okxdex';
import { useToast } from './use-toast';
import { useFeedback } from './useFeedback';

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
  status: 'active' | 'triggered' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string | null;
  triggered_at: string | null;
}

export function useLimitOrders() {
  const { activeAddress, isConnected } = useMultiWallet();
  const { toast } = useToast();
  const { playAlert, settings } = useFeedback();
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

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
      const { data, error } = await supabase
        .from('limit_orders')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data as LimitOrder[]) || []);
    } catch (err) {
      console.error('Failed to fetch limit orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress]);

  // Create new limit order
  const createOrder = useCallback(async (order: Omit<LimitOrder, 'id' | 'user_address' | 'status' | 'created_at' | 'triggered_at'>) => {
    if (!activeAddress) return null;
    
    try {
      const { data, error } = await supabase
        .from('limit_orders')
        .insert({
          user_address: activeAddress.toLowerCase(),
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
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: 'Limit Order Created',
        description: `Will trigger when ${order.from_token_symbol} is ${order.condition} $${order.target_price.toFixed(6)}`,
      });
      
      fetchOrders();
      return data as LimitOrder;
    } catch (err) {
      console.error('Failed to create limit order:', err);
      toast({
        title: 'Error',
        description: 'Failed to create limit order',
        variant: 'destructive',
      });
      return null;
    }
  }, [activeAddress, fetchOrders, toast]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('limit_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      
      if (error) throw error;
      
      toast({
        title: 'Order Cancelled',
        description: 'Limit order has been cancelled',
      });
      
      fetchOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  }, [fetchOrders, toast]);

  // Mark order as triggered
  const markTriggered = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('limit_orders')
        .update({ 
          status: 'triggered',
          triggered_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (error) throw error;
      fetchOrders();
    } catch (err) {
      console.error('Failed to mark order as triggered:', err);
    }
  }, [fetchOrders]);

  // Monitor active orders for price triggers
  const checkPrices = useCallback(async () => {
    const activeOrders = orders.filter(o => o.status === 'active');
    if (activeOrders.length === 0) return;

    for (const order of activeOrders) {
      // Check expiration
      if (order.expires_at && new Date(order.expires_at) < new Date()) {
        await supabase
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
      } catch (err) {
        console.error('Failed to check price for order:', order.id, err);
      }
    }
  }, [orders, markTriggered, toast]);

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
    isLoading,
    notificationPermission,
    createOrder,
    cancelOrder,
    refetch: fetchOrders,
    exportToCSV,
    requestNotificationPermission,
  };
}
