import { useState, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';

export type BridgeStep = 'idle' | 'getting-quote' | 'approving' | 'bridging' | 'confirming' | 'complete' | 'error';

interface BridgeQuote {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedTime: string;
  bridgeFee: string;
  routes: any[];
}

interface UseDexBridgeOptions {
  fromChain: Chain;
  toChain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  amount: string;
  slippage: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function useDexBridge() {
  const { address, getProvider, isConnected } = useWallet();
  const { toast } = useToast();
  const [step, setStep] = useState<BridgeStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bridgeQuote, setBridgeQuote] = useState<BridgeQuote | null>(null);

  const getBridgeQuote = useCallback(async ({
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount,
    slippage,
  }: Omit<UseDexBridgeOptions, 'onSuccess' | 'onError'>) => {
    if (!isConnected || !address) {
      return null;
    }

    setIsLoading(true);
    setError(null);
    setStep('getting-quote');

    try {
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);

      // Call cross-chain quote endpoint
      const quote = await okxDexService.getCrossChainQuote(
        fromChain.chainIndex,
        toChain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage,
        address
      );

      if (quote) {
        setBridgeQuote(quote);
        setStep('idle');
        return quote;
      }

      return null;
    } catch (err: any) {
      console.error('Bridge quote error:', err);
      setError(err.message || 'Failed to get bridge quote');
      setStep('error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const executeBridge = useCallback(async ({
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount,
    slippage,
    onSuccess,
    onError,
  }: UseDexBridgeOptions) => {
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

      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toFixed(0);

      const isNativeToken = fromToken.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

      // Handle token approval if needed
      if (!isNativeToken) {
        setStep('approving');
        
        toast({
          title: "Checking Approval",
          description: "Verifying token approval for bridge...",
        });

        const approveData = await okxDexService.getApproveTransaction(
          fromChain.chainIndex,
          fromToken.tokenContractAddress,
          amountInSmallestUnit
        );

        if (approveData && approveData.data) {
          toast({
            title: "Approval Required",
            description: `Please approve ${fromToken.tokenSymbol} for bridging`,
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

          toast({
            title: "Approval Confirmed",
            description: `${fromToken.tokenSymbol} approved for bridging`,
          });
        }
      }

      setStep('bridging');

      toast({
        title: "Preparing Bridge",
        description: `Bridging from ${fromChain.name} to ${toChain.name}...`,
      });

      // Get cross-chain swap data
      const bridgeData = await okxDexService.getCrossChainSwap(
        fromChain.chainIndex,
        toChain.chainIndex,
        fromToken.tokenContractAddress,
        toToken.tokenContractAddress,
        amountInSmallestUnit,
        slippage,
        address,
        address // receiveAddress same as sender
      );

      if (!bridgeData?.tx) {
        throw new Error('Failed to get bridge transaction data');
      }

      toast({
        title: "Confirm Bridge",
        description: "Please confirm the transaction in your wallet",
      });

      let txValue = '0x0';
      if (bridgeData.tx.value) {
        const valueStr = bridgeData.tx.value.toString();
        txValue = valueStr.startsWith('0x') ? valueStr : `0x${BigInt(valueStr).toString(16)}`;
      }

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: bridgeData.tx.from || address,
          to: bridgeData.tx.to,
          value: txValue,
          data: bridgeData.tx.data,
          gas: bridgeData.tx.gas ? `0x${parseInt(bridgeData.tx.gas).toString(16)}` : undefined,
        }],
      });

      setStep('confirming');
      setTxHash(hash as string);

      toast({
        title: "Bridge Transaction Submitted",
        description: `Cross-chain transfer initiated. Estimated time: ${bridgeQuote?.estimatedTime || '5-10 min'}`,
      });

      await waitForTransaction(provider, hash as string);

      setStep('complete');

      toast({
        title: "Bridge Complete! 🌉",
        description: `Successfully bridged ${amount} ${fromToken.tokenSymbol} to ${toChain.name}`,
      });

      onSuccess?.(hash as string);
    } catch (err: any) {
      console.error('Bridge error:', err);

      let errorMessage = 'Bridge failed';
      if (err.code === 4001 || err.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message) {
        errorMessage = err.message.slice(0, 100);
      }

      setError(errorMessage);
      setStep('error');

      toast({
        title: "Bridge Failed",
        description: errorMessage,
        variant: "destructive",
      });

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getProvider, toast, bridgeQuote]);

  const reset = useCallback(() => {
    setStep('idle');
    setTxHash(null);
    setError(null);
    setIsLoading(false);
    setBridgeQuote(null);
  }, []);

  return {
    step,
    txHash,
    error,
    isLoading,
    bridgeQuote,
    getBridgeQuote,
    executeBridge,
    reset,
  };
}

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
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Transaction confirmation timeout');
}
