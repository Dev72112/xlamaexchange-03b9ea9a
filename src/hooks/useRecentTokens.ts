import { useState, useEffect, useCallback } from 'react';
import { OkxToken } from '@/services/okxdex';

const STORAGE_KEY = 'dex-recent-tokens';
const MAX_RECENT_TOKENS = 5;

interface RecentTokensData {
  [chainIndex: string]: OkxToken[];
}

export function useRecentTokens(chainIndex: string) {
  const [recentTokens, setRecentTokens] = useState<OkxToken[]>([]);

  // Load recent tokens from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: RecentTokensData = JSON.parse(stored);
        setRecentTokens(data[chainIndex] || []);
      }
    } catch {
      setRecentTokens([]);
    }
  }, [chainIndex]);

  // Add a token to recent list
  const addRecentToken = useCallback((token: OkxToken) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const data: RecentTokensData = stored ? JSON.parse(stored) : {};
      
      const chainTokens = data[chainIndex] || [];
      
      // Remove if already exists
      const filtered = chainTokens.filter(
        t => t.tokenContractAddress.toLowerCase() !== token.tokenContractAddress.toLowerCase()
      );
      
      // Add to front
      const updated = [token, ...filtered].slice(0, MAX_RECENT_TOKENS);
      
      data[chainIndex] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setRecentTokens(updated);
    } catch (err) {
      console.error('Failed to save recent token:', err);
    }
  }, [chainIndex]);

  // Clear recent tokens for chain
  const clearRecentTokens = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const data: RecentTokensData = stored ? JSON.parse(stored) : {};
      delete data[chainIndex];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setRecentTokens([]);
    } catch (err) {
      console.error('Failed to clear recent tokens:', err);
    }
  }, [chainIndex]);

  return {
    recentTokens,
    addRecentToken,
    clearRecentTokens,
  };
}
