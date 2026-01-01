import { useState, useEffect, useCallback } from 'react';
import { OkxToken } from '@/services/okxdex';

const STORAGE_KEY_PREFIX = 'dex-custom-tokens-';
const MAX_CUSTOM_TOKENS = 50;

export interface CustomTokenData extends OkxToken {
  addedAt: number;
  addedByAddress?: string;
}

interface CustomTokensData {
  tokens: CustomTokenData[];
}

export function useCustomTokens(chainIndex: string, walletAddress?: string) {
  const [customTokens, setCustomTokens] = useState<CustomTokenData[]>([]);
  
  // Storage key includes wallet address to tie tokens to specific wallet
  const storageKey = `${STORAGE_KEY_PREFIX}${chainIndex}${walletAddress ? `-${walletAddress.toLowerCase()}` : ''}`;

  // Load custom tokens from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: CustomTokensData = JSON.parse(stored);
        setCustomTokens(data.tokens || []);
      } else {
        setCustomTokens([]);
      }
    } catch {
      setCustomTokens([]);
    }
  }, [storageKey]);

  // Add a custom token
  const addCustomToken = useCallback((token: OkxToken) => {
    try {
      const stored = localStorage.getItem(storageKey);
      const data: CustomTokensData = stored ? JSON.parse(stored) : { tokens: [] };
      
      // Check if already exists
      const exists = data.tokens.some(
        t => t.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
      );
      
      if (exists) {
        return false; // Already saved
      }
      
      // Add new token
      const customToken: CustomTokenData = {
        ...token,
        addedAt: Date.now(),
        addedByAddress: walletAddress,
      };
      
      data.tokens = [customToken, ...data.tokens].slice(0, MAX_CUSTOM_TOKENS);
      localStorage.setItem(storageKey, JSON.stringify(data));
      setCustomTokens(data.tokens);
      return true;
    } catch (err) {
      console.error('Failed to save custom token:', err);
      return false;
    }
  }, [storageKey, walletAddress]);

  // Remove a custom token
  const removeCustomToken = useCallback((tokenAddress: string) => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      
      const data: CustomTokensData = JSON.parse(stored);
      data.tokens = data.tokens.filter(
        t => t.tokenContractAddress.toLowerCase() !== tokenAddress.toLowerCase()
      );
      
      localStorage.setItem(storageKey, JSON.stringify(data));
      setCustomTokens(data.tokens);
    } catch (err) {
      console.error('Failed to remove custom token:', err);
    }
  }, [storageKey]);

  // Check if a token is saved
  const isTokenSaved = useCallback((tokenAddress: string) => {
    return customTokens.some(
      t => t.tokenContractAddress.toLowerCase() === tokenAddress.toLowerCase()
    );
  }, [customTokens]);

  // Clear all custom tokens
  const clearCustomTokens = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setCustomTokens([]);
    } catch (err) {
      console.error('Failed to clear custom tokens:', err);
    }
  }, [storageKey]);

  return {
    customTokens,
    addCustomToken,
    removeCustomToken,
    isTokenSaved,
    clearCustomTokens,
  };
}
