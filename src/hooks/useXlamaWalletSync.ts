import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { xlamaApi, WalletInfo } from '@/services/xlamaApi';
import { toast } from 'sonner';

interface WalletStatusResponse {
  success: boolean;
  wallet: WalletInfo;
}

interface SyncResponse {
  success: boolean;
  synced: number;
  new_transactions: number;
}

export function useXlamaWalletSync() {
  const { activeAddress } = useMultiWallet();
  const { isXlamaEnabled } = useDataSource();
  const queryClient = useQueryClient();

  // Query wallet registration status
  const {
    data: walletStatus,
    isLoading: isStatusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['xlama-wallet-status', activeAddress],
    queryFn: () => xlamaApi.getWalletStatus(activeAddress!),
    enabled: !!activeAddress && isXlamaEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Mutation for registering wallet
  const registerMutation = useMutation({
    mutationFn: (wallet: string) => xlamaApi.registerWallet(wallet),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Wallet registered successfully');
        queryClient.invalidateQueries({ queryKey: ['xlama-wallet-status', activeAddress] });
        // Trigger initial sync after registration
        if (activeAddress) {
          syncMutation.mutate(activeAddress);
        }
      }
    },
    onError: (error: Error & { status?: number }) => {
      // Don't show error if wallet already exists - this is expected behavior
      // HTTP 409 Conflict means wallet already registered - treat as success
      const message = error.message?.toLowerCase() || '';
      const isConflict = message.includes('already exists') || 
                         message.includes('duplicate') || 
                         message.includes('conflict') ||
                         message.includes('409');
      
      if (isConflict) {
        // Wallet exists, refresh status and trigger sync silently
        queryClient.invalidateQueries({ queryKey: ['xlama-wallet-status', activeAddress] });
        // Still trigger sync since wallet is registered
        if (activeAddress) {
          syncMutation.mutate(activeAddress);
        }
        return;
      }
      toast.error(`Failed to register wallet: ${error.message}`);
    },
  });

  // Mutation for syncing transactions
  const syncMutation = useMutation({
    mutationFn: (wallet: string) => xlamaApi.syncTransactions(wallet, 'all'),
    onSuccess: (data) => {
      if (data.success) {
        const message = data.new_transactions > 0 
          ? `Synced ${data.new_transactions} new transactions`
          : 'Transactions up to date';
        toast.success(message);
        // Invalidate transaction queries to show new data
        queryClient.invalidateQueries({ queryKey: ['xlama-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['xlama-portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['xlama-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['xlama-wallet-status', activeAddress] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Auto-register wallet on first xLama enable (only if not already registered)
  useEffect(() => {
    if (
      isXlamaEnabled && 
      activeAddress && 
      !isStatusLoading &&
      !walletStatus?.wallet && // Not registered
      !registerMutation.isPending &&
      !registerMutation.isSuccess // Don't re-trigger if already tried
    ) {
      // Check if this is the first time enabling xLama for this wallet
      const registeredKey = `xlama-registered-${activeAddress}`;
      const hasAttempted = sessionStorage.getItem(registeredKey);
      
      if (!hasAttempted) {
        sessionStorage.setItem(registeredKey, 'true');
        registerMutation.mutate(activeAddress);
      }
    }
  }, [isXlamaEnabled, activeAddress, isStatusLoading, walletStatus]);

  // Public methods
  const syncTransactions = useCallback(() => {
    if (activeAddress) {
      syncMutation.mutate(activeAddress);
    }
  }, [activeAddress, syncMutation]);

  const registerWallet = useCallback(() => {
    if (activeAddress) {
      registerMutation.mutate(activeAddress);
    }
  }, [activeAddress, registerMutation]);

  return {
    isRegistered: !!walletStatus?.wallet,
    walletInfo: walletStatus?.wallet,
    isSyncing: syncMutation.isPending,
    isRegistering: registerMutation.isPending,
    lastSyncedAt: walletStatus?.wallet?.last_synced_at,
    syncError: syncMutation.error,
    registerError: registerMutation.error,
    syncTransactions,
    registerWallet,
  };
}

export default useXlamaWalletSync;
