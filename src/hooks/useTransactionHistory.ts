import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';

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
  walletAddress?: string; // Track which wallet made the transaction
}

const STORAGE_KEY = 'xlama_transaction_history';

export function useTransactionHistory() {
  const { activeAddress, isConnected } = useMultiWallet();
  
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
    setAllTransactions(prev => [newTx, ...prev.slice(0, 99)]); // Keep max 100 across all wallets
    return newTx;
  }, [activeAddress]);

  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    setAllTransactions(prev => prev.map(tx => 
      tx.id === id 
        ? { ...tx, ...updates, updatedAt: Date.now() }
        : tx
    ));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setAllTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    if (!activeAddress) return;
    // Only clear current wallet's transactions
    setAllTransactions(prev => prev.filter(tx => 
      tx.walletAddress?.toLowerCase() !== activeAddress.toLowerCase()
    ));
  }, [activeAddress]);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    clearHistory,
  };
}
