import { useEffect, useRef, useCallback } from 'react';
import { useBridgeTransactions, BridgeStatus } from '@/contexts/BridgeTransactionContext';
import { lifiService } from '@/services/lifi';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';

const POLL_INTERVAL = 15000;
const MAX_POLL_TIME = 30 * 60 * 1000;
const NOTIFIED_TXS_KEY = 'xlama_bridge_notified_txs';

interface PollState {
  intervalId: NodeJS.Timeout | null;
  startTime: number;
  lastStatus: BridgeStatus;
}

const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
  56: 'https://bscscan.com/tx/',
  137: 'https://polygonscan.com/tx/',
  42161: 'https://arbiscan.io/tx/',
  43114: 'https://snowtrace.io/tx/',
  8453: 'https://basescan.org/tx/',
  324: 'https://explorer.zksync.io/tx/',
  59144: 'https://lineascan.build/tx/',
};

function getExplorerUrl(chainId: number, txHash: string): string | null {
  const base = EXPLORER_URLS[chainId];
  return base ? `${base}${txHash}` : null;
}

// Load notified txs from localStorage to persist across page reloads
function loadNotifiedTxs(): Set<string> {
  try {
    const stored = localStorage.getItem(NOTIFIED_TXS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function saveNotifiedTxs(txs: Set<string>) {
  try {
    // Only keep the last 100 transaction IDs to prevent unbounded growth
    const arr = Array.from(txs).slice(-100);
    localStorage.setItem(NOTIFIED_TXS_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

export function BridgeNotificationWatcher() {
  const { transactions, updateTransaction } = useBridgeTransactions();
  const pollStates = useRef<Map<string, PollState>>(new Map());
  const { playSound } = useFeedback();
  // Persist notified txs to localStorage to avoid showing on every login
  const notifiedTxs = useRef<Set<string>>(loadNotifiedTxs());

  const markAsNotified = useCallback((txId: string) => {
    notifiedTxs.current.add(txId);
    saveNotifiedTxs(notifiedTxs.current);
  }, []);

  const showCompletedNotification = useCallback((tx: typeof transactions[0]) => {
    if (notifiedTxs.current.has(tx.id)) return;
    markAsNotified(tx.id);
    
    playSound('success');
    
    const explorerUrl = tx.destTxHash && tx.toChain?.chainId 
      ? getExplorerUrl(tx.toChain.chainId, tx.destTxHash) 
      : null;
    
    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Bridge Complete!
        </span>
        <span className="text-sm text-muted-foreground">
          {tx.fromAmount} {tx.fromToken?.symbol} → {tx.toAmount} {tx.toToken?.symbol}
        </span>
        {explorerUrl && (
          <a 
            href={explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>,
      { duration: 8000 }
    );
  }, [playSound, markAsNotified]);

  const showFailedNotification = useCallback((tx: typeof transactions[0]) => {
    if (notifiedTxs.current.has(tx.id)) return;
    markAsNotified(tx.id);
    
    playSound('click'); // Use click as a fallback for error sound
    
    toast.error(
      <div className="flex flex-col gap-1">
        <span className="font-medium flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          Bridge Failed
        </span>
        <span className="text-sm text-muted-foreground">
          {tx.fromAmount} {tx.fromToken?.symbol} → {tx.toToken?.symbol}
        </span>
        {tx.error && (
          <span className="text-xs text-destructive/80">{tx.error}</span>
        )}
      </div>,
      { duration: 8000 }
    );
  }, [playSound, markAsNotified]);

  const pollTransaction = useCallback(async (tx: typeof transactions[0]) => {
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
        
        // Show notification
        showCompletedNotification({
          ...tx,
          status: 'completed',
          destTxHash: status.receiving?.txHash,
        });
        
        // Stop polling
        const state = pollStates.current.get(tx.id);
        if (state?.intervalId) {
          clearInterval(state.intervalId);
          pollStates.current.delete(tx.id);
        }
      } else if (status.status === 'FAILED') {
        const errorMsg = status.substatus || 'Bridge transaction failed';
        updateTransaction(tx.id, { 
          status: 'failed',
          error: errorMsg,
        });
        
        // Show notification
        showFailedNotification({
          ...tx,
          status: 'failed',
          error: errorMsg,
        });
        
        // Stop polling
        const state = pollStates.current.get(tx.id);
        if (state?.intervalId) {
          clearInterval(state.intervalId);
          pollStates.current.delete(tx.id);
        }
      }
    } catch (error) {
      console.error('Bridge status polling error:', error);
    }
  }, [updateTransaction, showCompletedNotification, showFailedNotification]);

  const startPolling = useCallback((tx: typeof transactions[0]) => {
    if (pollStates.current.has(tx.id)) return;
    
    const startTime = Date.now();
    const intervalId = setInterval(() => {
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
    
    pollStates.current.set(tx.id, { intervalId, startTime, lastStatus: tx.status });
    
    // Poll immediately
    pollTransaction(tx);
  }, [pollTransaction]);

  // Watch for pending transactions and poll them
  useEffect(() => {
    const pendingStatuses: BridgeStatus[] = ['pending-source', 'bridging'];
    
    transactions.forEach(tx => {
      // Start polling for pending transactions only
      if (pendingStatuses.includes(tx.status) && tx.sourceTxHash) {
        startPolling(tx);
      }
      
      // DON'T show notifications for already-completed/failed transactions on mount
      // Only show notifications for status changes that happen DURING this session
      // The polling callbacks handle notifications for real-time status changes
    });
    
    return () => {
      pollStates.current.forEach(state => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }
      });
      pollStates.current.clear();
    };
  }, [transactions, startPolling]);

  // This component doesn't render anything visible
  return null;
}
