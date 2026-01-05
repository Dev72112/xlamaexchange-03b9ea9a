import { useState, useCallback } from 'react';
import { lifiService, LiFiQuoteResult } from '@/services/lifi';
import { Chain } from '@/data/chains';
import { type Route } from '@lifi/sdk';

export type BridgeStatus = 
  | 'idle'
  | 'checking-approval'
  | 'approving'
  | 'pending-source'
  | 'bridging'
  | 'completed'
  | 'failed';

export interface LiFiBridgeTransaction {
  id: string;
  status: BridgeStatus;
  fromChain: Chain;
  toChain: Chain;
  fromToken: {
    symbol: string;
    logoURI: string;
  };
  toToken: {
    symbol: string;
    logoURI: string;
  };
  fromAmount: string;
  toAmount: string;
  sourceTxHash?: string;
  destTxHash?: string;
  bridgeName?: string;
  estimatedTime?: number;
  startTime: number;
  error?: string;
}

interface UseLiFiSwapExecutionOptions {
  fromChain: Chain;
  toChain: Chain;
  quote: LiFiQuoteResult;
  userAddress: string;
}

export function useLiFiSwapExecution() {
  const [transactions, setTransactions] = useState<LiFiBridgeTransaction[]>([]);
  const [currentTx, setCurrentTx] = useState<LiFiBridgeTransaction | null>(null);

  const updateTransaction = useCallback((id: string, updates: Partial<LiFiBridgeTransaction>) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    ));
    setCurrentTx(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, []);

  const executeSwap = useCallback(async (
    options: UseLiFiSwapExecutionOptions,
    _sendTransaction: (txData: any) => Promise<string>
  ) => {
    const { fromChain, toChain, quote } = options;
    
    const txId = `lifi-${Date.now()}`;
    const newTx: LiFiBridgeTransaction = {
      id: txId,
      status: 'checking-approval',
      fromChain,
      toChain,
      fromToken: {
        symbol: quote.fromToken.symbol,
        logoURI: quote.fromToken.logoURI || '',
      },
      toToken: {
        symbol: quote.toToken.symbol,
        logoURI: quote.toToken.logoURI || '',
      },
      fromAmount: (parseFloat(quote.fromAmount) / Math.pow(10, quote.fromToken.decimals)).toString(),
      toAmount: (parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toString(),
      bridgeName: quote.bridgeName,
      estimatedTime: quote.estimatedDurationSeconds,
      startTime: Date.now(),
    };

    setTransactions(prev => [newTx, ...prev]);
    setCurrentTx(newTx);

    try {
      const route = quote.route;
      
      updateTransaction(txId, { status: 'pending-source' });

      // Li.Fi SDK handles the execution flow with route updates
      const result = await lifiService.executeSwap(route, (updatedRoute: Route) => {
        // Handle route updates from Li.Fi
        const step = updatedRoute.steps[0];
        if (step?.transactionId) {
          updateTransaction(txId, { sourceTxHash: step.transactionId });
        }
        
        // Update status based on route progress
        // Li.Fi routes have steps that indicate progress
        const allStepsComplete = updatedRoute.steps.every(s => s.transactionId);
        if (allStepsComplete) {
          updateTransaction(txId, { status: 'bridging' });
        }
      });

      if (result.txHash) {
        updateTransaction(txId, { 
          sourceTxHash: result.txHash,
          status: 'bridging'
        });

        // Start polling for completion
        startStatusPolling(txId, {
          txHash: result.txHash,
          fromChainId: lifiService.getChainId(fromChain.chainIndex) || 1,
          toChainId: lifiService.getChainId(toChain.chainIndex) || 1,
          bridge: quote.bridgeName,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Li.Fi swap execution error:', error);
      updateTransaction(txId, { 
        status: 'failed', 
        error: error?.message || 'Bridge transaction failed' 
      });
      throw error;
    }
  }, [updateTransaction]);

  const startStatusPolling = useCallback((
    txId: string, 
    params: { txHash: string; fromChainId: number; toChainId: number; bridge?: string }
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await lifiService.getStatus({
          txHash: params.txHash,
          fromChain: params.fromChainId,
          toChain: params.toChainId,
          bridge: params.bridge,
        });

        if (status.status === 'DONE') {
          updateTransaction(txId, { 
            status: 'completed',
            destTxHash: status.receiving?.txHash,
          });
          clearInterval(pollInterval);
        } else if (status.status === 'FAILED') {
          updateTransaction(txId, { 
            status: 'failed',
            error: status.substatus || 'Bridge transaction failed',
          });
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    // Clear after 30 minutes
    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
  }, [updateTransaction]);

  const resetCurrentTx = useCallback(() => {
    setCurrentTx(null);
  }, []);

  return {
    transactions,
    currentTx,
    executeSwap,
    resetCurrentTx,
  };
}
