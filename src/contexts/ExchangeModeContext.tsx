import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import { Chain, getPrimaryChain } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';

export type ExchangeMode = 'instant' | 'dex';
export type SwapMode = 'swap' | 'bridge';
export type ChainFilterValue = 'all' | 'all-evm' | string;

interface ExchangeModeContextType {
  mode: ExchangeMode;
  setMode: (mode: ExchangeMode) => void;
  swapMode: SwapMode;
  setSwapMode: (mode: SwapMode) => void;
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  isDexMode: boolean;
  isInstantMode: boolean;
  isTransitioning: boolean;
  // Global chain filter for data pages (Portfolio, Analytics, History)
  globalChainFilter: ChainFilterValue;
  setGlobalChainFilter: (filter: ChainFilterValue) => void;
  // Reset chain to default
  resetChainToDefault: () => void;
}

const ExchangeModeContext = createContext<ExchangeModeContextType | undefined>(undefined);

interface ExchangeModeProviderProps {
  children: ReactNode;
}

const TRANSITION_DURATION = 200;

export function ExchangeModeProvider({ children }: ExchangeModeProviderProps) {
  const { isConnected } = useMultiWallet();
  const [mode, setModeState] = useState<ExchangeMode>('instant');
  const [swapMode, setSwapMode] = useState<SwapMode>('swap');
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [globalChainFilter, setGlobalChainFilter] = useState<ChainFilterValue>('all');
  const transitionTimeoutRef = useRef<number | null>(null);
  const wasConnectedRef = useRef(isConnected);

  // Reset chain to default when wallet disconnects
  useEffect(() => {
    if (wasConnectedRef.current && !isConnected) {
      console.log('[ExchangeModeContext] Wallet disconnected, resetting chain to default');
      setSelectedChain(getPrimaryChain());
      setGlobalChainFilter('all');
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const setMode = useCallback((newMode: ExchangeMode) => {
    if (newMode === mode) return;
    
    // Clear any pending timeout
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    
    setIsTransitioning(true);
    
    // Small delay for exit animation
    transitionTimeoutRef.current = window.setTimeout(() => {
      setModeState(newMode);
      
      // End transition after enter animation
      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    }, TRANSITION_DURATION / 2);
  }, [mode]);

  // Sync global chain filter when selectedChain changes
  const handleSetSelectedChain = useCallback((chain: Chain) => {
    setSelectedChain(chain);
    setGlobalChainFilter(chain.chainIndex);
  }, []);

  // Reset chain to default (useful for manual reset)
  const resetChainToDefault = useCallback(() => {
    setSelectedChain(getPrimaryChain());
    setGlobalChainFilter('all');
  }, []);

  const value: ExchangeModeContextType = {
    mode,
    setMode,
    swapMode,
    setSwapMode,
    selectedChain,
    setSelectedChain: handleSetSelectedChain,
    isDexMode: mode === 'dex',
    isInstantMode: mode === 'instant',
    isTransitioning,
    globalChainFilter,
    setGlobalChainFilter,
    resetChainToDefault,
  };

  return (
    <ExchangeModeContext.Provider value={value}>
      {children}
    </ExchangeModeContext.Provider>
  );
}

export function useExchangeMode() {
  const context = useContext(ExchangeModeContext);
  if (context === undefined) {
    throw new Error('useExchangeMode must be used within an ExchangeModeProvider');
  }
  return context;
}
