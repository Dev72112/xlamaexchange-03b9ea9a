/**
 * useErrorTracking Hook
 * Provides error tracking capabilities to React components
 */
import { useCallback } from 'react';
import { trackError, trackApiError, trackWalletError, trackTxError } from '@/lib/errorTracking';
import { logSecurityEvent, logInvalidInput, logRateLimitHit } from '@/lib/securityLogger';

interface ErrorTrackingOptions {
  component?: string;
  walletAddress?: string;
  chainId?: string;
}

export function useErrorTracking(options: ErrorTrackingOptions = {}) {
  const { component, walletAddress, chainId } = options;
  
  const track = useCallback((error: Error | string, action?: string) => {
    trackError(error, {
      component,
      action,
      walletAddress,
      chainId,
    });
  }, [component, walletAddress, chainId]);
  
  const trackApi = useCallback((
    endpoint: string,
    status: number,
    message: string
  ) => {
    trackApiError(endpoint, status, message, {
      component,
      walletAddress,
      chainId,
    });
    
    // Log rate limits as security events
    if (status === 429) {
      logRateLimitHit(endpoint, walletAddress);
    }
  }, [component, walletAddress, chainId]);
  
  const trackWallet = useCallback((action: string, error: Error | string) => {
    trackWalletError(action, error, walletAddress);
  }, [walletAddress]);
  
  const trackTransaction = useCallback((
    txType: 'swap' | 'bridge' | 'approve',
    error: Error | string,
    txHash?: string
  ) => {
    trackTxError(txType, error, { chainId, walletAddress, txHash });
  }, [chainId, walletAddress]);
  
  const trackInvalidInput = useCallback((
    field: string,
    value: string,
    reason: string
  ) => {
    logInvalidInput(field, value, reason);
  }, []);
  
  const trackSecurityEvent = useCallback((
    type: Parameters<typeof logSecurityEvent>[0],
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    logSecurityEvent(type, message, {
      walletAddress,
      chainType: chainId,
      metadata,
    });
  }, [walletAddress, chainId]);
  
  return {
    track,
    trackApi,
    trackWallet,
    trackTransaction,
    trackInvalidInput,
    trackSecurityEvent,
  };
}
