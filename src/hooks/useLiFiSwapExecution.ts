import { useState, useCallback } from 'react';
import { lifiService, LiFiQuoteResult } from '@/services/lifi';
import { Chain } from '@/data/chains';
import { useBridgeTransactions } from '@/contexts/BridgeTransactionContext';
import { useBridgeSettings } from '@/hooks/useBridgeSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { createSignedBridgeRequest } from '@/lib/requestSigning';
import { supabase } from '@/integrations/supabase/client';
import type { Route } from '@lifi/sdk';

export type BridgeStatus = 
  | 'idle'
  | 'checking-approval'
  | 'awaiting-approval'
  | 'approving'
  | 'pending-source'
  | 'bridging'
  | 'completed'
  | 'failed';

export interface ApprovalInfo {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenLogoURI: string;
  spenderAddress: string;
  requiredAmount: string;
  currentAllowance: string;
  chainId: number;
}

export interface LiFiBridgeTransaction {
  id: string;
  status: BridgeStatus;
  fromChain: Chain;
  toChain: Chain;
  fromToken: {
    symbol: string;
    logoURI: string;
    address: string;
    decimals: number;
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
  approvalInfo?: ApprovalInfo;
}

interface UseLiFiSwapExecutionOptions {
  fromChain: Chain;
  toChain: Chain;
  quote: LiFiQuoteResult;
  userAddress: string;
  selectedRoute?: Route; // Optional: use a specific route instead of default quote route
  estimatedValueUsd?: number; // For signature threshold check
}

// Max uint256 for unlimited approval
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export function useLiFiSwapExecution() {
  const [transactions, setTransactions] = useState<LiFiBridgeTransaction[]>([]);
  const [currentTx, setCurrentTx] = useState<LiFiBridgeTransaction | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ApprovalInfo | null>(null);
  const [isSigningIntent, setIsSigningIntent] = useState(false);
  const { addTransaction, updateTransaction: updateGlobalTx } = useBridgeTransactions();
  const { settings: bridgeSettings, shouldRequireSignature } = useBridgeSettings();
  const { activeAddress } = useMultiWallet();
  const { showNotification, isSubscribed: pushEnabled } = usePushNotifications(activeAddress);

  const updateTransaction = useCallback((id: string, updates: Partial<LiFiBridgeTransaction>) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    ));
    setCurrentTx(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, []);

  // Send push notification for bridge completion/failure
  const sendBridgeNotification = useCallback(async (
    type: 'bridge_completed' | 'bridge_failed',
    tx: LiFiBridgeTransaction,
    destTxHash?: string,
    errorMessage?: string
  ) => {
    // Show local notification if push enabled
    if (bridgeSettings.pushNotificationsEnabled && pushEnabled) {
      if (type === 'bridge_completed') {
        showNotification('🎉 Bridge Complete!', {
          body: `${tx.fromAmount} ${tx.fromToken.symbol} → ${tx.toAmount} ${tx.toToken.symbol}`,
          tag: `bridge-${destTxHash?.slice(0, 8) || Date.now()}`,
        });
      } else {
        showNotification('❌ Bridge Failed', {
          body: errorMessage || `Failed to bridge ${tx.fromToken.symbol}`,
          tag: `bridge-failed-${Date.now()}`,
        });
      }
    }

    // Also try server-side push (for when app is closed)
    try {
      await supabase.functions.invoke('send-bridge-notification', {
        body: {
          walletAddress: activeAddress,
          type,
          fromToken: tx.fromToken.symbol,
          toToken: tx.toToken.symbol,
          fromAmount: tx.fromAmount,
          toAmount: tx.toAmount,
          fromChain: tx.fromChain.name,
          toChain: tx.toChain.name,
          txHash: destTxHash || tx.sourceTxHash,
          error: errorMessage,
        },
      });
    } catch (err) {
      console.error('Failed to send server push notification:', err);
    }
  }, [bridgeSettings.pushNotificationsEnabled, pushEnabled, showNotification, activeAddress]);

  const startStatusPolling = useCallback((
    txId: string, 
    globalTxId: string,
    params: { txHash: string; fromChainId: number; toChainId: number; bridge?: string },
    txRef: LiFiBridgeTransaction
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
          updateGlobalTx(globalTxId, {
            status: 'completed',
            destTxHash: status.receiving?.txHash,
            completedTime: Date.now(),
          });
          
          // Send push notification
          sendBridgeNotification('bridge_completed', txRef, status.receiving?.txHash);
          
          clearInterval(pollInterval);
        } else if (status.status === 'FAILED') {
          const errorMsg = status.substatus || 'Bridge transaction failed';
          updateTransaction(txId, { 
            status: 'failed',
            error: errorMsg,
          });
          updateGlobalTx(globalTxId, {
            status: 'failed',
            error: errorMsg,
          });
          
          // Send push notification
          sendBridgeNotification('bridge_failed', txRef, undefined, errorMsg);
          
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 10000);

    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
    return pollInterval;
  }, [updateTransaction, updateGlobalTx, sendBridgeNotification]);

  // Sign bridge intent for audit trail
  const signBridgeIntent = useCallback(async (
    fromChainId: number,
    toChainId: number,
    quote: LiFiQuoteResult,
    fromAmount: string,
    toAmount: string,
    bridgeProvider?: string
  ): Promise<string | null> => {
    setIsSigningIntent(true);
    try {
      const signedRequest = await createSignedBridgeRequest(
        {
          from_chain_id: fromChainId,
          to_chain_id: toChainId,
          from_token_address: quote.fromToken.address,
          to_token_address: quote.toToken.address,
          from_token_symbol: quote.fromToken.symbol,
          to_token_symbol: quote.toToken.symbol,
          from_amount: fromAmount,
          to_amount_expected: toAmount,
          bridge_provider: bridgeProvider,
        },
        'evm' // Bridge is EVM-only via Li.Fi
      );

      if (!signedRequest) {
        console.warn('User cancelled bridge signing');
        return null;
      }

      // Record the intent on the server
      const { data, error } = await supabase.functions.invoke('signed-orders', {
        body: {
          action: 'create-bridge-intent',
          order: {
            from_chain_id: fromChainId,
            to_chain_id: toChainId,
            from_token_address: quote.fromToken.address,
            to_token_address: quote.toToken.address,
            from_token_symbol: quote.fromToken.symbol,
            to_token_symbol: quote.toToken.symbol,
            from_amount: fromAmount,
            to_amount_expected: toAmount,
            bridge_provider: bridgeProvider,
          },
          signature: signedRequest.signature,
          timestamp: signedRequest.timestamp,
          nonce: signedRequest.nonce,
          walletAddress: activeAddress,
          chainType: 'evm',
          payload: signedRequest.payload,
        },
      });

      if (error) {
        console.error('Failed to record bridge intent:', error);
        return null;
      }

      return data?.intent?.id || null;
    } catch (err) {
      console.error('Bridge signing error:', err);
      return null;
    } finally {
      setIsSigningIntent(false);
    }
  }, [activeAddress]);

  const executeSwap = useCallback(async (
    options: UseLiFiSwapExecutionOptions,
    sendTransaction: (txData: { to: string; data: string; value: string; chainId: number }) => Promise<string>
  ) => {
    const { fromChain, toChain, quote, selectedRoute, estimatedValueUsd } = options;
    
    // Use selected route if provided, otherwise use default quote route
    const routeToUse = selectedRoute || quote.route;
    
    const txId = `lifi-${Date.now()}`;
    const fromAmount = (parseFloat(quote.fromAmount) / Math.pow(10, quote.fromToken.decimals)).toString();
    const toAmount = (parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toString();
    const fromChainId = lifiService.getChainId(fromChain.chainIndex) || 1;
    const toChainId = lifiService.getChainId(toChain.chainIndex) || 1;

    // Check if signature is required based on settings and amount
    const valueUsd = estimatedValueUsd || 0;
    if (shouldRequireSignature(valueUsd)) {
      const intentId = await signBridgeIntent(
        fromChainId,
        toChainId,
        quote,
        fromAmount,
        toAmount,
        quote.bridgeName
      );

      if (!intentId) {
        throw new Error('Bridge signature cancelled or failed');
      }
      
      console.log('Bridge intent signed:', intentId);
    }
    
    const newTx: LiFiBridgeTransaction = {
      id: txId,
      status: 'checking-approval',
      fromChain,
      toChain,
      fromToken: {
        symbol: quote.fromToken.symbol,
        logoURI: quote.fromToken.logoURI || '',
        address: quote.fromToken.address,
        decimals: quote.fromToken.decimals,
      },
      toToken: {
        symbol: quote.toToken.symbol,
        logoURI: quote.toToken.logoURI || '',
      },
      fromAmount,
      toAmount,
      bridgeName: selectedRoute ? (routeToUse.steps[0]?.toolDetails?.name || quote.bridgeName) : quote.bridgeName,
      estimatedTime: selectedRoute 
        ? routeToUse.steps.reduce((acc, step) => acc + (step.estimate?.executionDuration || 0), 0)
        : quote.estimatedDurationSeconds,
      startTime: Date.now(),
    };

    setTransactions(prev => [newTx, ...prev]);
    setCurrentTx(newTx);

    // Add to global bridge transaction history and get the ID
    const globalTxId = addTransaction({
      status: 'checking-approval',
      fromChain: { chainId: fromChainId, name: fromChain.name, icon: fromChain.icon },
      toChain: { chainId: toChainId, name: toChain.name, icon: toChain.icon },
      fromToken: { symbol: quote.fromToken.symbol, address: quote.fromToken.address, logoURI: quote.fromToken.logoURI },
      toToken: { symbol: quote.toToken.symbol, address: quote.toToken.address, logoURI: quote.toToken.logoURI },
      fromAmount,
      toAmount,
      bridgeName: quote.bridgeName,
      estimatedTime: quote.estimatedDurationSeconds,
    });
    
    // Store globalTxId for later reference
    const globalIdRef = globalTxId;

    try {
      // Get the step from the route (use selected route if provided)
      const step = routeToUse.steps[0];
      
      if (!step) {
        throw new Error('No steps in route');
      }

      // Check if approval is needed for ERC-20 tokens
      const approvalAddress = lifiService.getApprovalAddress(step);
      const fromChainId = lifiService.getChainId(fromChain.chainIndex) || 1;
      
      if (approvalAddress && options.userAddress) {
        const currentAllowance = await lifiService.checkAllowance({
          tokenAddress: quote.fromToken.address,
          ownerAddress: options.userAddress,
          spenderAddress: approvalAddress,
          chainId: fromChainId,
        });

        const requiredAmount = quote.fromAmount;
        
        // Check if allowance is sufficient
        if (BigInt(currentAllowance) < BigInt(requiredAmount)) {
          // Set approval info and wait for user confirmation
          const approvalInfo: ApprovalInfo = {
            tokenAddress: quote.fromToken.address,
            tokenSymbol: quote.fromToken.symbol,
            tokenDecimals: quote.fromToken.decimals,
            tokenLogoURI: quote.fromToken.logoURI || '',
            spenderAddress: approvalAddress,
            requiredAmount,
            currentAllowance,
            chainId: fromChainId,
          };
          
          updateTransaction(txId, { 
            status: 'awaiting-approval',
            approvalInfo,
          });
          setPendingApproval(approvalInfo);
          
          // Return early - approval will be handled by handleApproval
          return { txId, status: 'AWAITING_APPROVAL', approvalInfo };
        }
      }

      // No approval needed or already approved, proceed with swap
      return await executeSwapTransaction(txId, globalIdRef, step, fromChain, toChain, quote, sendTransaction);
    } catch (error: any) {
      console.error('Li.Fi swap execution error:', error);
      updateTransaction(txId, { 
        status: 'failed', 
        error: error?.message || 'Bridge transaction failed' 
      });
      updateGlobalTx(globalIdRef, {
        status: 'failed',
        error: error?.message || 'Bridge transaction failed',
      });
      throw error;
    }
  }, [updateTransaction, addTransaction, updateGlobalTx]);

  const executeSwapTransaction = useCallback(async (
    txId: string,
    globalTxId: string,
    step: any,
    fromChain: Chain,
    toChain: Chain,
    quote: LiFiQuoteResult,
    sendTransaction: (txData: { to: string; data: string; value: string; chainId: number }) => Promise<string>
  ) => {
    updateTransaction(txId, { status: 'pending-source' });
    updateGlobalTx(globalTxId, { status: 'pending-source' });

    // Get the transaction data for this step
    const txData = await lifiService.getStepTransactionData(step);
    
    // Send the transaction using the provided wallet function
    const txHash = await sendTransaction({
      to: txData.to,
      data: txData.data,
      value: txData.value,
      chainId: txData.chainId,
    });

    if (!txHash) {
      throw new Error('Transaction rejected or failed');
    }

    updateTransaction(txId, { 
      sourceTxHash: txHash,
      status: 'bridging'
    });
    
    updateGlobalTx(globalTxId, {
      sourceTxHash: txHash,
      status: 'bridging',
    });

    // Start polling for completion
    startStatusPolling(txId, globalTxId, {
      txHash,
      fromChainId: lifiService.getChainId(fromChain.chainIndex) || 1,
      toChainId: lifiService.getChainId(toChain.chainIndex) || 1,
      bridge: quote.bridgeName,
    }, {
      id: txId,
      status: 'bridging',
      fromChain,
      toChain,
      fromToken: {
        symbol: quote.fromToken.symbol,
        logoURI: quote.fromToken.logoURI || '',
        address: quote.fromToken.address,
        decimals: quote.fromToken.decimals,
      },
      toToken: {
        symbol: quote.toToken.symbol,
        logoURI: quote.toToken.logoURI || '',
      },
      fromAmount: (parseFloat(quote.fromAmount) / Math.pow(10, quote.fromToken.decimals)).toString(),
      toAmount: (parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toString(),
      sourceTxHash: txHash,
      bridgeName: quote.bridgeName,
      startTime: Date.now(),
    });

    return { txHash, status: 'PENDING' };
  }, [updateTransaction, updateGlobalTx, startStatusPolling]);

  const handleApproval = useCallback(async (
    approvalAmount: string, // 'exact', 'unlimited', or specific amount
    sendTransaction: (txData: { to: string; data: string; value: string; chainId: number }) => Promise<string>
  ) => {
    if (!currentTx || !pendingApproval) {
      throw new Error('No pending approval');
    }

    try {
      updateTransaction(currentTx.id, { status: 'approving' });

      // Determine the approval amount
      let amount: string;
      if (approvalAmount === 'unlimited') {
        amount = MAX_UINT256;
      } else if (approvalAmount === 'exact') {
        amount = pendingApproval.requiredAmount;
      } else {
        amount = approvalAmount;
      }

      // Build and send approval transaction
      const approvalTx = lifiService.buildApprovalTx({
        tokenAddress: pendingApproval.tokenAddress,
        spenderAddress: pendingApproval.spenderAddress,
        amount,
        chainId: pendingApproval.chainId,
      });

      const approvalHash = await sendTransaction(approvalTx);
      
      if (!approvalHash) {
        throw new Error('Approval rejected');
      }

      // Clear pending approval
      setPendingApproval(null);

      // Now execute the actual swap
      const quote = currentTx ? {
        route: { steps: [{}] }, // Placeholder, we need to re-fetch or store the quote
        fromToken: { 
          address: currentTx.fromToken.address, 
          symbol: currentTx.fromToken.symbol,
          decimals: currentTx.fromToken.decimals,
          chainId: pendingApproval.chainId,
          name: currentTx.fromToken.symbol,
          logoURI: currentTx.fromToken.logoURI,
        },
        toToken: {
          address: '',
          symbol: currentTx.toToken.symbol,
          decimals: 18,
          chainId: 0,
          name: currentTx.toToken.symbol,
          logoURI: currentTx.toToken.logoURI,
        },
        fromAmount: currentTx.fromAmount,
        toAmount: currentTx.toAmount,
        toAmountMin: currentTx.toAmount,
        estimatedGasCostUSD: '0',
        estimatedDurationSeconds: currentTx.estimatedTime || 0,
        bridgeName: currentTx.bridgeName,
        steps: [],
      } as LiFiQuoteResult : null;

      // Return success - caller should refetch quote and continue
      return { approvalHash, status: 'APPROVED' };
    } catch (error: any) {
      console.error('Approval error:', error);
      updateTransaction(currentTx.id, { 
        status: 'failed', 
        error: error?.message || 'Approval failed' 
      });
      setPendingApproval(null);
      throw error;
    }
  }, [currentTx, pendingApproval, updateTransaction]);

  const resetCurrentTx = useCallback(() => {
    setCurrentTx(null);
    setPendingApproval(null);
  }, []);

  const cancelApproval = useCallback(() => {
    if (currentTx) {
      updateTransaction(currentTx.id, { status: 'failed', error: 'Approval cancelled' });
    }
    setPendingApproval(null);
  }, [currentTx, updateTransaction]);

  return {
    transactions,
    currentTx,
    pendingApproval,
    isSigningIntent,
    bridgeSettings,
    executeSwap,
    handleApproval,
    cancelApproval,
    resetCurrentTx,
  };
}
