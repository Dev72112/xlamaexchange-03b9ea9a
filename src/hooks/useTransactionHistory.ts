import { useState, useEffect, useCallback, useRef } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import {
  fetchInstantTransactions,
  upsertInstantTransaction,
  updateInstantTransactionStatus,
  deleteInstantTransaction,
  clearInstantTransactions,
  InstantTransactionDB,
} from '@/lib/transactionSync';

export interface TransactionRecord {
  id: string;
  fromTicker: string;
  toTicker: string;
  fromName: string;
  toName: string;
  fromImage: string;
  toImage: string;
  fromAmount: string;
  toAmount: string;
  fromAmountUsd?: number;
  toAmountUsd?: number;
  status: 'pending' | 'completed' | 'failed';
  payinAddress?: string;
  payoutAddress?: string;
  createdAt: number;
  updatedAt: number;
  walletAddress?: string;
}

const STORAGE_KEY = 'xlama_transaction_history';

// Convert DB format to local format
function dbToLocal(db: InstantTransactionDB): TransactionRecord {
  return {
    id: db.id,
    fromTicker: db.from_ticker,
    toTicker: db.to_ticker,
    fromName: db.from_name || '',
    toName: db.to_name || '',
    fromImage: db.from_image || '',
    toImage: db.to_image || '',
    fromAmount: db.from_amount,
    toAmount: db.to_amount || '',
    fromAmountUsd: db.from_amount_usd || undefined,
    toAmountUsd: db.to_amount_usd || undefined,
    status: db.status as 'pending' | 'completed' | 'failed',
    payinAddress: db.payin_address || undefined,
    payoutAddress: db.payout_address || undefined,
    createdAt: new Date(db.created_at).getTime(),
    updatedAt: new Date(db.updated_at).getTime(),
    walletAddress: db.user_address,
  };
}

// Convert local format to DB format
function localToDb(tx: TransactionRecord): Omit<InstantTransactionDB, 'user_address' | 'updated_at'> {
  return {
    id: tx.id,
    from_ticker: tx.fromTicker,
    to_ticker: tx.toTicker,
    from_name: tx.fromName || null,
    to_name: tx.toName || null,
    from_image: tx.fromImage || null,
    to_image: tx.toImage || null,
    from_amount: tx.fromAmount,
    to_amount: tx.toAmount || null,
    from_amount_usd: tx.fromAmountUsd || null,
    to_amount_usd: tx.toAmountUsd || null,
    status: tx.status,
    payin_address: tx.payinAddress || null,
    payout_address: tx.payoutAddress || null,
    created_at: new Date(tx.createdAt).toISOString(),
  };
}

export function useTransactionHistory() {
  const { activeAddress, isConnected } = useMultiWallet();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncedAddressRef = useRef<string | null>(null);
  
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load transaction history:', e);
    }
    return [];
  });

  // Sync with database when wallet connects
  useEffect(() => {
    if (!activeAddress || !isConnected) {
      syncedAddressRef.current = null;
      return;
    }
    
    if (syncedAddressRef.current === activeAddress.toLowerCase()) {
      return;
    }
    
    const syncWithDatabase = async () => {
      setIsSyncing(true);
      console.log('[TransactionHistory] Syncing with database for', activeAddress);
      
      try {
        const dbTransactions = await fetchInstantTransactions(activeAddress);
        const dbTxMap = new Map(dbTransactions.map(tx => [tx.id, tx]));
        
        const localWalletTxs = allTransactions.filter(
          tx => tx.walletAddress?.toLowerCase() === activeAddress.toLowerCase()
        );
        
        // Upload local transactions not in DB
        for (const localTx of localWalletTxs) {
          if (!dbTxMap.has(localTx.id)) {
            console.log('[TransactionHistory] Uploading local tx to DB:', localTx.id);
            await upsertInstantTransaction(activeAddress, localToDb(localTx));
          }
        }
        
        // Merge: DB is source of truth
        const mergedMap = new Map<string, TransactionRecord>();
        
        for (const dbTx of dbTransactions) {
          mergedMap.set(dbTx.id, dbToLocal(dbTx));
        }
        
        for (const localTx of localWalletTxs) {
          if (!mergedMap.has(localTx.id)) {
            mergedMap.set(localTx.id, localTx);
          }
        }
        
        const otherWalletTxs = allTransactions.filter(
          tx => tx.walletAddress?.toLowerCase() !== activeAddress.toLowerCase()
        );
        
        const merged = [...Array.from(mergedMap.values()), ...otherWalletTxs]
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setAllTransactions(merged);
        syncedAddressRef.current = activeAddress.toLowerCase();
        console.log('[TransactionHistory] Sync complete, total:', merged.length);
      } catch (error) {
        console.error('[TransactionHistory] Sync failed:', error);
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
      console.error('Failed to save transaction history:', e);
    }
  }, [allTransactions]);

  const addTransaction = useCallback((tx: Omit<TransactionRecord, 'createdAt' | 'updatedAt' | 'walletAddress'>) => {
    if (!activeAddress) return null;
    
    const now = Date.now();
    const newTx: TransactionRecord = {
      ...tx,
      createdAt: now,
      updatedAt: now,
      walletAddress: activeAddress.toLowerCase(),
    };
    setAllTransactions(prev => [newTx, ...prev.slice(0, 99)]);
    
    // Sync to database
    upsertInstantTransaction(activeAddress, localToDb(newTx)).catch(err => {
      console.error('[TransactionHistory] Failed to sync new tx to DB:', err);
    });
    
    return newTx;
  }, [activeAddress]);

  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    setAllTransactions(prev => prev.map(tx => 
      tx.id === id 
        ? { ...tx, ...updates, updatedAt: Date.now() }
        : tx
    ));
    
    // Sync to database
    if (activeAddress) {
      const dbUpdates: Partial<InstantTransactionDB> = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.toAmount) dbUpdates.to_amount = updates.toAmount;
      
      updateInstantTransactionStatus(activeAddress, id, dbUpdates).catch(err => {
        console.error('[TransactionHistory] Failed to sync update to DB:', err);
      });
    }
  }, [activeAddress]);

  const removeTransaction = useCallback((id: string) => {
    setAllTransactions(prev => prev.filter(tx => tx.id !== id));
    
    if (activeAddress) {
      deleteInstantTransaction(activeAddress, id).catch(err => {
        console.error('[TransactionHistory] Failed to sync deletion to DB:', err);
      });
    }
  }, [activeAddress]);

  const clearHistory = useCallback(() => {
    if (!activeAddress) return;
    
    setAllTransactions(prev => prev.filter(tx => 
      tx.walletAddress?.toLowerCase() !== activeAddress.toLowerCase()
    ));
    
    clearInstantTransactions(activeAddress).catch(err => {
      console.error('[TransactionHistory] Failed to clear DB transactions:', err);
    });
  }, [activeAddress]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    clearHistory,
    isSyncing,
  };
}
