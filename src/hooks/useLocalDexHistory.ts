/**
 * Local DEX Transaction History Hook
 * Queries the local Supabase dex_transactions table for reliable, fast history
 */

import { useQuery } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { createWalletClient } from '@/lib/supabaseWithWallet';
import type { Tables } from '@/integrations/supabase/types';

export type LocalDexTransaction = Tables<'dex_transactions'>;

interface UseLocalDexHistoryOptions {
  enabled?: boolean;
  limit?: number;
  type?: 'swap' | 'bridge' | 'all';
}

export function useLocalDexHistory(options: UseLocalDexHistoryOptions = {}) {
  const { activeAddress } = useMultiWallet();
  const { enabled = true, limit = 100, type = 'all' } = options;

  return useQuery({
    queryKey: ['local-dex-history', activeAddress, limit, type],
    queryFn: async () => {
      if (!activeAddress) {
        throw new Error('No wallet connected');
      }

      const client = createWalletClient(activeAddress);
      
      let query = client
        .from('dex_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by type if specified
      if (type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useLocalDexHistory] Query error:', error);
        throw error;
      }

      return data ?? [];
    },
    enabled: !!activeAddress && enabled,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

/**
 * Helper to convert local DB format to xLama-compatible format
 */
export function convertLocalToXlamaFormat(tx: LocalDexTransaction) {
  return {
    tx_hash: tx.tx_hash,
    wallet_address: tx.user_address,
    chain_id: tx.chain_index,
    chain_name: tx.chain_name || getChainName(tx.chain_index),
    transaction_type: tx.type as 'swap' | 'bridge' | 'transfer' | 'approval',
    token_in: {
      address: tx.from_token_address || '',
      symbol: tx.from_token_symbol,
      name: tx.from_token_symbol,
      logo: tx.from_token_logo,
      decimals: 18,
      amount: tx.from_amount,
      amount_usd: tx.from_amount_usd ?? 0,
    },
    token_out: {
      address: tx.to_token_address || '',
      symbol: tx.to_token_symbol,
      name: tx.to_token_symbol,
      logo: tx.to_token_logo,
      decimals: 18,
      amount: tx.to_amount,
      amount_usd: tx.to_amount_usd ?? 0,
    },
    value_usd: tx.to_amount_usd ?? tx.from_amount_usd ?? 0,
    gas_used: '0',
    gas_price: '0',
    gas_usd: 0,
    timestamp: tx.created_at,
    source: 'okx' as const,
    status: tx.status as 'success' | 'pending' | 'failed',
    explorer_url: tx.explorer_url,
  };
}

function getChainName(chainIndex: string): string {
  const names: Record<string, string> = {
    '1': 'Ethereum',
    '196': 'X Layer',
    '8453': 'Base',
    '42161': 'Arbitrum',
    '137': 'Polygon',
    '56': 'BNB Chain',
    '43114': 'Avalanche',
    '10': 'Optimism',
    '324': 'zkSync',
    '501': 'Solana',
  };
  return names[chainIndex] || `Chain ${chainIndex}`;
}

export default useLocalDexHistory;
