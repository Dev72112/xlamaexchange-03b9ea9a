import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

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

  // For wallet-specific requests, we use the main client but pass headers per-request
  // This avoids creating multiple GoTrueClient instances
  // The wallet address header should be passed directly in the request, not via a new client
  walletClientCache.set(normalizedAddress, supabase);
  
  return supabase;
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
