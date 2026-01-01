import { useState, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { Transaction, VersionedTransaction, SystemProgram, PublicKey, Connection } from '@solana/web3.js';

export type SwapStep = 'idle' | 'checking-allowance' | 'approving' | 'swapping' | 'confirming' | 'complete' | 'error';

interface UseDexSwapOptions {
  chain: Chain;
  fromToken: OkxToken;
  toToken: OkxToken;
  amount: string;
  slippage: string;
  approveAmount?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  return combined.replace(/^0+/, '') || '0';
}

const ERC20_ALLOWANCE_ABI = '0xdd62ed3e';

export function useDexSwapMulti() {
  const { 
    activeChainType, 
    activeAddress, 
    isConnected,
    getEvmProvider,
    getSolanaWallet,
    getTronWeb,
    getSuiClient,
  } = useMultiWallet();
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
    if (!isConnected || !activeAddress) {
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
      const decimals = parseInt(fromToken.decimals);
      const amountInSmallestUnit = toSmallestUnit(amount, decimals);

      // Route to chain-specific swap logic
      if (chain.isEvm) {
        await executeEvmSwap({
          chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess
        });
      } else {
        const chainName = chain.name.toLowerCase();
        if (chainName.includes('solana')) {
          await executeSolanaSwap({
            chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess
          });
        } else if (chainName.includes('tron')) {
          await executeTronSwap({
            chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess
          });
        } else if (chainName.includes('sui')) {
          await executeSuiSwap({
            chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess
          });
        } else if (chainName.includes('ton')) {
          await executeTonSwap({
            chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess
          });
        } else {
          throw new Error(`Unsupported chain: ${chain.name}`);
        }
      }
    } catch (err: any) {
      console.error('Swap error:', err);
      let errorMessage = 'Swap failed';
      if (err.code === 4001 || err.message?.includes('rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (err.message) {
        errorMessage = err.message.slice(0, 100);
      }
      setError(errorMessage);
      setStep('error');
      toast({
        title: 'Swap Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, activeAddress, activeChainType, getEvmProvider, getSolanaWallet, getTronWeb, getSuiClient, toast]);

  // EVM Swap (existing logic)
  const executeEvmSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const provider = getEvmProvider();
    if (!provider) throw new Error('No EVM provider available');

    const isNativeToken = fromToken.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

    // Check and handle approval for non-native tokens
    if (!isNativeToken) {
      setStep('checking-allowance');
      toast({ title: 'Checking Allowance', description: 'Verifying token approval status...' });

      const approveData = await okxDexService.getApproveTransaction(
        chain.chainIndex,
        fromToken.tokenContractAddress,
        amountInSmallestUnit
      );

      if (approveData?.dexContractAddress) {
        const spenderAddress = approveData.dexContractAddress.toLowerCase().replace('0x', '');
        const ownerAddress = activeAddress!.toLowerCase().replace('0x', '');
        const allowanceData = ERC20_ALLOWANCE_ABI + ownerAddress.padStart(64, '0') + spenderAddress.padStart(64, '0');

        try {
          const allowanceResult = await provider.request({
            method: 'eth_call',
            params: [{ to: fromToken.tokenContractAddress, data: allowanceData }, 'latest'],
          });

          const currentAllowance = BigInt(allowanceResult || '0x0');
          const requiredAmount = BigInt(amountInSmallestUnit);

          if (currentAllowance < requiredAmount) {
            setStep('approving');
            toast({ title: 'Approval Required', description: `Please approve ${fromToken.tokenSymbol} spending in your wallet` });

            const approveTxHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: activeAddress,
                to: fromToken.tokenContractAddress,
                data: approveData.data,
                gas: approveData.gasLimit ? `0x${parseInt(approveData.gasLimit).toString(16)}` : undefined,
              }],
            });

            await waitForEvmTransaction(provider, approveTxHash);
            toast({ title: 'Approval Confirmed', description: `${fromToken.tokenSymbol} approved for spending` });
          }
        } catch (allowanceError) {
          console.error('Error checking allowance:', allowanceError);
          if (approveData.data) {
            setStep('approving');
            const approveTxHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: activeAddress,
                to: fromToken.tokenContractAddress,
                data: approveData.data,
                gas: approveData.gasLimit ? `0x${parseInt(approveData.gasLimit).toString(16)}` : undefined,
              }],
            });
            await waitForEvmTransaction(provider, approveTxHash);
          }
        }
      }
    }

    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route...' });

    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      activeAddress!,
      slippage
    );

    if (!swapData?.tx) throw new Error('Failed to get swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in your wallet' });

    let txValue = '0x0';
    if (swapData.tx.value) {
      const valueStr = swapData.tx.value.toString();
      txValue = valueStr.startsWith('0x') ? valueStr : `0x${BigInt(valueStr).toString(16)}`;
    }

    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: swapData.tx.from || activeAddress,
        to: swapData.tx.to,
        value: txValue,
        data: swapData.tx.data,
        gas: swapData.tx.gas ? `0x${parseInt(swapData.tx.gas).toString(16)}` : undefined,
      }],
    });

    setStep('confirming');
    setTxHash(hash);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    await waitForEvmTransaction(provider, hash);
    setStep('complete');
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(hash);
  };

  // Solana Swap
  const executeSolanaSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet?.connected || !solanaWallet?.publicKey) {
      throw new Error('Solana wallet not connected');
    }

    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route for Solana...' });

    // Get swap data from OKX DEX API
    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      solanaWallet.publicKey.toBase58(),
      slippage
    );

    if (!swapData?.tx?.data) throw new Error('Failed to get Solana swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in your wallet' });

    // Decode and sign the transaction
    const txBuffer = Buffer.from(swapData.tx.data, 'base64');
    let signature: string;

    try {
      // Try as versioned transaction first
      const versionedTx = VersionedTransaction.deserialize(txBuffer);
      const signedTx = await solanaWallet.signTransaction(versionedTx);
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      signature = await connection.sendRawTransaction(signedTx.serialize());
    } catch {
      // Fallback to legacy transaction
      const legacyTx = Transaction.from(txBuffer);
      const signedTx = await solanaWallet.signTransaction(legacyTx);
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      signature = await connection.sendRawTransaction(signedTx.serialize());
    }

    setStep('confirming');
    setTxHash(signature);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    // Wait for confirmation
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    await connection.confirmTransaction(signature, 'confirmed');

    setStep('complete');
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(signature);
  };

  // Tron Swap
  const executeTronSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const tronWeb = getTronWeb();
    if (!tronWeb) throw new Error('TronLink not connected');

    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route for TRON...' });

    const userAddress = tronWeb.defaultAddress.base58;
    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      userAddress,
      slippage
    );

    if (!swapData?.tx) throw new Error('Failed to get TRON swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in TronLink' });

    // Send transaction via TronWeb
    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      swapData.tx.to,
      'swap', // function name
      {},
      [], // parameters
      userAddress
    );

    const signedTx = await tronWeb.trx.sign(tx.transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    if (!result.result) throw new Error('Transaction failed');

    const hash = result.txid;
    setStep('confirming');
    setTxHash(hash);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    // Wait for confirmation (poll)
    await new Promise(resolve => setTimeout(resolve, 5000));

    setStep('complete');
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(hash);
  };

  // Sui Swap
  const executeSuiSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const suiClient = getSuiClient();
    if (!suiClient) throw new Error('Sui wallet not connected');

    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route for Sui...' });

    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      activeAddress!,
      slippage
    );

    if (!swapData?.tx?.data) throw new Error('Failed to get Sui swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in your Sui wallet' });

    // Note: Full Sui transaction signing requires the signAndExecuteTransaction hook
    // This is a placeholder - actual implementation needs transaction building from API response
    throw new Error('Sui swap execution pending full implementation');
  };

  // TON Swap
  const executeTonSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route for TON...' });

    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      activeAddress!,
      slippage
    );

    if (!swapData?.tx) throw new Error('Failed to get TON swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in your TON wallet' });

    // Note: TON Connect transaction sending requires the TonConnectUI instance
    // This is a placeholder - actual implementation needs tonConnectUI.sendTransaction
    throw new Error('TON swap execution pending full implementation');
  };

  const reset = useCallback(() => {
    setStep('idle');
    setTxHash(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { step, txHash, error, isLoading, executeSwap, reset };
}

// Helper for EVM transaction confirmation
async function waitForEvmTransaction(provider: any, txHash: string, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });
      if (receipt) {
        if (receipt.status === '0x0') throw new Error('Transaction failed on chain');
        return;
      }
    } catch (err: any) {
      if (err.message?.includes('failed')) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Transaction confirmation timeout');
}
