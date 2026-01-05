import { useCallback, useEffect, useRef } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// Store the latest proof for use in signing operations
let storedTonProof: TonProofData | null = null;

export interface TonProofData {
  timestamp: number;
  domainLengthBytes: number;
  domainValue: string;
  signature: string;
  payload: string;
  stateInit: string;
  publicKey: string;
}

/**
 * Generate a random payload for TON proof verification
 */
export function generateTonProofPayload(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hook to manage TON Connect proof for secure operations
 * This captures the tonProof during wallet connection and stores it for later use
 */
export function useTonProof() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const payloadRef = useRef<string | null>(null);
  const proofRef = useRef<TonProofData | null>(null);

  // Request tonProof during connection
  const requestProofPayload = useCallback(() => {
    if (!tonConnectUI) return;
    
    try {
      // Generate a fresh payload for this session
      const payload = generateTonProofPayload();
      payloadRef.current = payload;
      
      // Set the connect request parameters to require tonProof
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: payload },
      });
    } catch (error) {
      console.error('[TonProof] Failed to set connect parameters:', error);
    }
  }, [tonConnectUI]);

  // Clear proof request
  const clearProofRequest = useCallback(() => {
    if (!tonConnectUI) return;
    
    try {
      tonConnectUI.setConnectRequestParameters(null);
      payloadRef.current = null;
    } catch (error) {
      console.error('[TonProof] Failed to clear connect parameters:', error);
    }
  }, [tonConnectUI]);

  // Listen for wallet connection and capture the proof
  useEffect(() => {
    if (!tonConnectUI) return;

    // Request proof payload on mount
    requestProofPayload();

    const unsubscribe = tonConnectUI.onStatusChange((currentWallet) => {
      if (currentWallet && currentWallet.connectItems?.tonProof) {
        const tonProof = currentWallet.connectItems.tonProof;
        
        if ('proof' in tonProof) {
          // Successfully captured the proof
          const proof = tonProof.proof;
          proofRef.current = {
            timestamp: proof.timestamp,
            domainLengthBytes: proof.domain.lengthBytes,
            domainValue: proof.domain.value,
            signature: proof.signature,
            payload: proof.payload,
            stateInit: currentWallet.account.walletStateInit || '',
            publicKey: currentWallet.account.publicKey || '',
          };
          storedTonProof = proofRef.current;
          console.log('[TonProof] Captured proof from wallet connection');
        } else if ('error' in tonProof) {
          console.error('[TonProof] Wallet returned error:', tonProof.error);
          proofRef.current = null;
          storedTonProof = null;
        }
      } else if (!currentWallet) {
        // Wallet disconnected
        proofRef.current = null;
        storedTonProof = null;
        // Re-request proof for next connection
        requestProofPayload();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, requestProofPayload]);

  // Get the current proof
  const getStoredProof = useCallback((): TonProofData | null => {
    return proofRef.current || storedTonProof;
  }, []);

  // Check if we have a valid proof
  const hasValidProof = useCallback((): boolean => {
    const proof = proofRef.current || storedTonProof;
    if (!proof) return false;
    
    // Check if proof is still valid (within 24 hours)
    const now = Math.floor(Date.now() / 1000);
    const proofAge = now - proof.timestamp;
    const maxAge = 24 * 60 * 60; // 24 hours
    
    return proofAge < maxAge;
  }, []);

  // Request a fresh proof by reconnecting
  const requestFreshProof = useCallback(async () => {
    if (!tonConnectUI || !wallet) return false;
    
    try {
      // Disconnect and reconnect to get a fresh proof
      await tonConnectUI.disconnect();
      requestProofPayload();
      // User will need to reconnect manually
      return true;
    } catch (error) {
      console.error('[TonProof] Failed to request fresh proof:', error);
      return false;
    }
  }, [tonConnectUI, wallet, requestProofPayload]);

  return {
    proof: proofRef.current,
    hasValidProof,
    getStoredProof,
    requestProofPayload,
    clearProofRequest,
    requestFreshProof,
  };
}

/**
 * Get the globally stored TON proof (for use in signing functions)
 */
export function getGlobalTonProof(): TonProofData | null {
  return storedTonProof;
}

/**
 * Set the global TON proof (used when reconnecting with cached proof)
 */
export function setGlobalTonProof(proof: TonProofData | null): void {
  storedTonProof = proof;
}
