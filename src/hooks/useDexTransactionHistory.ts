import { useState, useEffect, useCallback } from 'react';

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
  toTokenSymbol: string;
  toTokenAddress?: string;
  toTokenAmount: string;
  toTokenLogo?: string;
  toAmountUsd?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  type: 'swap' | 'approve' | 'bridge';
  explorerUrl?: string;
}

const STORAGE_KEY = 'xlama_dex_transaction_history';

export function useDexTransactionHistory() {
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
      id: `${tx.hash}-${Date.now()}`,
      timestamp: Date.now(),
    };
    setTransactions(prev => [newTx, ...prev.slice(0, 49)]); // Keep max 50
    return newTx;
  }, []);

  const updateTransaction = useCallback((hash: string, updates: Partial<DexTransaction>) => {
    setTransactions(prev => prev.map(tx => 
      tx.hash === hash 
        ? { ...tx, ...updates }
        : tx
    ));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    clearHistory,
  };
}
