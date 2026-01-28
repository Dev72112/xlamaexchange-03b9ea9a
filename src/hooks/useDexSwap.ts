import { useState, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { trackSwapInitiated, trackSwapCompleted } from '@/lib/tracking';
import { getUserFriendlyErrorMessage } from '@/lib/api-utils';
import { notificationService } from '@/services/notificationService';
import { usePriceOracleOptional } from '@/contexts/PriceOracleContext';
import { sendSwapWebhook } from '@/services/xlamaWebhook';

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
  const priceOracle = usePriceOracleOptional();
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

      // Capture token prices in oracle for P&L tracking
      if (priceOracle && swapData.routerResult) {
        const routerResult = swapData.routerResult as any;
        if (routerResult.fromTokenUnitPrice) {
          priceOracle.setPrice(
            chain.chainIndex,
            fromToken.tokenContractAddress,
            fromToken.tokenSymbol,
            parseFloat(routerResult.fromTokenUnitPrice)
          );
        }
        if (routerResult.toTokenUnitPrice) {
          priceOracle.setPrice(
            chain.chainIndex,
            toToken.tokenContractAddress,
            toToken.tokenSymbol,
            parseFloat(routerResult.toTokenUnitPrice)
          );
        }
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
      
      // Calculate USD values for webhook
      const routerResult = swapData.routerResult as any;
      const fromTokenPrice = routerResult?.fromTokenUnitPrice ? parseFloat(routerResult.fromTokenUnitPrice) : 0;
      const toTokenPrice = routerResult?.toTokenUnitPrice ? parseFloat(routerResult.toTokenUnitPrice) : 0;
      
      const fromUsdValue = fromTokenPrice * parseFloat(amount);
      
      // Calculate output amount in human units
      const toTokenDecimals = parseInt(toToken.decimals);
      const toAmountRaw = routerResult?.toTokenAmount || '0';
      const toAmountHuman = parseFloat(toAmountRaw) / Math.pow(10, toTokenDecimals);
      const toUsdValue = toTokenPrice * toAmountHuman;
      
      // Calculate gas fee in USD
      // gas = gas limit in units, we need gas price to convert to native token cost
      const gasLimit = parseInt(swapData.tx?.gas || '0');
      const gasPrice = parseFloat(routerResult?.estimateGasFee || '0'); // in native token units
      
      // Native token price approximation - fetch from router result if available
      // OKX usually returns native token price in the swap response
      const nativeSymbol = chain.nativeCurrency?.symbol || 'ETH';
      const nativeTokenPriceFromRoute = routerResult?.fromToken?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        ? fromTokenPrice : (routerResult?.toToken?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? toTokenPrice : 0);
      
      // Use a default approximate price if not found (will be improved by backend enrichment)
      const gasFeeNative = gasPrice > 0 ? gasPrice : (gasLimit * 30 / 1e9); // fallback: assume 30 gwei
      const gasFeeUsd = gasFeeNative * (nativeTokenPriceFromRoute || 0);
      
      // Send webhook to xLama backend for real-time sync (fire and forget)
      sendSwapWebhook({
        event: 'swap.completed',
        source: 'xlamaexchange',
        data: {
          tx_hash: hash as string,
          wallet_address: address,
          chain_id: chain.chainIndex,
          token_in_symbol: fromToken.tokenSymbol,
          token_in_amount: amount,
          token_in_usd_value: fromUsdValue,
          token_out_symbol: toToken.tokenSymbol,
          token_out_amount: toAmountHuman.toString(),
          token_out_usd_value: toUsdValue,
          gas_fee: gasFeeNative.toString(),
          gas_fee_usd: gasFeeUsd,
          slippage,
          status: 'completed',
        },
      }).catch(err => console.warn('[Webhook] Failed to send:', err));
      
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
