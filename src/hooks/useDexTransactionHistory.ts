import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';

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
  walletAddress?: string; // Track which wallet made the transaction
}

const STORAGE_KEY = 'xlama_dex_transaction_history';

export function useDexTransactionHistory() {
  const { activeAddress, isConnected } = useMultiWallet();
  
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
    if (!activeAddress) return null;
    
    const newTx: DexTransaction = {
      ...tx,
      id: `${tx.hash}-${Date.now()}`,
      timestamp: Date.now(),
      walletAddress: activeAddress.toLowerCase(),
    };
    setAllTransactions(prev => [newTx, ...prev.slice(0, 99)]); // Keep max 100 across all wallets
    return newTx;
  }, [activeAddress]);

  const updateTransaction = useCallback((hash: string, updates: Partial<DexTransaction>) => {
    setAllTransactions(prev => prev.map(tx => 
      tx.hash === hash 
        ? { ...tx, ...updates }
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
