import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";

export type BridgeStatus = 
  | 'idle' 
  | 'checking-approval' 
  | 'awaiting-approval'
  | 'approving' 
  | 'pending-source' 
  | 'bridging' 
  | 'completed' 
  | 'failed';

export interface BridgeTransaction {
  id: string;
  status: BridgeStatus;
  fromChain: { 
    chainId: number; 
    name: string; 
    icon: string; 
  };
  toChain: { 
    chainId: number; 
    name: string; 
    icon: string; 
  };
  fromToken: { 
    symbol: string; 
    address: string; 
    logoURI?: string; 
  };
  toToken: { 
    symbol: string; 
    address: string; 
    logoURI?: string; 
  };
  fromAmount: string;
  toAmount: string;
  fromAmountUsd?: number;
  toAmountUsd?: number;
  sourceTxHash?: string;
  destTxHash?: string;
  bridgeName?: string;
  estimatedTime?: number;
  startTime: number;
  completedTime?: number;
  error?: string;
  // CRITICAL: Track which wallet made this transaction
  walletAddress?: string;
}

interface BridgeTransactionContextType {
  transactions: BridgeTransaction[];
  addTransaction: (tx: Omit<BridgeTransaction, 'id' | 'startTime' | 'walletAddress'>) => string;
  updateTransaction: (id: string, updates: Partial<BridgeTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearHistory: () => void;
  pendingCount: number;
}

const BridgeTransactionContext = createContext<BridgeTransactionContextType | undefined>(undefined);

const STORAGE_KEY = 'xlama_bridge_transactions';
const MAX_STORED_TRANSACTIONS = 50;

export function BridgeTransactionProvider({ children }: { children: React.ReactNode }) {
  const { activeAddress, isConnected } = useMultiWallet();
  
  const [allTransactions, setAllTransactions] = useState<BridgeTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep recent transactions (last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return parsed.filter((tx: BridgeTransaction) => tx.startTime > thirtyDaysAgo);
      }
    } catch (e) {
      console.error('Failed to load bridge transactions:', e);
    }
    return [];
  });

  // CRITICAL: Filter transactions to only show current wallet's transactions
  const transactions = useMemo(() => {
    if (!isConnected || !activeAddress) {
      return [];
    }
    return allTransactions.filter(tx => 
      tx.walletAddress?.toLowerCase() === activeAddress.toLowerCase()
    );
  }, [allTransactions, activeAddress, isConnected]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const toStore = allTransactions.slice(0, MAX_STORED_TRANSACTIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to save bridge transactions:', e);
    }
  }, [allTransactions]);

  const addTransaction = useCallback((tx: Omit<BridgeTransaction, 'id' | 'startTime' | 'walletAddress'>) => {
    if (!activeAddress) {
      console.warn('[BridgeTransactionContext] Cannot add transaction: no wallet connected');
      return '';
    }
    
    const id = `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newTx: BridgeTransaction = {
      ...tx,
      id,
      startTime: Date.now(),
      // CRITICAL: Always store the wallet address that created this transaction
      walletAddress: activeAddress.toLowerCase(),
    };
    console.log('[BridgeTransactionContext] Adding transaction for wallet:', activeAddress, 'id:', id);
    setAllTransactions(prev => [newTx, ...prev]);
    return id;
  }, [activeAddress]);

  const updateTransaction = useCallback((id: string, updates: Partial<BridgeTransaction>) => {
    setAllTransactions(prev => 
      prev.map(tx => 
        tx.id === id ? { ...tx, ...updates } : tx
      )
    );
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setAllTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    if (!activeAddress) return;
    
    // Only clear CURRENT wallet's completed/failed transactions
    setAllTransactions(prev => 
      prev.filter(tx => {
        const isCurrentWallet = tx.walletAddress?.toLowerCase() === activeAddress.toLowerCase();
        const isPending = tx.status !== 'completed' && tx.status !== 'failed';
        
        // Keep if: not current wallet, OR if it's a pending transaction
        return !isCurrentWallet || isPending;
      })
    );
  }, [activeAddress]);

  const pendingCount = transactions.filter(
    tx => tx.status !== 'completed' && tx.status !== 'failed' && tx.status !== 'idle'
  ).length;

  return (
    <BridgeTransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        removeTransaction,
        clearHistory,
        pendingCount,
      }}
    >
      {children}
    </BridgeTransactionContext.Provider>
  );
}

export function useBridgeTransactions() {
  const context = useContext(BridgeTransactionContext);
  if (!context) {
    throw new Error('useBridgeTransactions must be used within BridgeTransactionProvider');
  }
  return context;
}
