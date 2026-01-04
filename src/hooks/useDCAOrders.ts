import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from './use-toast';
import { useFeedback } from './useFeedback';
import { createWalletClient } from '@/lib/supabaseWithWallet';
import { supabase } from '@/integrations/supabase/client';
import { 
  createSignedDCAOrderRequest, 
  createSignedDCAActionRequest 
} from '@/lib/requestSigning';
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { useTonConnectUI } from '@tonconnect/ui-react';

export interface DCAOrder {
  id: string;
  user_address: string;
  chain_index: string;
  from_token_address: string;
  to_token_address: string;
  from_token_symbol: string;
  to_token_symbol: string;
  amount_per_interval: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  total_intervals: number | null;
  completed_intervals: number;
  start_date: string;
  end_date: string | null;
  next_execution: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  slippage: string;
  total_spent: string;
  total_received: string;
  average_price: number | null;
  created_at: string;
  updated_at: string;
}

export function useDCAOrders() {
  const { activeAddress, isConnected, activeChainType, getSolanaWallet, getTronWeb, getTonConnectUI: getContextTonConnectUI } = useMultiWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [tonConnectUI] = useTonConnectUI();
  const { toast } = useToast();
  const { playAlert, settings } = useFeedback();
  const [orders, setOrders] = useState<DCAOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Create wallet-authenticated Supabase client
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

  // Export orders to CSV
  const exportToCSV = useCallback(() => {
    if (orders.length === 0) return;
    
    const headers = ['ID', 'From Token', 'To Token', 'Amount/Interval', 'Frequency', 'Completed', 'Total', 'Status', 'Created At', 'Next Execution'];
    const rows = orders.map(order => [
      order.id,
      order.from_token_symbol,
      order.to_token_symbol,
      order.amount_per_interval,
      order.frequency,
      order.completed_intervals.toString(),
      order.total_intervals?.toString() || 'Ongoing',
      order.status,
      order.created_at,
      order.next_execution,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dca-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [orders]);

  // Fetch user's DCA orders
  const fetchOrders = useCallback(async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await walletSupabase
        .from('dca_orders')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data as DCAOrder[]) || []);
    } catch {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, walletSupabase]);

  // Create new DCA order with signature verification
  const createOrder = useCallback(async (order: {
    chain_index: string;
    from_token_address: string;
    to_token_address: string;
    from_token_symbol: string;
    to_token_symbol: string;
    amount_per_interval: string;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    total_intervals?: number | null;
    start_date?: string;
    end_date?: string | null;
    slippage?: string;
  }) => {
    if (!activeAddress) return null;
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to create the DCA order',
      });
      
      const chainType = getChainType();
      const providers = getProviders();
      
      // Create signed request
      const signedRequest = await createSignedDCAOrderRequest(
        {
          amount_per_interval: order.amount_per_interval,
          from_token_symbol: order.from_token_symbol,
          to_token_symbol: order.to_token_symbol,
          frequency: order.frequency,
          chain_index: order.chain_index,
        },
        chainType,
        providers
      );
      
      if (!signedRequest) {
        toast({
          title: 'Signing Cancelled',
          description: 'You need to sign the message to create a DCA order',
          variant: 'destructive',
        });
        return null;
      }
      
      // Call signed-orders edge function
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'create-dca',
          order: {
            ...order,
            start_date: order.start_date || new Date().toISOString(),
          },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
        },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      // Play success sound
      if (settings.soundEnabled) {
        playAlert();
      }
      
      toast({
        title: '✅ DCA Order Created',
        description: `Will buy ${order.to_token_symbol} ${order.frequency} with ${order.amount_per_interval} ${order.from_token_symbol}`,
      });
      
      fetchOrders();
      return data.order as DCAOrder;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create DCA order',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, getChainType, getProviders, walletSupabase, fetchOrders, toast, settings.soundEnabled, playAlert]);

  // Pause DCA order
  const pauseOrder = useCallback(async (orderId: string) => {
    if (!activeAddress) return;
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to pause the DCA order',
      });
      
      const chainType = getChainType();
      const providers = getProviders();
      
      const signedRequest = await createSignedDCAActionRequest(orderId, 'pause', chainType, providers);
      
      if (!signedRequest) {
        toast({
          title: 'Signing Cancelled',
          description: 'You need to sign the message to pause the order',
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'pause-dca',
          order: { orderId },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: '⏸️ DCA Order Paused',
        description: 'Your DCA order has been paused',
      });
      
      fetchOrders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to pause order',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, getChainType, getProviders, fetchOrders, toast]);

  // Resume DCA order
  const resumeOrder = useCallback(async (orderId: string) => {
    if (!activeAddress) return;
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to resume the DCA order',
      });
      
      const chainType = getChainType();
      const providers = getProviders();
      
      const signedRequest = await createSignedDCAActionRequest(orderId, 'resume', chainType, providers);
      
      if (!signedRequest) {
        toast({
          title: 'Signing Cancelled',
          description: 'You need to sign the message to resume the order',
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'resume-dca',
          order: { orderId },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: '▶️ DCA Order Resumed',
        description: 'Your DCA order is now active again',
      });
      
      fetchOrders();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to resume order',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, getChainType, getProviders, fetchOrders, toast]);

  // Cancel DCA order
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!activeAddress) return;
    
    setIsSigning(true);
    
    try {
      toast({
        title: 'Sign Message',
        description: 'Please sign the message in your wallet to cancel the DCA order',
      });
      
      const chainType = getChainType();
      const providers = getProviders();
      
      const signedRequest = await createSignedDCAActionRequest(orderId, 'cancel', chainType, providers);
      
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
          action: 'cancel-dca',
          order: { orderId },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType,
          payload: signedRequest.payload,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: '✅ DCA Order Cancelled',
        description: 'Your DCA order has been cancelled',
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

  // Load orders when wallet connects
  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [isConnected, activeAddress, fetchOrders]);

  return {
    orders,
    activeOrders: orders.filter(o => o.status === 'active'),
    pausedOrders: orders.filter(o => o.status === 'paused'),
    completedOrders: orders.filter(o => o.status === 'completed' || o.status === 'cancelled'),
    isLoading,
    isSigning,
    createOrder,
    pauseOrder,
    resumeOrder,
    cancelOrder,
    refetch: fetchOrders,
    fetchOrders,
    exportToCSV,
  };
}
