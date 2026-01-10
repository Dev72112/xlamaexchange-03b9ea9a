import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track wallet presence for daily snapshot scheduling
 */
export function useWalletPresence() {
  /**
   * Update wallet presence in wallet_users table
   * Called when wallet connects to register for daily snapshots
   */
  const updatePresence = useCallback(async (address: string): Promise<boolean> => {
    if (!address) return false;

    const normalizedAddress = address.toLowerCase();

    try {
      // Upsert wallet user record
      const { error } = await supabase
        .from('wallet_users')
        .upsert(
          { 
            user_address: normalizedAddress,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_address' }
        )
        .setHeader('x-wallet-address', normalizedAddress);

      if (error) {
        console.error('Error updating wallet presence:', error.message);
        return false;
      }

      console.log('Updated wallet presence for', normalizedAddress);
      return true;
    } catch (err) {
      console.error('Error in updatePresence:', err);
      return false;
    }
  }, []);

  return { updatePresence };
}
