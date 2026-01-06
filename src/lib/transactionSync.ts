import { createWalletClient } from './supabaseWithWallet';

export interface DexTransactionDB {
  id: string;
  user_address: string;
  tx_hash: string;
  chain_index: string;
  chain_name: string | null;
  from_token_symbol: string;
  from_token_address: string | null;
  from_amount: string;
  from_amount_usd: number | null;
  from_token_price: number | null;
  from_token_logo: string | null;
  to_token_symbol: string;
  to_token_address: string | null;
  to_amount: string;
  to_amount_usd: number | null;
  to_token_price: number | null;
  to_token_logo: string | null;
  status: string;
  type: string;
  explorer_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstantTransactionDB {
  id: string;
  user_address: string;
  from_ticker: string;
  to_ticker: string;
  from_name: string | null;
  to_name: string | null;
  from_image: string | null;
  to_image: string | null;
  from_amount: string;
  to_amount: string | null;
  from_amount_usd: number | null;
  to_amount_usd: number | null;
  status: string;
  payin_address: string | null;
  payout_address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all DEX transactions for a wallet from the database
 */
export async function fetchDexTransactions(walletAddress: string): Promise<DexTransactionDB[]> {
  const client = createWalletClient(walletAddress);
  
  const { data, error } = await client
    .from('dex_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Failed to fetch DEX transactions:', error);
    return [];
  }
  
  return (data || []) as DexTransactionDB[];
}

/**
 * Upsert a DEX transaction to the database
 */
export async function upsertDexTransaction(
  walletAddress: string,
  tx: Omit<DexTransactionDB, 'id' | 'user_address' | 'updated_at'>
): Promise<DexTransactionDB | null> {
  const client = createWalletClient(walletAddress);
  
  const { data, error } = await client
    .from('dex_transactions')
    .upsert({
      ...tx,
      user_address: walletAddress.toLowerCase(),
    }, {
      onConflict: 'tx_hash,user_address',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to upsert DEX transaction:', error);
    return null;
  }
  
  return data as DexTransactionDB;
}

/**
 * Update a DEX transaction status
 */
export async function updateDexTransactionStatus(
  walletAddress: string,
  txHash: string,
  status: string
): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('dex_transactions')
    .update({ status })
    .eq('tx_hash', txHash);
  
  if (error) {
    console.error('Failed to update DEX transaction status:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete a DEX transaction
 */
export async function deleteDexTransaction(
  walletAddress: string,
  txHash: string
): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('dex_transactions')
    .delete()
    .eq('tx_hash', txHash);
  
  if (error) {
    console.error('Failed to delete DEX transaction:', error);
    return false;
  }
  
  return true;
}

/**
 * Clear all DEX transactions for a wallet
 */
export async function clearDexTransactions(walletAddress: string): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('dex_transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (error) {
    console.error('Failed to clear DEX transactions:', error);
    return false;
  }
  
  return true;
}

/**
 * Fetch all instant transactions for a wallet from the database
 */
export async function fetchInstantTransactions(walletAddress: string): Promise<InstantTransactionDB[]> {
  const client = createWalletClient(walletAddress);
  
  const { data, error } = await client
    .from('instant_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Failed to fetch instant transactions:', error);
    return [];
  }
  
  return (data || []) as InstantTransactionDB[];
}

/**
 * Upsert an instant transaction to the database
 */
export async function upsertInstantTransaction(
  walletAddress: string,
  tx: Omit<InstantTransactionDB, 'user_address' | 'updated_at'>
): Promise<InstantTransactionDB | null> {
  const client = createWalletClient(walletAddress);
  
  const { data, error } = await client
    .from('instant_transactions')
    .upsert({
      ...tx,
      user_address: walletAddress.toLowerCase(),
    }, {
      onConflict: 'id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to upsert instant transaction:', error);
    return null;
  }
  
  return data as InstantTransactionDB;
}

/**
 * Update an instant transaction status
 */
export async function updateInstantTransactionStatus(
  walletAddress: string,
  id: string,
  updates: Partial<InstantTransactionDB>
): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('instant_transactions')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Failed to update instant transaction:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete an instant transaction
 */
export async function deleteInstantTransaction(
  walletAddress: string,
  id: string
): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('instant_transactions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Failed to delete instant transaction:', error);
    return false;
  }
  
  return true;
}

/**
 * Clear all instant transactions for a wallet
 */
export async function clearInstantTransactions(walletAddress: string): Promise<boolean> {
  const client = createWalletClient(walletAddress);
  
  const { error } = await client
    .from('instant_transactions')
    .delete()
    .neq('id', ''); // Delete all
  
  if (error) {
    console.error('Failed to clear instant transactions:', error);
    return false;
  }
  
  return true;
}
