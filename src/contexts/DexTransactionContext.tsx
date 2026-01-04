import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface DexTransaction {
  id: string;
  hash: string;
  chainId: string;
  chainName: string;
  fromTokenSymbol: string;
  fromTokenAmount: string;
  fromTokenLogo?: string;
  fromAmountUsd?: number;
  toTokenSymbol: string;
  toTokenAmount: string;
  toTokenLogo?: string;
  toAmountUsd?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  type: 'swap' | 'approve';
  explorerUrl?: string;
}

const STORAGE_KEY = 'xlama_dex_transaction_history';

interface DexTransactionContextType {
  transactions: DexTransaction[];
  addTransaction: (tx: Omit<DexTransaction, 'id' | 'timestamp'>) => DexTransaction;
  updateTransaction: (hash: string, updates: Partial<DexTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearHistory: () => void;
}

const DexTransactionContext = createContext<DexTransactionContextType | null>(null);

export function DexTransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<DexTransaction[]>(() => {
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

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save DEX transaction history:', e);
    }
  }, [transactions]);

  const addTransaction = useCallback((tx: Omit<DexTransaction, 'id' | 'timestamp'>) => {
    const newTx: DexTransaction = {
      ...tx,
      id: `${tx.hash || 'pending'}-${Date.now()}`,
      timestamp: Date.now(),
    };
    setTransactions(prev => [newTx, ...prev.slice(0, 49)]); // Keep max 50
    return newTx;
  }, []);

  const updateTransaction = useCallback((hashOrId: string, updates: Partial<DexTransaction>) => {
    setTransactions(prev => prev.map(tx => {
      // Match strategies:
      // 1. Exact hash match (for transactions with known hashes)
      const matchesExactHash = tx.hash !== '' && tx.hash === hashOrId;
      
      // 2. ID match (for direct ID updates)
      const matchesId = tx.id === hashOrId;
      
      // 3. Pending transaction that needs a hash (when updating with new hash)
      const isPendingNeedingHash = tx.status === 'pending' && 
        tx.hash === '' && 
        updates.hash && 
        (hashOrId === '' || hashOrId === tx.id || tx.id.includes('pending'));
      
      // 4. Find most recent pending transaction when hashOrId is empty
      const isLatestPending = hashOrId === '' && 
        tx.status === 'pending' && 
        tx.hash === '' &&
        updates.status;
      
      if (matchesExactHash || matchesId || isPendingNeedingHash || isLatestPending) {
        const newTx = { ...tx, ...updates };
        
        // Update ID when adding hash to pending transaction
        if (updates.hash && tx.hash === '') {
          newTx.id = `${updates.hash}-${tx.timestamp}`;
          newTx.hash = updates.hash;
        }
        
        return newTx;
      }
      return tx;
    }));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return (
    <DexTransactionContext.Provider value={{
      transactions,
      addTransaction,
      updateTransaction,
      removeTransaction,
      clearHistory,
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
