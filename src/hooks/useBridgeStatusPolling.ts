import { useEffect, useRef, useCallback } from 'react';
import { useBridgeTransactions, BridgeTransaction, BridgeStatus } from '@/contexts/BridgeTransactionContext';
import { lifiService } from '@/services/lifi';

const POLL_INTERVAL = 15000; // 15 seconds
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 minutes

interface PollState {
  intervalId: NodeJS.Timeout | null;
  startTime: number;
}

export function useBridgeStatusPolling() {
  const { transactions, updateTransaction } = useBridgeTransactions();
  const pollStates = useRef<Map<string, PollState>>(new Map());

  const pollTransaction = useCallback(async (tx: BridgeTransaction) => {
    if (!tx.sourceTxHash) return;
    
    try {
      const status = await lifiService.getStatus({
        txHash: tx.sourceTxHash,
        fromChain: tx.fromChain.chainId,
        toChain: tx.toChain.chainId,
        bridge: tx.bridgeName,
      });

      if (status.status === 'DONE') {
        updateTransaction(tx.id, { 
          status: 'completed',
          destTxHash: status.receiving?.txHash,
          completedTime: Date.now(),
        });
        
        // Stop polling this transaction
        const state = pollStates.current.get(tx.id);
        if (state?.intervalId) {
          clearInterval(state.intervalId);
          pollStates.current.delete(tx.id);
        }
      } else if (status.status === 'FAILED') {
        updateTransaction(tx.id, { 
          status: 'failed',
          error: status.substatus || 'Bridge transaction failed',
        });
        
        // Stop polling this transaction
        const state = pollStates.current.get(tx.id);
        if (state?.intervalId) {
          clearInterval(state.intervalId);
          pollStates.current.delete(tx.id);
        }
      }
    } catch (error) {
      console.error('Status polling error for', tx.id, error);
    }
  }, [updateTransaction]);

  const startPolling = useCallback((tx: BridgeTransaction) => {
    if (pollStates.current.has(tx.id)) return;
    
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      // Check if we've exceeded max poll time
      if (Date.now() - startTime > MAX_POLL_TIME) {
        const state = pollStates.current.get(tx.id);
        if (state?.intervalId) {
          clearInterval(state.intervalId);
          pollStates.current.delete(tx.id);
        }
        return;
      }
      
      pollTransaction(tx);
    }, POLL_INTERVAL);
    
    pollStates.current.set(tx.id, { intervalId, startTime });
    
    // Also poll immediately
    pollTransaction(tx);
  }, [pollTransaction]);

  // Poll pending transactions on mount and when transactions change
  useEffect(() => {
    const pendingStatuses: BridgeStatus[] = ['pending-source', 'bridging'];
    
    transactions.forEach(tx => {
      if (pendingStatuses.includes(tx.status) && tx.sourceTxHash) {
        startPolling(tx);
      }
    });
    
    // Cleanup on unmount
    return () => {
      pollStates.current.forEach(state => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }
      });
      pollStates.current.clear();
    };
  }, [transactions, startPolling]);

  return {
    pollTransaction,
    startPolling,
  };
}
