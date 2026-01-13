import { useState, useCallback } from 'react';
import { okxDexService, OkxToken } from '@/services/okxdex';
import { Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { Transaction, VersionedTransaction, Connection } from '@solana/web3.js';
import { useAppKitProvider } from '@reown/appkit/react';
import bs58 from 'bs58';
import { getSolanaRpcEndpoints } from '@/config/rpc';
import { notificationService } from '@/services/notificationService';

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

// OKX returns base58-encoded transaction data for Solana (NOT base64!)
function decodeBase58ToBytes(encoded: string): Uint8Array {
  return bs58.decode(encoded);
}

const ERC20_ALLOWANCE_ABI = '0xdd62ed3e';

export function useDexSwapMulti() {
  const { 
    activeChainType, 
    activeAddress, 
    isConnected,
    solanaAddress,
    getEvmProvider,
    getSolanaWallet,
    getTronWeb,
    getSuiClient,
    getTonConnectUI,
    signAndExecuteSuiTransaction,
  } = useMultiWallet();
  
  // Get Solana provider from AppKit as fallback
  const { walletProvider: appKitSolanaProvider } = useAppKitProvider<any>('solana');
  
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
  }, [isConnected, activeAddress, activeChainType, getEvmProvider, solanaAddress, getSolanaWallet, appKitSolanaProvider, getTronWeb, getSuiClient, getTonConnectUI, signAndExecuteSuiTransaction, toast]);

  // EVM Swap (existing logic)
  const executeEvmSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const provider = await getEvmProvider();
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
    notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, hash);
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(hash);
  };

  // Solana Swap - prioritizes OKX injected provider, falls back to AppKit
  const executeSolanaSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    if (!solanaAddress) {
      throw new Error('Solana wallet not connected');
    }

    // Get Solana wallet provider - prioritize OKX injected wallet
    const okxSolanaWallet = getSolanaWallet();
    const provider = okxSolanaWallet || appKitSolanaProvider;
    
    if (!provider) {
      throw new Error('No Solana wallet provider available. Please connect OKX Wallet or Phantom.');
    }

    setStep('swapping');
    toast({ title: 'Preparing Swap', description: 'Getting best route for Solana...' });

    // Get swap data from OKX DEX API
    const swapData = await okxDexService.getSwapData(
      chain.chainIndex,
      fromToken.tokenContractAddress,
      toToken.tokenContractAddress,
      amountInSmallestUnit,
      solanaAddress,
      slippage
    );

    if (!swapData?.tx?.data) throw new Error('Failed to get Solana swap transaction data');

    toast({ title: 'Confirm Swap', description: 'Please confirm the transaction in your wallet' });

    // CRITICAL: OKX returns base58-encoded transaction data for Solana
    const txBytes = decodeBase58ToBytes(swapData.tx.data);
    let signature: string;
    
    // Use Alchemy RPC ONLY (no public fallbacks for easier debugging)
    const SOLANA_RPC_ENDPOINTS = getSolanaRpcEndpoints(chain.rpcUrl);
    
    // Check if Alchemy is configured - fail fast with clear message
    if (SOLANA_RPC_ENDPOINTS.length === 0) {
      throw new Error(
        'Alchemy RPC not configured. To fix: 1) Add VITE_ALCHEMY_API_KEY in Lovable Cloud secrets, 2) Click Publish → Update to rebuild the app.'
      );
    }
    
    const rpcUrl = SOLANA_RPC_ENDPOINTS[0]; // Only Alchemy, no fallback loop
    let connection: Connection;
    let latestBlockhash: { blockhash: string; lastValidBlockHeight: number };
    
    try {
      connection = new Connection(rpcUrl, 'confirmed');
      latestBlockhash = await connection.getLatestBlockhash('finalized');
      console.log('[Solana] Connected to Alchemy RPC');
    } catch (rpcError: any) {
      const errorMsg = rpcError?.message || '';
      const status = rpcError?.status || rpcError?.statusCode;
      
      console.error('[Alchemy RPC] Connection failed:', {
        error: errorMsg.slice(0, 100),
        status,
      });
      
      // Provide specific, actionable error messages
      if (status === 401 || status === 403 || errorMsg.includes('401') || errorMsg.includes('403')) {
        throw new Error(
          'Alchemy API key rejected (401/403). Please verify: 1) The key is correct, 2) Solana is enabled in your Alchemy dashboard.'
        );
      }
      if (status === 429 || errorMsg.includes('429')) {
        throw new Error('Alchemy rate limited (429). Please wait a moment and try again.');
      }
      
      throw new Error(`Solana RPC connection failed: ${errorMsg.slice(0, 80)}`);
    }

    try {
      // Try as versioned transaction first
      const versionedTx = VersionedTransaction.deserialize(txBytes);
      // Update blockhash for freshness
      versionedTx.message.recentBlockhash = latestBlockhash.blockhash;

      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(versionedTx);
        signature = typeof result === 'string' ? result : result.signature;
      } else if (provider.signTransaction) {
        const signedTx = await provider.signTransaction(versionedTx);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      } else {
        throw new Error('Solana wallet does not support transaction signing');
      }
    } catch (versionedErr: any) {
      // Only fallback to legacy if it's a deserialization error, not a user rejection
      if (versionedErr?.message?.includes('rejected') || versionedErr?.code === 4001) {
        throw versionedErr;
      }
      
      console.log('Falling back to legacy transaction:', versionedErr?.message);
      
      // Fallback to legacy transaction
      const legacyTx = Transaction.from(txBytes);

      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(legacyTx);
        signature = typeof result === 'string' ? result : result.signature;
      } else if (provider.signTransaction) {
        const signedTx = await provider.signTransaction(legacyTx);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      } else {
        throw new Error('Solana wallet does not support transaction signing');
      }
    }

    setStep('confirming');
    setTxHash(signature);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    setStep('complete');
    notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, signature);
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(signature);
  };

  // Tron Swap - Fixed implementation using raw transaction data from OKX
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

    // OKX returns { to, data, value } - use triggerSmartContract with raw calldata
    const txParams = {
      feeLimit: parseInt(swapData.tx.gas) || 150000000, // ~150 TRX default
      callValue: parseInt(swapData.tx.value) || 0,
    };

    // Build transaction with the contract call data from OKX
    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      swapData.tx.to,
      'swap(bytes)', // OKX uses a generic swap function
      txParams,
      [{ type: 'bytes', value: swapData.tx.data.replace('0x', '') }],
      userAddress
    );

    if (!tx.result?.result) {
      // Fallback: try sending as raw transaction if OKX provides complete tx
      const txData = swapData.tx as any;
      if (txData.signedTx) {
        const result = await tronWeb.trx.sendRawTransaction(txData.signedTx);
        if (!result.result) throw new Error(`Transaction failed: ${result.code || 'Unknown'}`);
        setTxHash(result.txid);
        setStep('confirming');
        await waitForTronConfirmation(tronWeb, result.txid);
        setStep('complete');
        notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, result.txid);
        toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
        onSuccess?.(result.txid);
        return;
      }
      throw new Error('Failed to build TRON transaction');
    }

    const signedTx = await tronWeb.trx.sign(tx.transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    if (!result.result) throw new Error(`Transaction failed: ${result.code || 'Unknown error'}`);

    const hash = result.txid;
    setStep('confirming');
    setTxHash(hash);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    await waitForTronConfirmation(tronWeb, hash);

    setStep('complete');
    notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, hash);
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(hash);
  };

  // Sui Swap - Full implementation using signAndExecuteTransaction
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

    // OKX returns base64 encoded transaction bytes
    // Use the signAndExecuteTransaction from context
    const txBytes = Uint8Array.from(atob(swapData.tx.data), c => c.charCodeAt(0));
    
    // Create transaction block from bytes
    const { Transaction } = await import('@mysten/sui/transactions');
    const transaction = Transaction.from(txBytes);

    const result = await signAndExecuteSuiTransaction(transaction);
    
    const digest = result.digest;
    setStep('confirming');
    setTxHash(digest);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    // Wait for transaction confirmation
    await suiClient.waitForTransaction({ digest, options: { showEffects: true } });

    setStep('complete');
    notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, digest);
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(digest);
  };

  // TON Swap - Full implementation using TonConnectUI
  const executeTonSwap = async ({ chain, fromToken, toToken, amount, amountInSmallestUnit, slippage, onSuccess }: any) => {
    const tonConnectUI = getTonConnectUI();
    if (!tonConnectUI) throw new Error('TON wallet not connected');

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

    // Build TON transaction message for TonConnect
    // OKX returns: { to, value, data } where data is base64 encoded Cell
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
      messages: [
        {
          address: swapData.tx.to,
          amount: swapData.tx.value?.toString() || '0', // in nanotons
          payload: swapData.tx.data, // base64 encoded BOC
        }
      ]
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    
    // Result contains boc (Bag of Cells) which is the transaction identifier
    const txHash = result.boc;
    
    setStep('confirming');
    setTxHash(txHash);
    toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

    // TON doesn't have synchronous confirmation - wait briefly for propagation
    await new Promise(resolve => setTimeout(resolve, 8000));

    setStep('complete');
    notificationService.notifySwapComplete(fromToken.tokenSymbol, toToken.tokenSymbol, amount, txHash);
    toast({ title: 'Swap Complete! 🎉', description: `Successfully swapped ${amount} ${fromToken.tokenSymbol}` });
    onSuccess?.(txHash);
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

// Helper for Tron transaction confirmation
async function waitForTronConfirmation(tronWeb: any, txHash: string, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const info = await tronWeb.trx.getTransactionInfo(txHash);
      if (info && info.id) {
        if (info.receipt?.result === 'FAILED') {
          throw new Error('Transaction failed on chain');
        }
        return;
      }
    } catch (err: any) {
      if (err.message?.includes('failed')) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  // Don't throw on timeout for Tron - tx may still confirm
  console.warn('Tron transaction confirmation timeout - tx may still be processing');
}
