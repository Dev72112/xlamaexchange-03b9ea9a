import { useState, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { trackSwapInitiated, trackSwapCompleted } from '@/lib/tracking';
import { getUserFriendlyErrorMessage } from '@/lib/api-utils';
import { notificationService } from '@/services/notificationService';

export type SwapStep = 'idle' | 'checking-allowance' | 'approving' | 'swapping' | 'confirming' | 'complete' | 'error';

interface UseDexSwapOptions {
  chain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  amount: string;
  slippage: string;
  approveAmount?: string; // Custom approval amount from AllowanceModal
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

// ERC20 ABI for allowance check
const ERC20_ALLOWANCE_ABI = '0xdd62ed3e'; // allowance(address,address)

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  // Remove leading zeros but keep at least "0"
  return combined.replace(/^0+/, '') || '0';
}

export function useDexSwap() {
  const { activeAddress: address, getEvmProvider, isConnected } = useMultiWallet();
  const { toast } = useToast();
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
    approveAmount,
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
    setStep('idle');

    try {
      const provider = await getEvmProvider();
      if (!provider) throw new Error('No provider available');

      // Convert amount to smallest unit without scientific notation
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      const isNativeToken = fromToken.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

      // For non-native tokens, check and handle approval
      if (!isNativeToken) {
        setStep('checking-allowance');
        
        toast({
          title: "Checking Allowance",
          description: "Verifying token approval status...",
        });

        // Get approval transaction info to find spender address
        const approveData = await okxDexService.getApproveTransaction(
          chain.chainIndex,
          fromToken.tokenContractAddress,
          amountInSmallestUnit
        );

        if (approveData && approveData.dexContractAddress) {
          // Check current allowance using eth_call
          const spenderAddress = approveData.dexContractAddress.toLowerCase().replace('0x', '');
          const ownerAddress = address.toLowerCase().replace('0x', '');
          
          // Encode allowance(owner, spender) call
          const allowanceData = ERC20_ALLOWANCE_ABI + 
            ownerAddress.padStart(64, '0') + 
            spenderAddress.padStart(64, '0');

          try {
            const allowanceResult = await provider.request({
              method: 'eth_call',
              params: [{
                to: fromToken.tokenContractAddress,
                data: allowanceData,
              }, 'latest'],
            });

            const currentAllowance = BigInt(allowanceResult || '0x0');
            const requiredAmount = BigInt(amountInSmallestUnit);

            // If current allowance is less than required, request approval
            if (currentAllowance < requiredAmount) {
              setStep('approving');
              
              toast({
                title: "Approval Required",
                description: `Please approve ${fromToken.tokenSymbol} spending in your wallet`,
              });

              // Send approval transaction
              const approveTxHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                  from: address,
                  to: fromToken.tokenContractAddress,
                  data: approveData.data,
                  gas: approveData.gasLimit ? `0x${parseInt(approveData.gasLimit).toString(16)}` : undefined,
                }],
              });

              toast({
                title: "Approval Submitted",
                description: "Waiting for confirmation...",
              });

              // Wait for approval confirmation
              await waitForTransaction(provider, approveTxHash as string);

              toast({
                title: "Approval Confirmed",
                description: `${fromToken.tokenSymbol} approved for spending`,
              });
            }
          } catch (allowanceError) {
            console.error('Error checking allowance:', allowanceError);
            // If we can't check allowance, try to approve anyway
            if (approveData.data) {
              setStep('approving');
              
              toast({
                title: "Approval Required",
                description: `Please approve ${fromToken.tokenSymbol} spending in your wallet`,
              });

              const approveTxHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                  from: address,
                  to: fromToken.tokenContractAddress,
                  data: approveData.data,
                  gas: approveData.gasLimit ? `0x${parseInt(approveData.gasLimit).toString(16)}` : undefined,
                }],
              });

              await waitForTransaction(provider, approveTxHash as string);
            }
          }
        }
      }

      setStep('swapping');
      
      // Track swap initiated
      trackSwapInitiated('dex', chain.name, fromToken.tokenSymbol, toToken.tokenSymbol);
      
      toast({
        title: "Preparing Swap",
        description: "Getting best route...",
      });

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
        throw new Error('Failed to get swap transaction data. Try adjusting slippage or amount.');
      }

      toast({
        title: "Confirm Swap",
        description: "Please confirm the transaction in your wallet",
      });

      // Prepare transaction value
      let txValue = '0x0';
      if (swapData.tx.value) {
        try {
          // Handle both decimal and hex formats
          const valueStr = swapData.tx.value.toString();
          if (valueStr.startsWith('0x')) {
            txValue = valueStr;
          } else {
            txValue = `0x${BigInt(valueStr).toString(16)}`;
          }
        } catch {
          txValue = '0x0';
        }
      }

      // Send swap transaction
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: swapData.tx.from || address,
          to: swapData.tx.to,
          value: txValue,
          data: swapData.tx.data,
          gas: swapData.tx.gas ? `0x${parseInt(swapData.tx.gas).toString(16)}` : undefined,
        }],
      });

      setStep('confirming');
      setTxHash(hash as string);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for confirmation
      await waitForTransaction(provider, hash as string);

      setStep('complete');
      
      // Track swap completed
      trackSwapCompleted('dex', chain.name, fromToken.tokenSymbol, toToken.tokenSymbol);
      
      // Push to Notification Center
      notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, hash as string);
      
      toast({
        title: "Swap Complete! 🎉",
        description: `Successfully swapped ${amount} ${fromToken.tokenSymbol} for ${toToken.tokenSymbol}`,
      });
      
      onSuccess?.(hash as string);
    } catch (err: any) {
      console.error('Swap error:', err);
      
      // Use the centralized error message handler
      const errorMessage = getUserFriendlyErrorMessage(err);
      
      setError(errorMessage);
      setStep('error');
      
      // Push failure to Notification Center
      notificationService.notifySwapFailed(fromToken.tokenSymbol, toToken.tokenSymbol, errorMessage);
      
      toast({
        title: "Swap Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getEvmProvider, toast]);

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
          throw new Error('Transaction failed on chain');
        }
        return;
      }
    } catch (err: any) {
      if (err.message?.includes('failed')) {
        throw err;
      }
      // Receipt not available yet, continue polling
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Transaction confirmation timeout');
}
