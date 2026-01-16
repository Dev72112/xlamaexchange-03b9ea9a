import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Singleton cache for wallet-specific clients
const walletClientCache = new Map<string, SupabaseClient<Database>>();

/**
 * Gets or creates a Supabase client with wallet address in headers for RLS
 * Uses singleton pattern to prevent multiple GoTrueClient instances
 */
export function createWalletClient(walletAddress: string | null): SupabaseClient<Database> {
  // If no wallet, return the main client
  if (!walletAddress) {
    return supabase;
  }

  const normalizedAddress = walletAddress.toLowerCase();
  
  // Return cached client if exists
  if (walletClientCache.has(normalizedAddress)) {
    return walletClientCache.get(normalizedAddress)!;
  }

  // Create a new client with wallet address header for RLS policies
  const walletClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'x-wallet-address': normalizedAddress,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  walletClientCache.set(normalizedAddress, walletClient);
  
  return walletClient;
}

/**
 * Helper to get wallet header for RLS-protected requests
 * Use this when making requests that need wallet-based RLS
 */
export function getWalletHeaders(walletAddress: string | null): Record<string, string> {
  if (!walletAddress) return {};
  return { 'x-wallet-address': walletAddress.toLowerCase() };
}

/**
 * Clear cached clients (useful for testing or logout)
 */
export function clearWalletClientCache(): void {
  walletClientCache.clear();
}
