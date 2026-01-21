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
import { trackOrderCreated } from '@/lib/tracking';
import { jupiterService, JupiterDCAOrder } from '@/services/jupiter';
import { VersionedTransaction } from '@solana/web3.js';

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
  // New execution tracking fields
  execution_hour?: number;
  last_execution_tx_hash?: string;
  last_execution_error?: string;
}

// Convert frequency to seconds for Jupiter DCA
function frequencyToSeconds(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'): number {
  switch (frequency) {
    case 'daily': return 86400;        // 24 hours
    case 'weekly': return 604800;      // 7 days
    case 'biweekly': return 1209600;   // 14 days
    case 'monthly': return 2592000;    // 30 days
    default: return 86400;
  }
}

export function useDCAOrders() {
  const { activeAddress, isConnected, activeChainType, getSolanaWallet, getTronWeb, getTonConnectUI: getContextTonConnectUI, activeChain } = useMultiWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [tonConnectUI] = useTonConnectUI();
  const { toast } = useToast();
  const { playAlert, settings } = useFeedback();
  const [orders, setOrders] = useState<DCAOrder[]>([]);
  const [jupiterOrders, setJupiterOrders] = useState<JupiterDCAOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Check if current chain is Solana
  const isSolana = activeChainType === 'solana' || activeChain?.chainIndex === '501';
  
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

  // Fetch user's DCA orders (both database and Jupiter on-chain)
  const fetchOrders = useCallback(async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    try {
      // Fetch from database
      const { data, error } = await walletSupabase
        .from('dca_orders')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data as DCAOrder[]) || []);
      
      // If on Solana, also fetch Jupiter on-chain DCA orders
      if (isSolana) {
        try {
          const jupOrders = await jupiterService.getOpenDCAOrders(activeAddress);
          setJupiterOrders(jupOrders);
        } catch (jupErr) {
          console.warn('[DCA] Failed to fetch Jupiter DCA orders:', jupErr);
          setJupiterOrders([]);
        }
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, walletSupabase, isSolana]);

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
    execution_hour?: number;
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
          tonProof: signedRequest.tonProof,
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
      
      // Track order creation
      trackOrderCreated('dca', order.chain_index, order.from_token_symbol, order.to_token_symbol);
      
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
          tonProof: signedRequest.tonProof,
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
          tonProof: signedRequest.tonProof,
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
          tonProof: signedRequest.tonProof,
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

  // ============ JUPITER DCA (SOLANA-NATIVE) ============
  
  /**
   * Create a Jupiter DCA order (on-chain, Solana only)
   * Jupiter handles recurring buys automatically
   */
  const createJupiterDCA = useCallback(async (params: {
    inputMint: string;
    outputMint: string;
    totalAmount: string;      // Total amount to invest (human readable)
    numberOfOrders: number;   // Number of DCA cycles
    inputDecimals: number;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    fromSymbol: string;
    toSymbol: string;
  }): Promise<{ signature: string; order: string } | null> => {
    if (!activeAddress || !isSolana) {
      toast({
        title: 'Solana Required',
        description: 'Jupiter DCA orders are only available on Solana',
        variant: 'destructive',
      });
      return null;
    }

    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) {
      toast({
        title: 'Wallet Not Available',
        description: 'Please connect a Solana wallet to create Jupiter DCA orders',
        variant: 'destructive',
      });
      return null;
    }

    setIsSigning(true);

    try {
      toast({
        title: 'Creating Jupiter DCA',
        description: 'Please approve the transaction in your wallet',
      });

      // Convert amount to smallest units using BigInt for precision
      // CRITICAL: Must be a string for Jupiter API
      const totalAmountFloat = parseFloat(params.totalAmount);
      const multiplier = BigInt(10 ** params.inputDecimals);
      const inAmountBigInt = BigInt(Math.floor(totalAmountFloat * (10 ** Math.min(params.inputDecimals, 9)))) * 
                             (params.inputDecimals > 9 ? BigInt(10 ** (params.inputDecimals - 9)) : BigInt(1));
      const inAmount = String(inAmountBigInt);
      const interval = frequencyToSeconds(params.frequency);

      console.log('[DCA] Creating order with:', { inAmount, numberOfOrders: params.numberOfOrders, interval });

      // Create DCA order via Jupiter
      const response = await jupiterService.createDCAOrder({
        user: String(activeAddress),
        inputMint: String(params.inputMint),
        outputMint: String(params.outputMint),
        inAmount,
        numberOfOrders: params.numberOfOrders,
        interval,
      });

      // Decode and sign the transaction
      const txBuffer = Uint8Array.from(atob(response.tx), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Sign the transaction
      const signed = await solanaWallet.signTransaction(transaction);
      const serialized = signed.serialize();
      
      // Convert to base64 for Jupiter execute endpoint
      const signedBase64 = btoa(String.fromCharCode(...serialized));
      
      // Submit via Jupiter's execute endpoint (no direct RPC needed)
      const executeResult = await jupiterService.executeDCAOrder({
        signedTransaction: signedBase64,
      });
      
      if (executeResult.error) {
        throw new Error(executeResult.error);
      }
      
      const signature = executeResult.signature;

      if (settings.soundEnabled) {
        playAlert();
      }

      toast({
        title: '✅ Jupiter DCA Created',
        description: `Will buy ${params.toSymbol} ${params.numberOfOrders}x ${params.frequency} with ${params.totalAmount} ${params.fromSymbol}`,
      });

      trackOrderCreated('dca', '501', params.fromSymbol, params.toSymbol);
      
      // Refresh orders
      fetchOrders();

      return { signature, order: response.order };
    } catch (err) {
      console.error('[DCA] Jupiter DCA creation failed:', err);
      toast({
        title: 'DCA Creation Failed',
        description: err instanceof Error ? err.message : 'Failed to create Jupiter DCA',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, isSolana, getSolanaWallet, toast, settings.soundEnabled, playAlert, fetchOrders]);

  /**
   * Cancel a Jupiter DCA order (on-chain)
   */
  const cancelJupiterDCA = useCallback(async (orderPubkey: string): Promise<string | null> => {
    if (!activeAddress || !isSolana) {
      toast({
        title: 'Solana Required',
        description: 'Jupiter DCA orders are only available on Solana',
        variant: 'destructive',
      });
      return null;
    }

    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) {
      toast({
        title: 'Wallet Not Available',
        description: 'Please connect a Solana wallet',
        variant: 'destructive',
      });
      return null;
    }

    setIsSigning(true);

    try {
      toast({
        title: 'Cancelling Jupiter DCA',
        description: 'Please approve the transaction in your wallet',
      });

      // Get cancel transaction
      const response = await jupiterService.cancelDCAOrder(activeAddress, orderPubkey);

      // Decode and sign
      const txBuffer = Uint8Array.from(atob(response.tx), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(txBuffer);

      const signed = await solanaWallet.signTransaction(transaction);
      const serialized = signed.serialize();

      // Convert to base64 for Jupiter execute endpoint
      const signedBase64 = btoa(String.fromCharCode(...serialized));
      
      // Submit via Jupiter's execute endpoint (no direct RPC needed)
      const executeResult = await jupiterService.executeDCAOrder({
        signedTransaction: signedBase64,
        requestId: response.requestId,
      });
      
      if (executeResult.error) {
        throw new Error(executeResult.error);
      }
      
      const signature = executeResult.signature;

      toast({
        title: '✅ Jupiter DCA Cancelled',
        description: 'Your recurring order has been cancelled',
      });

      fetchOrders();
      return signature;
    } catch (err) {
      console.error('[DCA] Jupiter DCA cancellation failed:', err);
      toast({
        title: 'Cancellation Failed',
        description: err instanceof Error ? err.message : 'Failed to cancel DCA order',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [activeAddress, isSolana, getSolanaWallet, toast, fetchOrders]);

  // Load orders when wallet connects
  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchOrders();
    } else {
      setOrders([]);
      setJupiterOrders([]);
    }
  }, [isConnected, activeAddress, fetchOrders]);

  return {
    orders,
    jupiterOrders,
    activeOrders: orders.filter(o => o.status === 'active'),
    pausedOrders: orders.filter(o => o.status === 'paused'),
    completedOrders: orders.filter(o => o.status === 'completed' || o.status === 'cancelled'),
    isLoading,
    isSigning,
    isSolana,
    createOrder,
    createJupiterDCA,
    pauseOrder,
    resumeOrder,
    cancelOrder,
    cancelJupiterDCA,
    refetch: fetchOrders,
    fetchOrders,
    exportToCSV,
  };
}
