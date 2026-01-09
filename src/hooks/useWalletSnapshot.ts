import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { okxDexService } from '@/services/okxdex';
import { getWalletHeaders } from '@/lib/supabaseWithWallet';

// All supported chain indices for balance fetching
const ALL_CHAIN_INDICES = '1,56,137,42161,10,43114,250,8453,324,59144,534352,196,81457,501'; // EVM + Solana

export interface WalletSnapshotToken {
  chain_index: string;
  token_address: string;
  token_symbol: string;
  token_logo: string | null;
  balance: string;
  price_at_snapshot: number | null;
  value_usd: number | null;
}

export interface WalletSnapshot {
  id: string;
  user_address: string;
  snapshot_type: string;
  tokens: WalletSnapshotToken[];
  total_value_usd: number;
  created_at: string;
}

export function useWalletSnapshot() {
  const isCapturingRef = useRef(false);

  /**
   * Check if an initial snapshot exists for the given address
   */
  const hasInitialSnapshot = useCallback(async (address: string): Promise<boolean> => {
    try {
      const headers = getWalletHeaders(address);
      const { data, error } = await supabase
        .from('wallet_snapshots')
        .select('id')
        .eq('user_address', address.toLowerCase())
        .eq('snapshot_type', 'initial')
        .limit(1);

      if (error) {
        console.error('Error checking for initial snapshot:', error);
        return false;
      }

      return (data?.length ?? 0) > 0;
    } catch (err) {
      console.error('Error checking for initial snapshot:', err);
      return false;
    }
  }, []);

  /**
   * Capture a snapshot of all wallet holdings
   */
  const captureSnapshot = useCallback(async (
    address: string,
    snapshotType: 'initial' | 'daily' | 'manual' = 'initial'
  ): Promise<boolean> => {
    // Prevent concurrent captures
    if (isCapturingRef.current) {
      console.log('Snapshot capture already in progress');
      return false;
    }

    isCapturingRef.current = true;

    try {
      // Fetch all token balances from OKX API
      const balances = await okxDexService.getWalletBalances(
        address,
        ALL_CHAIN_INDICES,
        true // exclude risk tokens
      );

      if (!balances || balances.length === 0) {
        console.log('No token balances found for snapshot');
        isCapturingRef.current = false;
        return false;
      }

      // Prepare snapshot records for each token
      const snapshotRecords = balances
        .filter(b => parseFloat(b.balance) > 0)
        .map(b => {
          const balance = parseFloat(b.balance);
          const price = parseFloat(b.tokenPrice) || 0;
          const valueUsd = balance * price;

          return {
            user_address: address.toLowerCase(),
            chain_index: b.chainIndex,
            token_address: b.tokenContractAddress || 'native',
            token_symbol: b.symbol,
            token_logo: null, // Not provided by balance API
            balance: b.balance,
            price_at_snapshot: price > 0 ? price : null,
            value_usd: valueUsd > 0 ? valueUsd : null,
            snapshot_type: snapshotType,
          };
        });

      if (snapshotRecords.length === 0) {
        console.log('No valid token balances for snapshot');
        isCapturingRef.current = false;
        return false;
      }

      // Insert snapshot records with wallet auth headers
      const headers = getWalletHeaders(address);
      const { error } = await supabase
        .from('wallet_snapshots')
        .insert(snapshotRecords);

      if (error) {
        console.error('Error saving wallet snapshot:', error);
        isCapturingRef.current = false;
        return false;
      }

      console.log(`Captured ${snapshotType} snapshot with ${snapshotRecords.length} tokens`);
      isCapturingRef.current = false;
      return true;
    } catch (err) {
      console.error('Error capturing wallet snapshot:', err);
      isCapturingRef.current = false;
      return false;
    }
  }, []);

  /**
   * Capture initial snapshot if not exists (called on first wallet connection)
   */
  const captureInitialSnapshotIfNeeded = useCallback(async (address: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const exists = await hasInitialSnapshot(address);
      if (exists) {
        console.log('Initial snapshot already exists for', address);
        return false;
      }

      console.log('Capturing initial wallet snapshot for', address);
      return await captureSnapshot(address, 'initial');
    } catch (err) {
      console.error('Error in captureInitialSnapshotIfNeeded:', err);
      return false;
    }
  }, [hasInitialSnapshot, captureSnapshot]);

  /**
   * Get the initial snapshot for an address
   */
  const getInitialSnapshot = useCallback(async (address: string): Promise<WalletSnapshotToken[]> => {
    try {
      const headers = getWalletHeaders(address);
      const { data, error } = await supabase
        .from('wallet_snapshots')
        .select('*')
        .eq('user_address', address.toLowerCase())
        .eq('snapshot_type', 'initial');

      if (error) {
        console.error('Error fetching initial snapshot:', error);
        return [];
      }

      return (data || []).map(row => ({
        chain_index: row.chain_index,
        token_address: row.token_address,
        token_symbol: row.token_symbol,
        token_logo: row.token_logo,
        balance: row.balance,
        price_at_snapshot: row.price_at_snapshot,
        value_usd: row.value_usd,
      }));
    } catch (err) {
      console.error('Error fetching initial snapshot:', err);
      return [];
    }
  }, []);

  /**
   * Get total initial value from snapshot
   */
  const getInitialTotalValue = useCallback(async (address: string): Promise<number> => {
    const tokens = await getInitialSnapshot(address);
    return tokens.reduce((sum, t) => sum + (t.value_usd || 0), 0);
  }, [getInitialSnapshot]);

  return {
    captureSnapshot,
    captureInitialSnapshotIfNeeded,
    hasInitialSnapshot,
    getInitialSnapshot,
    getInitialTotalValue,
  };
}
