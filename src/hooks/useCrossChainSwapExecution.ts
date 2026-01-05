import { useState, useCallback, useRef, useEffect } from 'react';
import { okxDexService } from '@/services/okxdex';
import { useToast } from '@/hooks/use-toast';
import { Chain } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';

export type BridgeStatus = 
  | 'idle'
  | 'checking-approval'
  | 'approving'
  | 'pending-source'
  | 'bridging'
  | 'pending-destination'
  | 'completed'
  | 'failed';

export interface BridgeTransaction {
  id: string;
  fromChain: Chain;
  toChain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  fromAmount: string;
  toAmount: string;
  status: BridgeStatus;
  sourceTxHash?: string;
  destinationTxHash?: string;
  bridgeName?: string;
  estimatedTime?: number;
  startTime: number;
  error?: string;
}

interface UseCrossChainSwapExecutionOptions {
  fromChain: Chain;
  toChain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  amount: string;
  slippage: string;
  userAddress: string;
  receiveAddress?: string;
}

export function useCrossChainSwapExecution() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [currentTx, setCurrentTx] = useState<BridgeTransaction | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<BridgeTransaction>) => {
    setTransactions(prev => 
      prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
    );
    setCurrentTx(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, []);

  const executeSwap = useCallback(async (
    options: UseCrossChainSwapExecutionOptions,
    sendTransaction: (txData: any) => Promise<string>
  ): Promise<BridgeTransaction> => {
    const { fromChain, toChain, fromToken, toToken, amount, slippage, userAddress, receiveAddress } = options;

    const txId = `bridge-${Date.now()}`;
    const bridgeTx: BridgeTransaction = {
      id: txId,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: '',
      status: 'checking-approval',
      startTime: Date.now(),
    };

    setTransactions(prev => [...prev, bridgeTx]);
    setCurrentTx(bridgeTx);

    try {
      // Convert amount to smallest unit
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      // Step 1: Get swap data (includes approval check)
      updateTransaction(txId, { status: 'checking-approval' });
      
      const swapData = await okxDexService.getCrossChainSwap(
        fromChain.chainIndex,
        toChain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage,
        userAddress,
        receiveAddress || userAddress
      );

      if (!swapData || swapData.error) {
        throw new Error(swapData?.error || 'Failed to get bridge transaction data');
      }

      // Step 2: Check if approval is needed (for non-native tokens)
      if (swapData.tx?.approveData) {
        updateTransaction(txId, { status: 'approving' });
        
        toast({
          title: "Approval Required",
          description: `Please approve ${fromToken.tokenSymbol} for bridging`,
        });

        const approveTxHash = await sendTransaction({
          to: swapData.tx.approveData.to,
          data: swapData.tx.approveData.data,
          value: '0',
        });

        toast({
          title: "Approval Submitted",
          description: "Waiting for approval confirmation...",
        });

        // Poll for approval transaction confirmation
        await waitForTransactionConfirmation(fromChain.chainIndex, approveTxHash);
      }

      // Step 3: Execute bridge transaction
      updateTransaction(txId, { 
        status: 'pending-source',
        bridgeName: swapData.bridgeName,
        estimatedTime: swapData.estimatedTime ? parseInt(swapData.estimatedTime) : undefined,
        toAmount: swapData.toTokenAmount,
      });

      toast({
        title: "Bridge Transaction",
        description: `Bridging ${fromToken.tokenSymbol} from ${fromChain.name} to ${toChain.name}`,
      });

      const sourceTxHash = await sendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value || '0',
        gas: swapData.tx.gas,
        gasPrice: swapData.tx.gasPrice,
      });

      updateTransaction(txId, { 
        status: 'bridging',
        sourceTxHash,
      });

      toast({
        title: "Bridge Started",
        description: `Transaction submitted. Bridging to ${toChain.name}...`,
      });

      // Start polling for bridge completion
      startBridgePolling(txId, fromChain.chainIndex, sourceTxHash);

      return { ...bridgeTx, status: 'bridging', sourceTxHash };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge failed';
      
      updateTransaction(txId, { 
        status: 'failed',
        error: errorMessage,
      });

      toast({
        variant: "destructive",
        title: "Bridge Failed",
        description: errorMessage,
      });

      throw error;
    }
  }, [toast, updateTransaction]);

  const startBridgePolling = useCallback((txId: string, chainIndex: string, txHash: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes with 10s intervals

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const txDetail = await okxDexService.getTransactionDetail(chainIndex, txHash);
        
        if (txDetail?.txStatus === 'success') {
          updateTransaction(txId, { 
            status: 'completed',
          });
          
          toast({
            title: "Bridge Complete! 🎉",
            description: "Your tokens have been successfully bridged.",
          });

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (txDetail?.txStatus === 'fail') {
          updateTransaction(txId, { 
            status: 'failed',
            error: 'Transaction failed on chain',
          });

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.error('Bridge polling error:', err);
      }

      if (attempts >= maxAttempts) {
        updateTransaction(txId, { 
          status: 'failed',
          error: 'Bridge timed out',
        });

        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 10000);
  }, [toast, updateTransaction]);

  return {
    transactions,
    currentTx,
    executeSwap,
  };
}

// Helper to convert amount to smallest unit
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  return combined.replace(/^0+/, '') || '0';
}

// Poll for transaction confirmation instead of hardcoded wait
async function waitForTransactionConfirmation(
  chainIndex: string, 
  txHash: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const txDetail = await okxDexService.getTransactionDetail(chainIndex, txHash);
      
      if (txDetail?.txStatus === 'success') {
        return true;
      }
      
      if (txDetail?.txStatus === 'fail') {
        throw new Error('Approval transaction failed');
      }
    } catch (err) {
      // Ignore polling errors, continue trying
      console.warn('Approval polling attempt failed:', err);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  // Timeout - assume it went through (worst case, bridge tx will fail)
  console.warn('Approval confirmation timed out, proceeding with bridge');
  return true;
}
