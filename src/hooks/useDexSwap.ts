import { useState, useCallback } from 'react';
import { okxDexService, OkxToken, OkxSwapData } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useWallet } from '@/contexts/WalletContext';

type SwapStep = 'idle' | 'checking-approval' | 'approving' | 'swapping' | 'confirming' | 'complete' | 'error';

interface UseDexSwapOptions {
  chain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  amount: string;
  slippage: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function useDexSwap() {
  const { address, getProvider, isConnected } = useWallet();
  const [step, setStep] = useState<SwapStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const executeSwap = useCallback(async ({
    chain,
    fromToken,
    toToken,
    amount,
    slippage,
    onSuccess,
    onError,
  }: UseDexSwapOptions) => {
    if (!isConnected || !address) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const provider = getProvider();
      if (!provider) throw new Error('No provider available');

      // Convert amount to smallest unit
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      // Check if token needs approval (not native token)
      if (fromToken.tokenContractAddress.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase()) {
        setStep('checking-approval');
        
        // Get approval transaction
        const approveData = await okxDexService.getApproveTransaction(
          chain.chainIndex,
          fromToken.tokenContractAddress,
          amountInSmallestUnit
        );

        if (approveData && approveData.data) {
          setStep('approving');
          
          // Send approval transaction
          const approveTxHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: approveData.dexContractAddress,
              data: approveData.data,
              gas: approveData.gasLimit ? `0x${parseInt(approveData.gasLimit).toString(16)}` : undefined,
            }],
          });

          // Wait for approval confirmation
          await waitForTransaction(provider, approveTxHash as string);
        }
      }

      setStep('swapping');

      // Get swap transaction data
      const swapData = await okxDexService.getSwapData(
        chain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        address,
        slippage
      );

      if (!swapData?.tx) {
        throw new Error('Failed to get swap transaction data');
      }

      // Send swap transaction
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: swapData.tx.from,
          to: swapData.tx.to,
          value: swapData.tx.value ? `0x${BigInt(swapData.tx.value).toString(16)}` : '0x0',
          data: swapData.tx.data,
          gas: swapData.tx.gas ? `0x${parseInt(swapData.tx.gas).toString(16)}` : undefined,
        }],
      });

      setStep('confirming');
      setTxHash(hash as string);

      // Wait for confirmation
      await waitForTransaction(provider, hash as string);

      setStep('complete');
      onSuccess?.(hash as string);
    } catch (err) {
      console.error('Swap error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      setStep('error');
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getProvider]);

  const reset = useCallback(() => {
    setStep('idle');
    setTxHash(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    step,
    txHash,
    error,
    isLoading,
    executeSwap,
    reset,
  };
}

// Helper to wait for transaction confirmation
async function waitForTransaction(provider: any, txHash: string, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt) {
        if (receipt.status === '0x0') {
          throw new Error('Transaction failed');
        }
        return;
      }
    } catch (err) {
      // Receipt not available yet, continue polling
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Transaction confirmation timeout');
}
