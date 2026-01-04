import { useState, useEffect, useCallback } from 'react';

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
}

const STORAGE_KEY = 'xlama_transaction_history';

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
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

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transaction history:', e);
    }
  }, [transactions]);

  const addTransaction = useCallback((tx: Omit<TransactionRecord, 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newTx: TransactionRecord = {
      ...tx,
      createdAt: now,
      updatedAt: now,
    };
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id 
        ? { ...tx, ...updates, updatedAt: Date.now() }
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
