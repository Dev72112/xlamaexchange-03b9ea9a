import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase client with wallet address in headers for RLS
 * This allows wallet-address-based Row Level Security policies
 */
export function createWalletClient(walletAddress: string | null) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: walletAddress 
        ? { 'x-wallet-address': walletAddress.toLowerCase() }
        : {},
    },
  });
}
