import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import {
  fetchDexTransactions,
  upsertDexTransaction,
  updateDexTransactionStatus,
  deleteDexTransaction,
  clearDexTransactions,
  DexTransactionDB,
} from '@/lib/transactionSync';

export interface DexTransaction {
  id: string;
  hash: string;
  chainId: string;
  chainName: string;
  fromTokenSymbol: string;
  fromTokenAddress?: string;
  fromTokenAmount: string;
  fromTokenLogo?: string;
  fromAmountUsd?: number;
  fromTokenPrice?: number;
  toTokenSymbol: string;
  toTokenAddress?: string;
  toTokenAmount: string;
  toTokenLogo?: string;
  toAmountUsd?: number;
  toTokenPrice?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  type: 'swap' | 'approve';
  explorerUrl?: string;
  walletAddress?: string;
}

const STORAGE_KEY = 'xlama_dex_transaction_history';

interface DexTransactionContextType {
  transactions: DexTransaction[];
  addTransaction: (tx: Omit<DexTransaction, 'id' | 'timestamp'>) => DexTransaction;
  updateTransaction: (hash: string, updates: Partial<DexTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearHistory: () => void;
  isSyncing: boolean;
}

const DexTransactionContext = createContext<DexTransactionContextType | null>(null);

// Convert DB format to local format
function dbToLocal(db: DexTransactionDB): DexTransaction {
  return {
    id: db.id,
    hash: db.tx_hash,
    chainId: db.chain_index,
    chainName: db.chain_name || '',
    fromTokenSymbol: db.from_token_symbol,
    fromTokenAddress: db.from_token_address || undefined,
    fromTokenAmount: db.from_amount,
    fromTokenLogo: db.from_token_logo || undefined,
    fromAmountUsd: db.from_amount_usd || undefined,
    fromTokenPrice: db.from_token_price || undefined,
    toTokenSymbol: db.to_token_symbol,
    toTokenAddress: db.to_token_address || undefined,
    toTokenAmount: db.to_amount,
    toTokenLogo: db.to_token_logo || undefined,
    toAmountUsd: db.to_amount_usd || undefined,
    toTokenPrice: db.to_token_price || undefined,
    status: db.status as 'pending' | 'confirmed' | 'failed',
    timestamp: new Date(db.created_at).getTime(),
    type: db.type as 'swap' | 'approve',
    explorerUrl: db.explorer_url || undefined,
    walletAddress: db.user_address,
  };
}

// Convert local format to DB format
function localToDb(tx: DexTransaction): Omit<DexTransactionDB, 'id' | 'user_address' | 'updated_at'> {
  return {
    tx_hash: tx.hash,
    chain_index: tx.chainId,
    chain_name: tx.chainName || null,
    from_token_symbol: tx.fromTokenSymbol,
    from_token_address: tx.fromTokenAddress || null,
    from_amount: tx.fromTokenAmount,
    from_token_logo: tx.fromTokenLogo || null,
    from_amount_usd: tx.fromAmountUsd || null,
    from_token_price: tx.fromTokenPrice || null,
    to_token_symbol: tx.toTokenSymbol,
    to_token_address: tx.toTokenAddress || null,
    to_amount: tx.toTokenAmount,
    to_token_logo: tx.toTokenLogo || null,
    to_amount_usd: tx.toAmountUsd || null,
    to_token_price: tx.toTokenPrice || null,
    status: tx.status,
    type: tx.type,
    explorer_url: tx.explorerUrl || null,
    created_at: new Date(tx.timestamp).toISOString(),
  };
}

export function DexTransactionProvider({ children }: { children: ReactNode }) {
  const { activeAddress, isConnected } = useMultiWallet();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedAddressRef = useRef<string | null>(null);
  
  const [allTransactions, setAllTransactions] = useState<DexTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load DEX transaction history:', e);
    }
    return [];
  });

  // Sync with database when wallet connects
  useEffect(() => {
    if (!activeAddress || !isConnected) {
      syncedAddressRef.current = null;
      return;
    }
    
    // Only sync once per wallet connection
    if (syncedAddressRef.current === activeAddress.toLowerCase()) {
      return;
    }
    
    const syncWithDatabase = async () => {
      setIsSyncing(true);
      console.log('[DexTransactionContext] Syncing with database for', activeAddress);
      
      try {
        // Fetch from database
        const dbTransactions = await fetchDexTransactions(activeAddress);
        const dbTxMap = new Map(dbTransactions.map(tx => [tx.tx_hash, tx]));
        
        // Get local transactions for this wallet
        const localWalletTxs = allTransactions.filter(
          tx => tx.walletAddress?.toLowerCase() === activeAddress.toLowerCase()
        );
        
        // Upload local transactions that aren't in DB (migration)
        for (const localTx of localWalletTxs) {
          if (localTx.hash && !dbTxMap.has(localTx.hash)) {
            console.log('[DexTransactionContext] Uploading local tx to DB:', localTx.hash);
            await upsertDexTransaction(activeAddress, localToDb(localTx));
          }
        }
        
        // Merge: DB is source of truth
        const mergedMap = new Map<string, DexTransaction>();
        
        // Add all DB transactions
        for (const dbTx of dbTransactions) {
          mergedMap.set(dbTx.tx_hash, dbToLocal(dbTx));
        }
        
        // Add local transactions not in DB (pending or failed to upload)
        for (const localTx of localWalletTxs) {
          if (localTx.hash && !mergedMap.has(localTx.hash)) {
            mergedMap.set(localTx.hash, localTx);
          }
        }
        
        // Keep transactions from other wallets
        const otherWalletTxs = allTransactions.filter(
          tx => tx.walletAddress?.toLowerCase() !== activeAddress.toLowerCase()
        );
        
        const merged = [...Array.from(mergedMap.values()), ...otherWalletTxs]
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setAllTransactions(merged);
        syncedAddressRef.current = activeAddress.toLowerCase();
        console.log('[DexTransactionContext] Sync complete, total:', merged.length);
      } catch (error) {
        console.error('[DexTransactionContext] Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };
    
    syncWithDatabase();
  }, [activeAddress, isConnected]);

  // Filter transactions for current wallet only
  const transactions = isConnected && activeAddress 
    ? allTransactions.filter(tx => 
        tx.walletAddress?.toLowerCase() === activeAddress.toLowerCase()
      )
    : [];

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTransactions));
    } catch (e) {
      console.error('Failed to save DEX transaction history:', e);
    }
  }, [allTransactions]);

  const addTransaction = useCallback((tx: Omit<DexTransaction, 'id' | 'timestamp' | 'walletAddress'>) => {
    if (!activeAddress) {
      console.warn('Cannot add transaction: no wallet connected');
      return null as unknown as DexTransaction;
    }
    
    const newTx: DexTransaction = {
      ...tx,
      id: `${tx.hash || 'pending'}-${Date.now()}`,
      timestamp: Date.now(),
      walletAddress: activeAddress.toLowerCase(),
    };
    console.log('[DexTransactionContext] Adding transaction:', newTx.id, newTx.type);
    setAllTransactions(prev => [newTx, ...prev.slice(0, 99)]);
    
    // Sync to database in background
    if (newTx.hash) {
      upsertDexTransaction(activeAddress, localToDb(newTx)).catch(err => {
        console.error('[DexTransactionContext] Failed to sync new tx to DB:', err);
      });
    }
    
    return newTx;
  }, [activeAddress]);

  const updateTransaction = useCallback((hashOrId: string, updates: Partial<DexTransaction>) => {
    let updatedHash: string | null = null;
    
    setAllTransactions(prev => prev.map(tx => {
      const matchesExactHash = tx.hash !== '' && tx.hash === hashOrId;
      const matchesId = tx.id === hashOrId;
      const isPendingNeedingHash = tx.status === 'pending' && 
        tx.hash === '' && 
        updates.hash && 
        (hashOrId === '' || hashOrId === tx.id || tx.id.includes('pending'));
      const isLatestPending = hashOrId === '' && 
        tx.status === 'pending' && 
        tx.hash === '' &&
        updates.status;
      
      if (matchesExactHash || matchesId || isPendingNeedingHash || isLatestPending) {
        const newTx = { ...tx, ...updates };
        
        if (updates.hash && tx.hash === '') {
          newTx.id = `${updates.hash}-${tx.timestamp}`;
          newTx.hash = updates.hash;
        }
        
        updatedHash = newTx.hash;
        return newTx;
      }
      return tx;
    }));
    
    // Sync status update to database
    if (updatedHash && updates.status && activeAddress) {
      updateDexTransactionStatus(activeAddress, updatedHash, updates.status).catch(err => {
        console.error('[DexTransactionContext] Failed to sync status update to DB:', err);
      });
    }
  }, [activeAddress]);

  const removeTransaction = useCallback((id: string) => {
    const txToRemove = allTransactions.find(tx => tx.id === id);
    setAllTransactions(prev => prev.filter(tx => tx.id !== id));
    
    // Sync deletion to database
    if (txToRemove?.hash && activeAddress) {
      deleteDexTransaction(activeAddress, txToRemove.hash).catch(err => {
        console.error('[DexTransactionContext] Failed to sync deletion to DB:', err);
      });
    }
  }, [allTransactions, activeAddress]);

  const clearHistory = useCallback(() => {
    if (!activeAddress) return;
    
    setAllTransactions(prev => prev.filter(tx => 
      tx.walletAddress?.toLowerCase() !== activeAddress.toLowerCase()
    ));
    
    // Sync to database
    clearDexTransactions(activeAddress).catch(err => {
      console.error('[DexTransactionContext] Failed to clear DB transactions:', err);
    });
  }, [activeAddress]);

  return (
    <DexTransactionContext.Provider value={{
      transactions,
      addTransaction,
      updateTransaction,
      removeTransaction,
      clearHistory,
      isSyncing,
    }}>
      {children}
    </DexTransactionContext.Provider>
  );
}

export function useDexTransactions() {
  const context = useContext(DexTransactionContext);
  if (!context) {
    throw new Error('useDexTransactions must be used within a DexTransactionProvider');
  }
  return context;
}
